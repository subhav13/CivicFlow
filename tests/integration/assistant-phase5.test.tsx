import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  createAssistantController,
  type AssistantController,
  type AssistantControllerEvent,
} from '../../src/assistant/assistant-controller';
import type {
  GeminiLiveClient,
  GeminiLiveEvent,
  LiveToolResponse,
} from '../../src/assistant/gemini-live-client';
import { createGeminiToolBridge } from '../../src/assistant/gemini-tool-bridge';
import { createCurrentToolSurface } from '../../src/assistant/current-tool-surface';
import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../../src/application/store';
import { AgentCompanion } from '../../src/ui/agent-companion/AgentCompanion';
import { CoverageSection } from '../../src/ui/sections/CoverageSection';
import { OperationStatus } from '../../src/ui/feedback/OperationStatus';
import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';
import { WebMcpRegistryManager } from '../../src/webmcp/registry-manager';

class FakeGeminiClient implements GeminiLiveClient {
  private connected = false;
  private readonly listeners = new Set<(event: GeminiLiveEvent) => void>();

  readonly connect = vi.fn(async () => {
    this.connected = true;
  });
  readonly disconnect = vi.fn(() => {
    this.connected = false;
  });
  readonly sendText = vi.fn();
  readonly sendAudio = vi.fn();
  readonly sendToolResponse = vi.fn(() => true);

