import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  AssistantController,
  AssistantControllerEvent,
} from '../../assistant/assistant-controller';
import type { SessionState } from '../../assistant/session-state';
import { AssistantPanel } from './AssistantPanel';

class FakeAssistantController {
  private state: SessionState;
  private listeners = new Set<(event: AssistantControllerEvent) => void>();

  constructor(initialState: SessionState = { status: 'connected' }) {
    this.state = initialState;
  }

  readonly connect = vi.fn(async () => {
    this.emit({ type: 'state', state: { status: 'connected' } });
  });
  readonly retry = vi.fn(async () => {
    this.emit({ type: 'state', state: { status: 'connected' } });
  });
  readonly disconnect = vi.fn(() => {
    this.emit({ type: 'state', state: { status: 'idle' } });
  });
  readonly startMicrophone = vi.fn(async () => {});
  readonly stopMicrophone = vi.fn();
  readonly setSpeakerMuted = vi.fn();
  readonly sendText = vi.fn();
  readonly confirmToolCall = vi.fn(async () => {});
  readonly requestRevision = vi.fn(() => true);
  readonly cancelToolCall = vi.fn();
  readonly dispose = vi.fn();
  getState(): SessionState {
    return this.state;
  }

  subscribe(listener: (event: AssistantControllerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: AssistantControllerEvent): void {
    if (event.type === 'state') this.state = event.state;
    for (const listener of this.listeners) listener(event);
  }
}

function renderPanel(
  controller = new FakeAssistantController(),
  options: {
    enabled?: boolean;
    readCurrentSection?: () => string;
    speechOutput?: {
      speak(text: string, rate: number): void;
      cancel(): void;
    };
  } = {},
) {
  render(
    <AssistantPanel
      controller={controller as unknown as AssistantController}
      enabled={options.enabled ?? true}
      onReadCurrentSection={
        options.readCurrentSection ?? (() => 'Visible Household section text')
      }
      speechOutput={options.speechOutput}
    />,
  );
  return controller;
}

describe('Phase 4 unified assistant panel', () => {
  it('renders one themed panel with shared text, voice, status, and read-only controls', () => {
    renderPanel();

    const panel = screen.getByRole('region', { name: /assistant panel/i });
    expect(panel).toHaveClass('assistant-panel');
    expect(
      screen.getByRole('textbox', { name: /message the assistant/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start listening/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /read current section/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/connected/i);
  });

  it('sends typed text through the same controller and records it in the timeline', () => {
    const controller = renderPanel();
    const composer = screen.getByRole('textbox', {
      name: /message the assistant/i,
    });

    fireEvent.change(composer, { target: { value: 'What is my progress?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controller.sendText).toHaveBeenCalledWith('What is my progress?');
    expect(screen.getByText('What is my progress?')).toBeInTheDocument();
  });

  it('stages an empty-chat suggestion without sending or executing it', () => {
    const controller = renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: 'Review missing items' }),
    );

    expect(
      screen.getByRole('textbox', { name: /message the assistant/i }),
    ).toHaveValue(
      'Review my application, identify any missing items or blockers, and show me what needs attention.',
    );
    expect(controller.sendText).not.toHaveBeenCalled();
  });

  it('keeps the composer editable before the first chat or voice choice without enabling send', () => {
    const controller = new FakeAssistantController({ status: 'idle' });
    render(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled
        initialMode="unselected"
      />,
    );

    const composer = screen.getByRole('textbox', {
      name: /message the assistant/i,
    });
    fireEvent.change(composer, { target: { value: 'Draft this question' } });

    expect(composer).toHaveValue('Draft this question');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(controller.sendText).not.toHaveBeenCalled();
  });

  it('exposes an independent speaker mute control for provider and browser speech', () => {
    const speechOutput = { speak: vi.fn(), cancel: vi.fn() };
    const controller = renderPanel(new FakeAssistantController(), {
      speechOutput,
    });

    fireEvent.click(
      screen.getByRole('checkbox', { name: /read assistant responses aloud/i }),
    );
    const muteButton = screen.getByRole('button', { name: /mute speaker/i });
    expect(muteButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(muteButton);

    expect(controller.setSpeakerMuted).toHaveBeenCalledWith(true);
    expect(speechOutput.cancel).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /turn speaker on/i }),
    ).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      controller.emit({ type: 'text', text: 'Muted response.' });
      controller.emit({ type: 'turn_complete' });
    });
    expect(speechOutput.speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /turn speaker on/i }));
    expect(controller.setSpeakerMuted).toHaveBeenLastCalledWith(false);
  });

  it('renders interim/final transcript and assistant text in the shared timeline', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'transcript',
        speaker: 'user',
        text: 'I need help',
        final: false,
      });
      controller.emit({
        type: 'transcript',
        speaker: 'user',
        text: 'I need help with income',
        final: true,
      });
      controller.emit({
        type: 'text',
        text: 'I can help you review that section.',
      });
    });

    expect(screen.getByText('I need help with income')).toBeInTheDocument();
    expect(
      screen.getByText('I can help you review that section.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('I need help')).not.toBeInTheDocument();
  });

  it('renders model transcripts and replaces an interim model transcript with its final text', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'transcript',
        speaker: 'model',
        text: 'I am checking',
        final: false,
      });
      controller.emit({
        type: 'transcript',
        speaker: 'model',
        text: 'I am checking your progress.',
        final: true,
      });
    });

    expect(
      screen.getByText('I am checking your progress.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('I am checking')).not.toBeInTheDocument();
  });

  it('announces visible transcript captions through the conversation log', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'transcript',
        speaker: 'model',
        text: 'Your application is ready to review.',
        final: true,
      });
    });

    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
  });

  it('requires explicit confirmation before the controller executes a mutation', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-income-1',
        toolName: 'add_income_source',
        message: 'Confirm adding Acme Dental income.',
        draft: {
          title: 'Add income source',
          fields: [
            { label: 'Member', value: 'Maya Carter' },
            { label: 'Employer or source', value: 'Acme Dental' },
            { label: 'Amount', value: '$1,250.00' },
            { label: 'Frequency', value: 'Monthly' },
          ],
        },
      });
    });

    expect(
      screen.getByText('Confirm adding Acme Dental income.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/confirm/i);
    expect(controller.confirmToolCall).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /I have prepared these details for review.*Member: Maya Carter.*Amount: \$1,250\.00.*Is everything correct, or do you need changes\?/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm and apply' }));
    expect(controller.confirmToolCall).toHaveBeenCalledWith('call-income-1');
  });

  it('commits the user transcript before adding a local confirmation fallback', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'transcript',
        speaker: 'user',
        text: 'Everything looks correct',
        final: true,
      });
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-order-1',
        toolName: 'add_income_source',
        message: 'A change is ready for confirmation.',
        draft: {
          title: 'Add income source',
          fields: [{ label: 'Employer or source', value: 'Acme Health' }],
        },
      });
      controller.emit({ type: 'turn_complete' });
    });

    const entries = Array.from(screen.getByRole('log').querySelectorAll('li'));
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringContaining('Everything looks correct'),
      expect.stringContaining('I have prepared these details for review.'),
    ]);
    expect(entries[0]).not.toHaveTextContent('Listening...');
  });

  it('does not duplicate a committed Gemini confirmation summary with the local fallback', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'transcript',
        speaker: 'user',
        text: 'Add these details',
        final: true,
      });
      controller.emit({
        type: 'text',
        text: 'I reviewed every field. The draft is ready for review.',
      });
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-summary-1',
        toolName: 'add_income_source',
        message: 'A change is ready for confirmation.',
        draft: {
          title: 'Add income source',
          fields: [{ label: 'Employer or source', value: 'Acme Health' }],
        },
      });
      controller.emit({ type: 'turn_complete' });
    });

    expect(
      screen.getAllByText(
        'I reviewed every field. The draft is ready for review.',
      ),
    ).toHaveLength(1);
    expect(
      screen.queryByText(/I have prepared these details for review/i),
    ).not.toBeInTheDocument();
    const entries = Array.from(screen.getByRole('log').querySelectorAll('li'));
    expect(entries[0]).toHaveTextContent('Add these details');
    expect(entries[1]).toHaveTextContent('I reviewed every field');
  });

  it('cancels a pending mutation without exposing raw arguments or submission controls', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-1',
        toolName: 'set_current_coverage',
        message: 'Confirm updating current coverage.',
        draft: {
          title: 'Set current coverage',
          fields: [{ label: 'Members', value: 'Maya Carter' }],
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(controller.cancelToolCall).toHaveBeenCalledWith('call-1');
    expect(screen.queryByRole('button', { name: /submit|attest/i })).toBeNull();
  });

  it('shows a visible correction prompt after a draft revision is accepted', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'revision_requested',
        callId: 'call-revision-1',
        toolName: 'add_income_source',
        correction: 'The user requested a correction.',
      });
    });

    expect(
      screen.getByText(
        'Tell me what needs to change. I will show the updated draft for review before anything is applied.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the inline draft visible when the controller rejects a late correction request', () => {
    const controller = renderPanel();
    controller.requestRevision.mockReturnValue(false);

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-late-correction',
        toolName: 'add_income_source',
        message: 'Confirm adding Acme Health income.',
        draft: {
          title: 'Add income source',
          fields: [{ label: 'Employer or source', value: 'Acme Health' }],
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Need correction' }));

    expect(
      screen.getByText('Confirm adding Acme Health income.'),
    ).toBeInTheDocument();
  });

  it('reads only the supplied visible section text without sending it as a model message', () => {
    const readCurrentSection = vi.fn(() => 'Only visible section copy');
    const controller = renderPanel(new FakeAssistantController(), {
      readCurrentSection,
    });

    fireEvent.click(
      screen.getByRole('button', { name: /read current section/i }),
    );

    expect(readCurrentSection).toHaveBeenCalledOnce();
    expect(controller.sendText).not.toHaveBeenCalled();
    expect(screen.getByText('Only visible section copy')).toBeInTheDocument();
  });

  it('clears local conversation history without disconnecting the shared controller', () => {
    const controller = renderPanel();
    const composer = screen.getByRole('textbox', {
      name: /message the assistant/i,
    });

    fireEvent.change(composer, {
      target: { value: 'Keep this local message' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText('Keep this local message')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /clear conversation/i }),
    );

    expect(
      screen.queryByText('Keep this local message'),
    ).not.toBeInTheDocument();
    expect(controller.disconnect).not.toHaveBeenCalled();
  });

  it('cancels spoken response and playback state when clearing conversation', () => {
    const speechOutput = { speak: vi.fn(), cancel: vi.fn() };
    const controller = renderPanel(new FakeAssistantController(), {
      speechOutput,
    });

    fireEvent.click(
      screen.getByRole('checkbox', { name: /read assistant responses aloud/i }),
    );
    act(() => {
      controller.emit({
        type: 'text',
        text: 'Review household details.',
      });
    });

    expect(
      screen.getByRole('button', { name: /repeat last response/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /clear conversation/i }),
    );

    expect(speechOutput.cancel).toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /repeat last response/i }),
    ).not.toBeInTheDocument();
  });

  it('preserves pending tool confirmation card when clearing conversation', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-income-99',
        toolName: 'add_income_source',
        message: 'Confirm adding Acme income.',
        draft: {
          title: 'Add income source',
          fields: [
            { label: 'Member', value: 'Maya Carter' },
            { label: 'Employer or source', value: 'Acme Health' },
            { label: 'Amount', value: '$1,250.00' },
            { label: 'Frequency', value: 'Monthly' },
          ],
        },
      });
    });

    expect(screen.getByText('Confirm adding Acme income.')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /clear conversation/i }),
    );

    expect(screen.getByText('Confirm adding Acme income.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm and apply' }),
    ).toBeInTheDocument();
  });

  it('uses optional speech output for responses, repeat, and slower playback', () => {
    const speechOutput = { speak: vi.fn(), cancel: vi.fn() };
    const controller = renderPanel(new FakeAssistantController(), {
      speechOutput,
    });

    fireEvent.click(
      screen.getByRole('checkbox', { name: /read assistant responses aloud/i }),
    );
    act(() => {
      controller.emit({
        type: 'text',
        text: 'Your application is 60% complete.',
      });
    });

    expect(speechOutput.speak).not.toHaveBeenCalled();
    act(() => controller.emit({ type: 'turn_complete' }));

    expect(speechOutput.speak).toHaveBeenCalledWith(
      'Your application is 60% complete.',
      1,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /repeat last response/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /speak slower/i }));
    expect(speechOutput.speak).toHaveBeenLastCalledWith(
      'Your application is 60% complete.',
      0.75,
    );
  });

  it('shows thinking while a text turn is in flight and speaking while audio is arriving', () => {
    const controller = renderPanel();

    fireEvent.change(
      screen.getByRole('textbox', { name: /message the assistant/i }),
      { target: { value: 'Check my progress' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('status')).toHaveTextContent(/thinking/i);

    act(() => {
      controller.emit({
        type: 'audio',
        data: 'pcm',
        mimeType: 'audio/pcm;rate=24000',
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent(/speaking/i);

    act(() => controller.emit({ type: 'turn_complete' }));
    expect(screen.getByRole('status')).toHaveTextContent(/connected/i);
  });

  it('shows applying while shared operation feedback is applying', () => {
    render(
      <AssistantPanel
        controller={
          new FakeAssistantController() as unknown as AssistantController
        }
        enabled
        activeOperation={{
          actionId: 'operation-1',
          source: 'webmcp',
          label: 'Add income source',
          section: 'income',
          startedAt: '2026-08-28T00:00:00.000Z',
          beforeRevision: 0,
          phase: 'applying',
          affectedEntityIds: [],
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/applying/i);
  });

  it('prioritizes pending confirmation over applying state', () => {
    const controller = new FakeAssistantController();
    render(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled
        activeOperation={{
          actionId: 'operation-1',
          source: 'webmcp',
          label: 'Add income source',
          section: 'income',
          startedAt: '2026-08-28T00:00:00.000Z',
          beforeRevision: 0,
          phase: 'applying',
          affectedEntityIds: [],
        }}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-income-1',
        toolName: 'add_income_source',
        message: 'Confirm adding Acme Dental income.',
        draft: {
          title: 'Add income source',
          fields: [
            { label: 'Member', value: 'Maya Carter' },
            { label: 'Employer or source', value: 'Acme Dental' },
            { label: 'Amount', value: '$1,250.00' },
            { label: 'Frequency', value: 'Monthly' },
          ],
        },
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent(/confirm/i);
  });

  it('does not duplicate the local success summary when Gemini continues the turn', () => {
    const controller = new FakeAssistantController();
    renderPanel(controller);

    act(() => {
      controller.emit({
        type: 'succeeded',
        callId: 'call-success',
        toolName: 'set_current_coverage',
        summary: 'Coverage was updated.',
      });
      controller.emit({
        type: 'text',
        text: 'Coverage was updated. What would you like to do next?',
      });
      controller.emit({ type: 'turn_complete' });
    });

    expect(
      screen.getAllByText(
        'Coverage was updated. What would you like to do next?',
      ),
    ).toHaveLength(1);
  });

  it('preserves error and unavailable status behavior when active operation is applying', () => {
    const controller = new FakeAssistantController();
    const { rerender } = render(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled={false}
        activeOperation={{
          actionId: 'operation-1',
          source: 'webmcp',
          label: 'Add income source',
          section: 'income',
          startedAt: '2026-08-28T00:00:00.000Z',
          beforeRevision: 0,
          phase: 'applying',
          affectedEntityIds: [],
        }}
      />,
    );

    expect(
      screen.getByText(
        /text-only mode|secure assistant session is unavailable/i,
      ),
    ).toBeInTheDocument();

    rerender(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled
        activeOperation={{
          actionId: 'operation-1',
          source: 'webmcp',
          label: 'Add income source',
          section: 'income',
          startedAt: '2026-08-28T00:00:00.000Z',
          beforeRevision: 0,
          phase: 'applying',
          affectedEntityIds: [],
        }}
      />,
    );

    act(() => {
      controller.emit({
        type: 'state',
        state: {
          status: 'error',
          message: 'Model disconnected',
          recoverable: true,
        },
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent(/assistant error/i);
  });

  it('disables text and listening controls whenever the controller is not connected', () => {
    const controller = renderPanel();

    act(() => {
      controller.emit({ type: 'state', state: { status: 'idle' } });
    });

    expect(
      screen.getByRole('textbox', { name: /message the assistant/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /start listening/i }),
    ).toBeDisabled();
  });

  it('keeps coexisting desktop and mobile switches independently addressable', () => {
    const first = new FakeAssistantController({ status: 'idle' });
    const second = new FakeAssistantController({ status: 'idle' });
    render(
      <>
        <AssistantPanel
          controller={first as unknown as AssistantController}
          enabled
        />
        <AssistantPanel
          controller={second as unknown as AssistantController}
          enabled
        />
      </>,
    );

    const switches = screen.getAllByRole('switch', {
      name: /live voice assistant/i,
    });
    switches.forEach((liveSwitch) => {
      expect(liveSwitch.tagName).toBe('BUTTON');
      expect(liveSwitch).toHaveAttribute('type', 'button');
      expect(liveSwitch).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('stops microphone capture when disabled but not when the presentation panel unmounts', async () => {
    const controller = new FakeAssistantController();
    const { rerender, unmount } = render(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
      await Promise.resolve();
    });
    rerender(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled={false}
      />,
    );
    expect(controller.stopMicrophone).toHaveBeenCalled();

    controller.stopMicrophone.mockClear();
    unmount();
    expect(controller.stopMicrophone).not.toHaveBeenCalled();
  });

  it('keeps a text-only fallback when the secure session is unavailable', () => {
    renderPanel(new FakeAssistantController(), { enabled: false });

    expect(
      screen.getByText(
        /text-only mode|secure assistant session is unavailable/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /message the assistant/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /start listening/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /read current section/i }),
    ).toBeEnabled();
  });
});
describe('Phase 5.3 local Live switch', () => {
  it('starts off and exposes an accessible Live switch', () => {
    renderPanel(new FakeAssistantController({ status: 'idle' }), {
      enabled: true,
    });

    const liveSwitch = screen.getByRole('switch', {
      name: /live voice assistant/i,
    });
    expect(liveSwitch).toBeInTheDocument();
    expect(liveSwitch).not.toBeChecked();
    expect(liveSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('connects only after the Live switch is turned on', async () => {
    const controller = new FakeAssistantController({ status: 'idle' });
    renderPanel(controller, { enabled: true });

    const liveSwitch = screen.getByRole('switch', {
      name: /live voice assistant/i,
    });
    expect(controller.connect).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(liveSwitch);
      await Promise.resolve();
    });

    expect(controller.connect).toHaveBeenCalledOnce();
    expect(liveSwitch).toBeChecked();
  });

  it('turning Live off disconnects and keeps text fallback usable', async () => {
    const controller = new FakeAssistantController({ status: 'idle' });
    renderPanel(controller, { enabled: true });

    const liveSwitch = screen.getByRole('switch', {
      name: /live voice assistant/i,
    });

    // Turn ON
    await act(async () => {
      fireEvent.click(liveSwitch);
      await Promise.resolve();
    });
    expect(controller.connect).toHaveBeenCalled();

    // Turn OFF
    await act(async () => {
      fireEvent.click(liveSwitch);
      await Promise.resolve();
    });

    expect(controller.disconnect).toHaveBeenCalled();
    expect(liveSwitch).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /read current section/i }),
    ).toBeEnabled();
  });

  it('leaves switch unchecked and disconnected when toggled off while connect is pending', async () => {
    let resolveConnect!: () => void;
    const connectPromise = new Promise<void>((resolve) => {
      resolveConnect = resolve;
    });

    const controller = new FakeAssistantController({ status: 'idle' });
    controller.connect.mockImplementationOnce(async () => {
      controller.emit({ type: 'state', state: { status: 'connecting' } });
      await connectPromise;
      if (controller.getState().status === 'connecting') {
        controller.emit({ type: 'state', state: { status: 'connected' } });
      }
    });

    renderPanel(controller, { enabled: true });
    const liveSwitch = screen.getByRole('switch', {
      name: /live voice assistant/i,
    });

    // Click ON (connect in flight)
    await act(async () => {
      fireEvent.click(liveSwitch);
    });
    expect(controller.connect).toHaveBeenCalledOnce();

    // Click OFF while connect is in flight
    await act(async () => {
      fireEvent.click(liveSwitch);
    });
    expect(controller.disconnect).toHaveBeenCalledOnce();
    expect(liveSwitch).not.toBeChecked();

    // Resolve the pending connect
    await act(async () => {
      resolveConnect();
      await Promise.resolve();
    });

    expect(liveSwitch).not.toBeChecked();
    expect(liveSwitch).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByRole('button', { name: /read current section/i }),
    ).toBeEnabled();
  });

  it('keeps two coexisting AssistantPanel instances connected when one turns Live on', async () => {
    const controller = new FakeAssistantController({ status: 'idle' });
    render(
      <>
        <AssistantPanel
          controller={controller as unknown as AssistantController}
          enabled
        />
        <AssistantPanel
          controller={controller as unknown as AssistantController}
          enabled
        />
      </>,
    );

    const switches = screen.getAllByRole('switch', {
      name: /live voice assistant/i,
    });
    expect(switches).toHaveLength(2);
    expect(switches[0]).not.toBeChecked();
    expect(switches[1]).not.toBeChecked();

    // Toggle first panel ON
    await act(async () => {
      fireEvent.click(switches[0]);
      await Promise.resolve();
    });

    // Both panels must reflect connected and not disconnect each other
    expect(controller.connect).toHaveBeenCalledOnce();
    expect(controller.disconnect).not.toHaveBeenCalled();
    expect(switches[0]).toBeChecked();
    expect(switches[1]).toBeChecked();

    // Toggle second panel OFF explicitly
    await act(async () => {
      fireEvent.click(switches[1]);
      await Promise.resolve();
    });

    expect(controller.disconnect).toHaveBeenCalledOnce();
    expect(switches[0]).not.toBeChecked();
    expect(switches[1]).not.toBeChecked();
  });

  it('disconnects an active controller when enabled becomes false', async () => {
    const controller = new FakeAssistantController({ status: 'connected' });
    const { rerender } = render(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled={true}
      />,
    );

    expect(controller.disconnect).not.toHaveBeenCalled();

    rerender(
      <AssistantPanel
        controller={controller as unknown as AssistantController}
        enabled={false}
      />,
    );

    expect(controller.disconnect).toHaveBeenCalled();
    expect(controller.stopMicrophone).toHaveBeenCalled();
  });
});
