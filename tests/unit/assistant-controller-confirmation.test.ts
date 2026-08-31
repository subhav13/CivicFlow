import { createAssistantController } from '../../src/assistant/assistant-controller';
import { classifyConfirmationReply } from '../../src/assistant/confirmation-reply';
import type {
  AssistantControllerDependencies,
  AssistantControllerEvent,
} from '../../src/assistant/assistant-controller';
import type {
  GeminiLiveClient,
  GeminiLiveEvent,
} from '../../src/assistant/gemini-live-client';

class FakeClient implements GeminiLiveClient {
  readonly connect = vi.fn(async () => {});
  readonly disconnect = vi.fn();
  readonly sendText = vi.fn();
  readonly sendAudio = vi.fn();
  readonly sendToolResponse = vi.fn(() => true);
  private readonly listeners = new Set<(event: GeminiLiveEvent) => void>();

  subscribe(listener: (event: GeminiLiveEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isConnected(): boolean {
    return true;
  }

  emit(event: GeminiLiveEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function createHarness() {
  const client = new FakeClient();
  const toolBridge = {
    listFunctions: vi.fn(async () => []),
    executeToolCall: vi.fn(async (call, options) =>
      options?.confirmed
        ? {
            kind: 'result' as const,
            callId: call.callId,
            result: JSON.stringify({
              ok: true,
              tool: call.name,
              actionId: `action-${call.callId}`,
              changed: true,
              message: 'The requested change was applied.',
              stateRevision: 1,
              visibleEffect: 'The requested change was applied.',
            }),
          }
        : {
            kind: 'confirmation_required' as const,
            callId: call.callId,
            toolName: call.name,
            message: 'Confirm this change.',
            draft: {
              title: 'Add income source',
              fields: [{ label: 'Employer or source', value: 'Acme Health' }],
            },
          },
    ),
  };
  const dependencies: AssistantControllerDependencies = {
    client,
    toolBridge,
  };
  return {
    client,
    toolBridge,
    controller: createAssistantController(dependencies),
  };
}

describe('Phase 4 controller confirmation boundary', () => {
  it('recognizes clear natural approval phrases', () => {
    for (const reply of [
      'Yes, this is correct',
      'Yes, add it',
      'Yes, go ahead',
      'Yeah, this is right',
      'Yep, this is good',
      'Yup, proceed',
      'do it',
      "That's correct, add it",
      'I confirm these details, add it',
      "I've confirmed the details, add it",
      'I have confirmed the information, please add it',
      'I confirm these details add it',
      'Everything looks correct',
      'Yeah, everything looks correct',
      'Everything is correct',
      'Everything is right',
      'All details are correct',
      'All information is correct',
      'Everything looks good',
      'Add these details',
      'Apply these details',
      'Save these details',
      'Add it',
      'I confirm these details. Add it.',
      'I confirm these details; Add it.',
    ]) {
      expect(classifyConfirmationReply(reply, { final: true })).toEqual({
        kind: 'affirmative',
      });
    }
  });

  it('does not let fragmented voice approval apply a pending mutation', async () => {
    const harness = createHarness();
    await harness.controller.connect();

    const call = {
      callId: 'call-fragmented-approval',
      name: 'add_income_source',
      argumentsJson: '{}',
    };
    harness.client.emit({ type: 'function_call', calls: [call] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    harness.client.emit({
      type: 'transcript',
      speaker: 'user',
      text: "I've confirmed",
      final: false,
    });
    harness.client.emit({
      type: 'transcript',
      speaker: 'user',
      text: 'the details, add it',
      final: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    await harness.controller.confirmToolCall(call.callId);
    expect(harness.toolBridge.executeToolCall).toHaveBeenLastCalledWith(call, {
      confirmed: true,
    });
  });

  it('clears an ignored affirmative before forwarding a later correction', async () => {
    const harness = createHarness();
    const events: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-clean-correction',
          name: 'add_income_source',
          argumentsJson: '{}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    harness.controller.sendText('I confirm these details, add it');
    harness.controller.sendText('Change employer to Acme Dental.');

    expect(events).toContainEqual({
      type: 'revision_requested',
      callId: 'call-clean-correction',
      toolName: 'add_income_source',
      correction: 'Change employer to Acme Dental.',
    });
  });

  it('requires an explicit controller confirmation after fragmented punctuated approval', async () => {
    const harness = createHarness();
    await harness.controller.connect();

    const call = {
      callId: 'call-fragmented-punctuated-approval',
      name: 'add_income_source',
      argumentsJson: '{"ownerName":"Maya Carter","amount":1250}',
    };
    harness.client.emit({ type: 'function_call', calls: [call] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    harness.client.emit({
      type: 'transcript',
      speaker: 'user',
      text: 'I confirm these details.',
      final: false,
    });
    harness.client.emit({
      type: 'transcript',
      speaker: 'user',
      text: 'Add it.',
      final: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    await harness.controller.confirmToolCall(call.callId);
    expect(harness.toolBridge.executeToolCall).toHaveBeenNthCalledWith(
      2,
      call,
      { confirmed: true },
    );
  });

  it('classifies only clear final affirmatives and checks correction language first', () => {
    expect(classifyConfirmationReply('yes', { final: true })).toEqual({
      kind: 'affirmative',
    });
    expect(
      classifyConfirmationReply('yes, but use Acme Dental', { final: true }),
    ).toEqual({
      kind: 'revision',
      text: 'yes, but use Acme Dental',
    });
    expect(classifyConfirmationReply('not correct', { final: true }).kind).toBe(
      'revision',
    );
    expect(
      classifyConfirmationReply("don't add it", { final: true }).kind,
    ).toBe('revision');
    expect(classifyConfirmationReply('no', { final: true }).kind).toBe(
      'revision',
    );
    expect(
      classifyConfirmationReply('sounds good?', { final: true }).kind,
    ).toBe('revision');
    expect(
      classifyConfirmationReply('Yes, is this correct?', { final: true }).kind,
    ).toBe('revision');
    expect(classifyConfirmationReply('yes', { final: false })).toEqual({
      kind: 'interim',
    });
  });

  it('holds a mutation until confirmToolCall explicitly approves it', async () => {
    const harness = createHarness();
    const events: GeminiLiveEvent[] = [];
    harness.controller.subscribe((event) => {
      if (event.type !== 'state' && event.type !== 'confirmation_required') {
        events.push(event);
      }
    });
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      ],
    });
    await Promise.resolve();

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledWith(
      { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      {},
    );
    expect(harness.client.sendToolResponse).not.toHaveBeenCalled();

    await harness.controller.confirmToolCall('call-1');

    expect(harness.toolBridge.executeToolCall).toHaveBeenLastCalledWith(
      { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
      { confirmed: true },
    );
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-1',
      name: 'add_income_source',
      response: {
        result: {
          ok: true,
          tool: 'add_income_source',
          actionId: 'action-call-1',
          changed: true,
          message: 'The requested change was applied.',
          stateRevision: 1,
          visibleEffect: 'The requested change was applied.',
        },
      },
    });
    expect(events).toContainEqual({
      type: 'applying',
      callId: 'call-1',
      toolName: 'add_income_source',
    });
    expect(events).toContainEqual({
      type: 'succeeded',
      callId: 'call-1',
      toolName: 'add_income_source',
      summary: 'The requested change was applied.',
    });
  });

  it('returns a cancellation response without executing the pending mutation', async () => {
    const harness = createHarness();
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-2', name: 'set_current_coverage', argumentsJson: '{}' },
      ],
    });
    await Promise.resolve();
    harness.toolBridge.executeToolCall.mockClear();

    harness.controller.cancelToolCall('call-2');

    expect(harness.toolBridge.executeToolCall).not.toHaveBeenCalled();
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: 'call-2',
      name: 'set_current_coverage',
      response: { error: 'Action cancelled by the user.' },
    });
  });

  it('pauses later function calls until the first pending confirmation is resolved', async () => {
    const harness = createHarness();
    const confirmationEvents: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => {
      if (event.type === 'confirmation_required')
        confirmationEvents.push(event);
    });
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        { callId: 'call-1', name: 'add_income_source', argumentsJson: '{}' },
        { callId: 'call-2', name: 'set_current_coverage', argumentsJson: '{}' },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    expect(confirmationEvents).toHaveLength(1);
    expect(confirmationEvents[0]).toMatchObject({ callId: 'call-1' });

    await harness.controller.confirmToolCall('call-1');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(3);
    expect(confirmationEvents).toHaveLength(2);
    expect(confirmationEvents[1]).toMatchObject({ callId: 'call-2' });
  });

  it('settles queued calls as superseded without executing them after a revision', async () => {
    const harness = createHarness();
    await harness.controller.connect();

    const firstCall = {
      callId: 'call-queued-first',
      name: 'add_income_source',
      argumentsJson: '{}',
    };
    const queuedCall = {
      callId: 'call-queued-second',
      name: 'set_current_coverage',
      argumentsJson: '{"status":"none"}',
    };
    harness.client.emit({
      type: 'function_call',
      calls: [firstCall, queuedCall],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    harness.controller.sendText('Change the employer before applying it.');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: queuedCall.callId,
      name: queuedCall.name,
      response: {
        error: {
          code: 'USER_REVISION_SUPERSEDED',
          message:
            'A queued action was not executed because the user requested a revision.',
        },
      },
    });
    expect(
      JSON.stringify(harness.client.sendToolResponse.mock.calls),
    ).not.toContain(queuedCall.argumentsJson);
  });

  it('keeps final voice and typed affirmatives pending until explicit confirmation', async () => {
    const harness = createHarness();
    const events: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await harness.controller.connect();

    const call = {
      callId: 'call-affirmative',
      name: 'add_income_source',
      argumentsJson: '{"ownerName":"Maya Carter","amount":1250}',
    };
    harness.client.emit({ type: 'function_call', calls: [call] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    harness.client.emit({
      type: 'transcript',
      speaker: 'user',
      text: 'yes',
      final: true,
    });
    await harness.controller.confirmToolCall('call-affirmative');

    expect(harness.toolBridge.executeToolCall).toHaveBeenLastCalledWith(call, {
      confirmed: true,
    });

    harness.client.emit({
      type: 'function_call',
      calls: [{ ...call, callId: 'call-typed-affirmative' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    harness.controller.sendText('I confirm these details, add it');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendText).not.toHaveBeenCalled();
    expect(harness.toolBridge.executeToolCall).toHaveBeenLastCalledWith(
      { ...call, callId: 'call-typed-affirmative' },
      {},
    );
    await harness.controller.confirmToolCall('call-typed-affirmative');
    expect(harness.toolBridge.executeToolCall).toHaveBeenLastCalledWith(
      { ...call, callId: 'call-typed-affirmative' },
      { confirmed: true },
    );
    expect(events.filter((event) => event.type === 'applying')).toHaveLength(2);
  });

  it('never confirms interim, negative, or corrective replies and safely revises the old call', async () => {
    const harness = createHarness();
    const events: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await harness.controller.connect();

    const call = {
      callId: 'call-revision',
      name: 'add_income_source',
      argumentsJson: '{"ownerName":"Maya Carter","amount":1250}',
    };
    harness.client.emit({ type: 'function_call', calls: [call] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    harness.client.emit({
      type: 'transcript',
      speaker: 'user',
      text: 'yes',
      final: false,
    });
    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);

    harness.controller.sendText('yes, but use Acme Dental');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendText).not.toHaveBeenCalled();
    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: call.callId,
      name: call.name,
      response: {
        error: {
          code: 'USER_REVISION_REQUESTED',
          message: 'The user requested a revision before execution.',
          correction: 'yes, but use Acme Dental',
        },
      },
    });
    expect(events).toContainEqual({
      type: 'revision_requested',
      callId: call.callId,
      toolName: call.name,
      correction: 'yes, but use Acme Dental',
    });

    await harness.controller.confirmToolCall(call.callId);
    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-revised',
          name: call.name,
          argumentsJson:
            '{"ownerName":"Maya Carter","employerName":"Acme Dental","amount":1250,"frequency":"monthly"}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(2);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'confirmation_required',
        callId: 'call-revised',
        draft: expect.objectContaining({ title: 'Add income source' }),
      }),
    );
  });

  it('supports a UI-only need-correction action without sending text to Gemini', async () => {
    const harness = createHarness();
    const events: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await harness.controller.connect();

    const call = {
      callId: 'call-ui-revision',
      name: 'add_income_source',
      argumentsJson: '{}',
    };
    harness.client.emit({ type: 'function_call', calls: [call] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.controller.requestRevision(call.callId)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.client.sendText).not.toHaveBeenCalled();
    expect(harness.toolBridge.executeToolCall).toHaveBeenCalledTimes(1);
    expect(harness.client.sendToolResponse).toHaveBeenCalledWith({
      callId: call.callId,
      name: call.name,
      response: {
        error: {
          code: 'USER_REVISION_REQUESTED',
          message: 'The user requested a revision before execution.',
          correction: 'The user requested a correction.',
        },
      },
    });
    expect(events).toContainEqual({
      type: 'revision_requested',
      callId: call.callId,
      toolName: call.name,
      correction: 'The user requested a correction.',
    });
    expect(harness.controller.requestRevision(call.callId)).toBe(false);
  });

  it('emits applying and terminal lifecycle events from the decoded WebMCP result', async () => {
    const harness = createHarness();
    const events: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => events.push(event));
    harness.toolBridge.executeToolCall.mockImplementation(
      async (call, options) =>
        options?.confirmed
          ? {
              kind: 'result' as const,
              callId: call.callId,
              result: JSON.stringify({
                ok: true,
                tool: call.name,
                actionId: 'action-1',
                changed: true,
                message: 'Application updated successfully.',
                visibleEffect: 'Added Acme Health income.',
                stateRevision: 1,
              }),
            }
          : {
              kind: 'confirmation_required' as const,
              callId: call.callId,
              toolName: call.name,
              message: 'Confirm this change.',
              draft: {
                title: 'Add income source',
                fields: [{ label: 'Employer or source', value: 'Acme Health' }],
              },
            },
    );
    await harness.controller.connect();
    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-lifecycle',
          name: 'add_income_source',
          argumentsJson: '{}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.controller.confirmToolCall('call-lifecycle');

    expect(events.map((event) => event.type)).toEqual([
      'state',
      'state',
      'confirmation_required',
      'applying',
      'succeeded',
    ]);
    expect(events).toContainEqual({
      type: 'succeeded',
      callId: 'call-lifecycle',
      toolName: 'add_income_source',
      summary: 'Added Acme Health income.',
    });
  });

  it('keeps a successful local mutation terminal when the tool response transport throws', async () => {
    const harness = createHarness();
    const events: AssistantControllerEvent[] = [];
    harness.controller.subscribe((event) => events.push(event));
    await harness.controller.connect();

    harness.client.emit({
      type: 'function_call',
      calls: [
        {
          callId: 'call-transport',
          name: 'add_income_source',
          argumentsJson: '{}',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    harness.client.sendToolResponse.mockImplementation(() => {
      throw new Error('socket is closing');
    });

    await expect(
      harness.controller.confirmToolCall('call-transport'),
    ).resolves.toBeUndefined();

    expect(events).toContainEqual({
      type: 'succeeded',
      callId: 'call-transport',
      toolName: 'add_income_source',
      summary: 'The requested change was applied.',
    });
    expect(
      events.some(
        (event) => event.type === 'failed' && event.callId === 'call-transport',
      ),
    ).toBe(false);
    expect(events).toContainEqual({
      type: 'delivery_failed',
      callId: 'call-transport',
      toolName: 'add_income_source',
      message: expect.stringMatching(/applied locally/i),
    });
  });

  it('does not treat an uncorrelated or invalid success envelope as success', async () => {
    const invalidEnvelopes = [
      {
        tool: 'set_current_coverage',
        actionId: 'action-1',
        stateRevision: 1,
      },
      {
        tool: 'add_income_source',
        actionId: '',
        stateRevision: 1,
      },
      {
        tool: 'add_income_source',
        actionId: 'action-1',
        stateRevision: -1,
      },
    ];

    for (const [index, envelope] of invalidEnvelopes.entries()) {
      const harness = createHarness();
      const events: AssistantControllerEvent[] = [];
      harness.controller.subscribe((event) => events.push(event));
      harness.toolBridge.executeToolCall.mockImplementation(
        async (call, options) =>
          options?.confirmed
            ? {
                kind: 'result' as const,
                callId: call.callId,
                result: JSON.stringify({
                  ok: true,
                  ...envelope,
                  changed: true,
                  message: 'The requested change was applied.',
                }),
              }
            : {
                kind: 'confirmation_required' as const,
                callId: call.callId,
                toolName: call.name,
                message: 'Confirm this change.',
                draft: {
                  title: 'Add income source',
                  fields: [
                    { label: 'Employer or source', value: 'Acme Health' },
                  ],
                },
              },
      );
      await harness.controller.connect();
      const callId = `call-invalid-envelope-${index}`;
      harness.client.emit({
        type: 'function_call',
        calls: [{ callId, name: 'add_income_source', argumentsJson: '{}' }],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      await harness.controller.confirmToolCall(callId);

      expect(
        events.some(
          (event) => event.type === 'succeeded' && event.callId === callId,
        ),
      ).toBe(false);
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'failed', callId }),
      );
    }
  });
});