  subscribe(listener: (event: GeminiLiveEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isConnected(): boolean {
    return this.connected;
  }

  emit(event: GeminiLiveEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

interface AssistantHarness {
  client: FakeGeminiClient;
  controller: AssistantController;
  port: FakeModelContextPort;
  registry: WebMcpRegistryManager;
  store: CivicFlowStore;
}

async function createHarness(): Promise<AssistantHarness> {
  let id = 0;
  const store = createCivicFlowStore({
    storage: null,
    sessionStorage: globalThis.sessionStorage,
    now: () => new Date('2026-08-29T10:00:00.000Z'),
    newId: () => `integration-id-${++id}`,
  });
  const port = new FakeModelContextPort();
  const registry = new WebMcpRegistryManager({ port, store });
  await registry.start();
  await registry.waitForSync();

  const client = new FakeGeminiClient();
  const controller = createAssistantController({
    client,
    toolBridge: createGeminiToolBridge(createCurrentToolSurface(port)),
  });
  await controller.connect();

  return { client, controller, port, registry, store };
}

function closeHarness(harness: AssistantHarness): void {
  harness.controller.dispose();
  harness.registry.dispose();
}

function getToolResponse(
  client: FakeGeminiClient,
  callId: string,
): LiveToolResponse | undefined {
  return client.sendToolResponse.mock.calls
    .map(([response]) => response)
    .find((response) => response.callId === callId);
}

function getResult(
  response: LiveToolResponse | undefined,
): Record<string, unknown> {
  const responseBody = response?.response;
  const payload =
    responseBody?.ok === true || responseBody?.ok === false
      ? responseBody
      : (responseBody?.result ?? responseBody?.error);
  if (typeof payload === 'string') {
    return JSON.parse(payload) as Record<string, unknown>;
  }
  expect(payload).toBeDefined();
  expect(typeof payload).toBe('object');
  return payload as Record<string, unknown>;
}

function VisibleAssistant({ harness }: { harness: AssistantHarness }) {
  const snapshot = useSyncExternalStore(
    harness.store.subscribe,
    harness.store.getState,
    harness.store.getState,
  );

  return (
    <>
      <OperationStatus
        operation={snapshot.ui.activeOperation}
        autoDismissMs={0}
      />
      <AgentCompanion
        capabilities={snapshot.ui.capabilities}
        activity={snapshot.ui.activity}
        assistantController={harness.controller}
        assistantEnabled
        activeOperation={snapshot.ui.activeOperation}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />
    </>
  );
}

function VisibleMountedCoverage({ harness }: { harness: AssistantHarness }) {
  const snapshot = useSyncExternalStore(
    harness.store.subscribe,
    harness.store.getState,
    harness.store.getState,
  );

  return (
    <>
      <CoverageSection
        application={snapshot.application}
        disabled={false}
        dispatch={harness.store.dispatch}
        onNavigate={() => {}}
      />
      <AgentCompanion
        capabilities={snapshot.ui.capabilities}
        activity={snapshot.ui.activity}
        assistantController={harness.controller}
        assistantEnabled
        activeOperation={snapshot.ui.activeOperation}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />
    </>
  );
}

describe('Phase 5 local assistant integration matrix', () => {
  it('proposes a complete household member, executes once only after UI confirmation, and returns structured success', async () => {
    const harness = await createHarness();
    render(<VisibleAssistant harness={harness} />);
    const executeTool = vi.spyOn(harness.port, 'executeTool');

    try {
      const beforeRevision = harness.store.getState().application.revision;
      const call = {
        callId: 'household-voice-1',
        name: 'add_household_member',
        argumentsJson: JSON.stringify({
          firstName: 'Emma',
          lastName: 'Carter',
          ageYears: 26,
          relationship: 'spouse',
          applyingForCoverage: true,
        }),
      } as const;

      harness.client.emit({ type: 'function_call', calls: [call] });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Save change' }),
        ).toBeInTheDocument(),
      );
      expect(executeTool).not.toHaveBeenCalled();
      expect(harness.store.getState().application.revision).toBe(
        beforeRevision,
      );
      expect(
        harness.store.getState().application.householdMembers,
      ).toHaveLength(0);

      screen.getByRole('button', { name: 'Save change' }).click();
      await waitFor(() => expect(executeTool).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(
          harness.store.getState().application.householdMembers,
        ).toHaveLength(1),
      );

      expect(executeTool).toHaveBeenCalledTimes(1);
      expect(harness.store.getState().application.revision).toBe(
        beforeRevision + 1,
      );
      expect(
        harness.store.getState().application.householdMembers[0],
      ).toMatchObject({
        firstName: 'Emma',
        lastName: 'Carter',
        ageYears: 26,
        relationship: 'spouse',
        applyingForCoverage: true,
      });

      await waitFor(() =>
        expect(getToolResponse(harness.client, call.callId)).toBeDefined(),
      );
      expect(getToolResponse(harness.client, call.callId)).toMatchObject({
        callId: call.callId,
        name: call.name,
        response: {
          result: expect.objectContaining({
            ok: true,
            tool: 'add_household_member',
            changed: true,
          }),
        },
      });
      expect(
        getToolResponse(harness.client, call.callId)?.response.error,
      ).toBeUndefined();
    } finally {
      executeTool.mockRestore();
      closeHarness(harness);
    }
  });

  it('uses one current WebMCP surface for typed and voice-shaped turns with visible feedback', async () => {
    const harness = await createHarness();
    render(<VisibleAssistant harness={harness} />);

    try {
      const beforeRevision = harness.store.getState().application.revision;
      const composer = screen.getByRole('textbox', {
        name: /message the assistant/i,
      });
      await waitFor(() => expect(composer).toBeEnabled());

      fireEvent.change(composer, {
        target: { value: 'Please add my monthly income.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
      expect(harness.client.sendText).toHaveBeenCalledWith(
        'Please add my monthly income.',
      );

      harness.client.emit({
        type: 'transcript',
        speaker: 'user',
        text: 'Add my monthly income from Acme Health.',
        final: true,
      });
      harness.client.emit({
        type: 'function_call',
        calls: [
          {
            callId: 'income-voice-1',
            name: 'add_income_source',
            argumentsJson: JSON.stringify({
              ownerName: 'Maya Carter',
              employerName: 'Acme Health',
              amount: 1250,
              frequency: 'monthly',
            }),
          },
        ],
      });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Save change' }),
        ).toBeInTheDocument(),
      );
      expect(harness.store.getState().application.revision).toBe(
        beforeRevision,
      );
      expect(harness.store.getState().application.incomeSources).toHaveLength(
        0,
      );

      screen.getByRole('button', { name: 'Save change' }).click();
      await waitFor(() =>
        expect(screen.getByTestId('operation-status')).toHaveAttribute(
          'data-phase',
          'succeeded',
        ),
      );

      const firstResult = getResult(
        getToolResponse(harness.client, 'income-voice-1'),
      );
      expect(firstResult).toMatchObject({
        ok: true,
        tool: 'add_income_source',
        changed: true,
      });
      const firstActivity = harness.store
        .getState()
        .ui.activity.find((entry) => entry.id === firstResult.actionId);
      expect(firstActivity).toMatchObject({
        id: firstResult.actionId,
        source: 'webmcp',
        status: 'succeeded',
        summary: 'Added income from Acme Health',
      });
      expect(screen.getByTestId('assistant-latest-summary')).toHaveTextContent(
        'Added income from Acme Health',
      );
      expect(harness.store.getState().ui.activeOperation).toMatchObject({
        actionId: firstResult.actionId,
        phase: 'succeeded',
        source: 'webmcp',
      });

      await harness.registry.waitForSync();
      expect(
        (await harness.port.getTools()).some(
          (tool) => tool.name === 'update_income_source',
        ),
      ).toBe(true);

      fireEvent.change(composer, {
        target: { value: 'Actually rename it to Acme Dental.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));
      expect(harness.client.sendText).toHaveBeenLastCalledWith(
        'Actually rename it to Acme Dental.',
      );
      harness.client.emit({
        type: 'function_call',
        calls: [
          {
            callId: 'income-text-correction-1',
            name: 'update_income_source',
            argumentsJson: JSON.stringify({ employerName: 'Acme Dental' }),
          },
        ],
      });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Save change' }),
        ).toBeInTheDocument(),
      );
      screen.getByRole('button', { name: 'Save change' }).click();
      await waitFor(() =>
        expect(
          harness.store.getState().application.incomeSources[0],
        ).toMatchObject({ employerName: 'Acme Dental' }),
      );
      expect(harness.store.getState().ui.activity[0]).toMatchObject({
        source: 'webmcp',
        status: 'succeeded',
        summary: 'Updated income from Acme Dental',
      });
    } finally {
      closeHarness(harness);
    }
  });

  it('keeps unknown-person, stale-context, and submit requests safe without revision or raw retention', async () => {
    const harness = await createHarness();
    try {
      const events: AssistantControllerEvent[] = [];
      harness.controller.subscribe((event) => events.push(event));
      const beforeRevision = harness.store.getState().application.revision;

      harness.client.emit({
        type: 'transcript',
        speaker: 'user',
        text: 'Sensitive raw transcript must not be retained.',
        final: true,
      });
      harness.client.emit({
        type: 'audio',
        data: 'raw-audio-payload-that-must-not-be-retained',
        mimeType: 'audio/pcm',
      });
      harness.client.emit({
        type: 'function_call',
        calls: [
          {
            callId: 'income-unknown-person-1',
            name: 'add_income_source',
            argumentsJson: JSON.stringify({
              ownerName: 'Unknown Person',
              employerName: 'Private Employer',
              amount: 900,
              frequency: 'monthly',
            }),
          },
        ],
      });
      await waitFor(() =>
        expect(events).toContainEqual(
          expect.objectContaining({
            type: 'confirmation_required',
            callId: 'income-unknown-person-1',
          }),
        ),
      );
      await harness.controller.confirmToolCall('income-unknown-person-1');
      await waitFor(() =>
        expect(
          getToolResponse(harness.client, 'income-unknown-person-1'),
        ).toBeDefined(),
      );

      const failureResponse = getToolResponse(
        harness.client,
        'income-unknown-person-1',
      );
      expect(failureResponse?.response).toMatchObject({
        ok: false,
        tool: 'add_income_source',
        error: {
          code: 'PERSON_NOT_FOUND',
        },
      });
      const failure = getResult(failureResponse);
      expect(failure).toMatchObject({
        ok: false,
        tool: 'add_income_source',
        stateRevision: beforeRevision,
        error: {
          code: 'PERSON_NOT_FOUND',
          recoverable: true,
        },
      });
      expect(harness.store.getState().application.revision).toBe(
        beforeRevision,
      );
      expect(harness.store.getState().application.incomeSources).toHaveLength(
        0,
      );
      expect(harness.store.getState().ui.activeOperation).toMatchObject({
        phase: 'failed',
        source: 'webmcp',
        recovery: expect.objectContaining({ section: 'household' }),
      });
      expect(harness.store.getState().ui.activity[0]).toMatchObject({
        status: 'failed',
        beforeRevision,
        afterRevision: beforeRevision,
      });

      const retained = globalThis.sessionStorage.getItem(
        'civicflow.activity.v1',
      );
      expect(retained).not.toContain('Sensitive raw transcript');
      expect(retained).not.toContain('raw-audio-payload');
      expect(retained).not.toContain('ownerName');
      expect(retained).not.toContain('Private Employer');
      expect(retained).not.toContain('incomeSources');

      const functions = await createGeminiToolBridge(
        createCurrentToolSurface(harness.port),
      ).listFunctions();
      expect(functions.map((tool) => tool.name)).not.toEqual(
        expect.arrayContaining([
          'submit_application',
          'submit_demo',
          'attest_application',
        ]),
      );

      for (const [callId, name] of [
        ['submit-1', 'submit_application'],
        ['attest-1', 'attest_application'],
      ] as const) {
        harness.client.emit({
          type: 'function_call',
          calls: [{ callId, name, argumentsJson: '{}' }],
        });
      }
      await waitFor(() =>
        expect(getToolResponse(harness.client, 'submit-1')).toBeDefined(),
      );
      expect(getToolResponse(harness.client, 'submit-1')).toMatchObject({
        response: {
          error: expect.stringContaining('not currently registered'),
        },
      });
      expect(getToolResponse(harness.client, 'attest-1')).toMatchObject({
        response: {
          error: expect.stringContaining('not currently registered'),
        },
      });
      expect(harness.store.getState().application.revision).toBe(
        beforeRevision,
      );

      harness.store.selectRecord({ kind: 'household', id: 'stale-person' });
      await harness.registry.waitForSync();
      expect(
        (await harness.port.getTools()).some(
          (tool) => tool.name === 'update_household_member',
        ),
      ).toBe(true);
      harness.store.clearSelection();
      await harness.registry.waitForSync();
      harness.client.emit({
        type: 'function_call',
        calls: [
          {
            callId: 'stale-context-1',
            name: 'update_household_member',
            argumentsJson: JSON.stringify({ firstName: 'Should Not Apply' }),
          },
        ],
      });
      await waitFor(() =>
        expect(
          getToolResponse(harness.client, 'stale-context-1'),
        ).toBeDefined(),
      );
      expect(getToolResponse(harness.client, 'stale-context-1')).toMatchObject({
        response: {
          error: expect.stringContaining('not currently registered'),
        },
      });
      expect(harness.store.getState().application.revision).toBe(
        beforeRevision,
      );
    } finally {
      closeHarness(harness);
    }
  });

  it('revises a complete add-income proposal through the same pending call and confirms only the replacement', async () => {
    const harness = await createHarness();
    const executeTool = vi.spyOn(harness.port, 'executeTool');
    render(<VisibleAssistant harness={harness} />);

    try {
      const originalCall = {
        callId: 'income-proposal-original',
        name: 'add_income_source' as const,
        argumentsJson: JSON.stringify({
          ownerName: 'Maya Carter',
          employerName: 'Acme Health',
          amount: 1250,
          frequency: 'monthly',
        }),
      };
      harness.client.emit({
        type: 'function_call',
        calls: [originalCall],
      });
      await waitFor(() =>
        expect(screen.getByTestId('tool-confirmation-modal')).toBeVisible(),
      );

      fireEvent.click(screen.getByRole('button', { name: 'Need correction' }));

      expect(harness.client.sendText).not.toHaveBeenCalled();
      expect(executeTool).not.toHaveBeenCalled();
      expect(
        getToolResponse(harness.client, originalCall.callId),
      ).toMatchObject({
        response: {
          error: {
            code: 'USER_REVISION_REQUESTED',
            correction: expect.stringContaining('correction'),
          },
        },
      });

      const revisedCall = {
        ...originalCall,
        callId: 'income-proposal-revised',
        argumentsJson: JSON.stringify({
          ownerName: 'Maya Carter',
          employerName: 'Acme Dental',
          amount: 1250,
          frequency: 'monthly',
        }),
      };
      harness.client.emit({ type: 'function_call', calls: [revisedCall] });
      await waitFor(() =>
        expect(screen.getByTestId('tool-confirmation-modal')).toBeVisible(),
      );
      expect(screen.getByTestId('tool-confirmation-modal')).toHaveTextContent(
        'Acme Dental',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Save change' }));
      await waitFor(() =>
        expect(harness.store.getState().application.incomeSources).toHaveLength(
          1,
        ),
      );
      expect(
        harness.store.getState().application.incomeSources[0],
      ).toMatchObject({ employerName: 'Acme Dental' });
      expect(executeTool).toHaveBeenCalledTimes(1);
      expect(
        getToolResponse(harness.client, originalCall.callId),
      ).toMatchObject({
        response: {
          error: {
            code: 'USER_REVISION_REQUESTED',
          },
        },
      });
      expect(getToolResponse(harness.client, revisedCall.callId)).toMatchObject(
        {
          response: {
            result: expect.objectContaining({
              ok: true,
              tool: 'add_income_source',
            }),
          },
        },
      );
    } finally {
      executeTool.mockRestore();
      closeHarness(harness);
    }
  });

  it('updates an already-mounted CoverageSection from a confirmed external coverage mutation', async () => {
    const harness = await createHarness();
    render(<VisibleMountedCoverage harness={harness} />);

    try {
      fireEvent.change(
        screen.getByLabelText('Coverage status for Maya Carter'),
        { target: { value: 'covered' } },
      );
      fireEvent.change(screen.getByLabelText('Provider for Maya Carter'), {
        target: { value: 'Unsaved local draft' },
      });

      const call = {
        callId: 'coverage-mounted-1',
        name: 'set_current_coverage' as const,
        argumentsJson: JSON.stringify({
          memberNames: ['Maya Carter'],
          status: 'none',
        }),
      };
      harness.client.emit({ type: 'function_call', calls: [call] });
      await waitFor(() =>
        expect(screen.getByTestId('tool-confirmation-modal')).toBeVisible(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Save change' }));

      await waitFor(() =>
        expect(
          screen.getByLabelText('Coverage status for Maya Carter'),
        ).toHaveValue('none'),
      );
      expect(
        screen.queryByLabelText('Provider for Maya Carter'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('1 people have a recorded coverage status.'),
      ).toBeInTheDocument();
    } finally {
      closeHarness(harness);
    }
  });
});
