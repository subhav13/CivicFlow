import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgentCompanion } from './AgentCompanion';
import type { ActivityEntry, CapabilitySummary } from '../../application/store';
import type {
  AssistantController,
  AssistantControllerEvent,
} from '../../assistant/assistant-controller';
import type { SessionState } from '../../assistant/session-state';

describe('AgentCompanion Component (Packet 2.3)', () => {
  const sampleCapabilities: CapabilitySummary[] = [
    {
      id: 'get_application_progress',
      summary: 'Get application progress',
    },
    {
      id: 'add_household_member',
      summary: 'Add a new household member',
    },
  ];

  const sampleActivity: ActivityEntry[] = [
    {
      id: 'act-1',
      summary: 'Added household member Emma Carter',
      source: 'webmcp',
      status: 'succeeded',
      section: 'household',
      occurredAt: '2026-08-27T12:00:00.000Z',
      beforeRevision: 0,
      afterRevision: 1,
    },
    {
      id: 'act-2',
      summary: 'Navigated to Income section',
      source: 'human',
      status: 'succeeded',
      section: 'income',
      occurredAt: '2026-08-27T12:01:00.000Z',
      beforeRevision: 1,
      afterRevision: 1,
    },
  ];

  function makeController(
    initialState: SessionState = { status: 'connected' },
  ) {
    const listeners = new Set<(event: AssistantControllerEvent) => void>();
    let subscribeCount = 0;
    let state: SessionState = initialState;
    const controller = {
      connect: vi.fn(async () => {
        state = { status: 'connected' };
      }),
      retry: vi.fn(async () => {}),
      disconnect: vi.fn(),
      startMicrophone: vi.fn(async () => {}),
      stopMicrophone: vi.fn(),
      sendText: vi.fn(),
      confirmToolCall: vi.fn(async () => {}),
      requestRevision: vi.fn(() => true),
      cancelToolCall: vi.fn(),
      dispose: vi.fn(),
      getState: () => state,
      subscribe: (listener: (event: AssistantControllerEvent) => void) => {
        subscribeCount += 1;
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      get subscribeCount() {
        return subscribeCount;
      },
      emit: (event: AssistantControllerEvent) => {
        if (event.type === 'state') state = event.state;
        for (const listener of listeners) listener(event);
      },
    };
    return controller;
  }

  it('keeps one long-lived panel and one controller subscription across presentation toggles', () => {
    const controller = makeController();
    const { rerender } = render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(controller.subscribeCount).toBe(1);
    expect(document.querySelectorAll('.assistant-panel')).toHaveLength(1);

    act(() => {
      controller.emit({
        type: 'text',
        text: 'A remembered assistant response.',
      });
    });
    expect(
      screen.getByText('A remembered assistant response.'),
    ).toBeInTheDocument();

    rerender(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(controller.subscribeCount).toBe(1);
    expect(document.querySelectorAll('.assistant-panel')).toHaveLength(1);
    expect(
      screen.getByText('A remembered assistant response.'),
    ).toBeInTheDocument();
  });

  it('exposes one floating launcher with truthful open state semantics', () => {
    const onOpen = vi.fn();
    render(
      <AgentCompanion
        capabilities={[]}
        isOpen={false}
        onClose={() => {}}
        onOpen={onOpen}
      />,
    );

    const launcher = screen.getByTestId('assistant-launcher');
    expect(launcher).toHaveClass('assistant-launcher');
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    expect(launcher).toHaveAttribute('aria-controls', 'agent-companion-dialog');
    fireEvent.click(launcher);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('offers an explicit chat or voice choice when the assistant is first opened', () => {
    const controller = makeController();
    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Start voice' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with chat' }),
    ).toBeInTheDocument();
    expect(controller.startMicrophone).not.toHaveBeenCalled();
  });

  it('connects chat without opening the microphone after the user chooses chat', async () => {
    const controller = makeController({ status: 'idle' });
    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue with chat' }));
    await waitFor(() => expect(controller.connect).toHaveBeenCalledOnce());
    expect(controller.startMicrophone).not.toHaveBeenCalled();
  });

  it('connects voice and requests the microphone only after the voice choice', async () => {
    const controller = makeController({ status: 'idle' });
    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start voice' }));
    await waitFor(() => expect(controller.connect).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(controller.startMicrophone).toHaveBeenCalledOnce(),
    );
  });

  it('keeps a listening stop action available when the assistant is minimized', async () => {
    const controller = makeController();
    const { rerender } = render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start voice' }));
    await waitFor(() => {
      expect(controller.startMicrophone).toHaveBeenCalledOnce();
    });

    rerender(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const stopButton = screen.getByTestId('assistant-minimized-stop');
    expect(stopButton).toBeInTheDocument();
    fireEvent.click(stopButton);
    expect(controller.stopMicrophone).toHaveBeenCalledOnce();
  });

  it('renders latest activity BEFORE capabilities in accessible DOM order', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const activityHeading = screen.getByRole('heading', {
      name: /latest activity/i,
    });
    const capabilitiesHeading = screen.getByRole('heading', {
      name: /page capabilities/i,
    });

    // Activity heading must precede capabilities heading in document order
    const position =
      activityHeading.compareDocumentPosition(capabilitiesHeading);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('exposes truthful source, status, section, time, and revision transition', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );
    const firstEntry = document.querySelector('.activity-entry')!;
    expect(firstEntry).not.toBeNull();
    expect(
      within(firstEntry as HTMLElement).getByText(
        'Added household member Emma Carter',
      ),
    ).toBeInTheDocument();
    expect(
      within(firstEntry as HTMLElement).getByText('Agent action'),
    ).toBeInTheDocument();
    expect(
      within(firstEntry as HTMLElement).getByText('succeeded'),
    ).toBeInTheDocument();
    expect(
      within(firstEntry as HTMLElement).getByText('household'),
    ).toBeInTheDocument();
    expect(
      within(firstEntry as HTMLElement).getByText(/r0 → r1/i),
    ).toBeInTheDocument();

    const timeEl = document.querySelector(
      'time[dateTime="2026-08-27T12:00:00.000Z"]',
    );
    expect(timeEl).not.toBeNull();
  });

  it('retains full activity history in progressive disclosure', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    // Full activity list or disclosure
    expect(screen.getByText(/all activity/i)).toBeInTheDocument();
    expect(screen.getByText('Navigated to Income section')).toBeInTheDocument();
  });

  it('keeps activity and tools closed until the user asks to see them', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const disclosure = document.querySelector(
      'details.companion-support-disclosure',
    );
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute('open');

    fireEvent.click(screen.getByText('Activity & tools'));
    expect(disclosure).toHaveAttribute('open');
  });

  it('renders available capabilities dynamically from props', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={[]}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const primaryLabels = Array.from(
      screen
        .getByRole('list', { name: 'Available capabilities' })
        .querySelectorAll('.capability-item-main > strong'),
    ).map((label) => label.textContent);
    expect(primaryLabels).toEqual([
      'Get application progress',
      'Add household member',
    ]);
    expect(screen.getByText('Add a new household member')).toBeInTheDocument();
  });

  it('presents friendly capability labels and keeps technical names in disclosure', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={[]}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByText('Add household member')).toBeInTheDocument();
    const technicalDetails = screen.getAllByText('Technical details');
    expect(
      technicalDetails.some((summary) =>
        summary
          .closest('details')
          ?.textContent?.includes('add_household_member'),
      ),
    ).toBe(true);
  });

  it('progressively discloses activity action metadata and affected entities', () => {
    render(
      <AgentCompanion
        capabilities={[]}
        activity={[
          {
            ...sampleActivity[0],
            affectedEntities: [
              {
                kind: 'household_member',
                id: 'person-emma',
                label: 'Emma Carter',
              },
            ],
          },
        ]}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByText('Activity details')).toBeInTheDocument();
    const details = screen.getByText('Activity details').closest('details');
    expect(details).toHaveTextContent('Action ID');
    expect(details).toHaveTextContent('person-emma');
    expect(details).toHaveTextContent('Emma Carter');
  });

  it('renders unavailable / empty state when no capabilities are active', () => {
    render(
      <AgentCompanion
        capabilities={[]}
        activity={[]}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByText(/no site tools are enabled/i)).toBeInTheDocument();
  });

  it('provides accessible polite live announcements for status', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  it('handles mobile drawer open and close with Escape key', () => {
    const handleClose = vi.fn();
    const handleOpen = vi.fn();

    const { rerender } = render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={[]}
        isOpen={false}
        onClose={handleClose}
        onOpen={handleOpen}
      />,
    );

    const openButton = screen.getByRole('button', {
      name: /open agent companion/i,
    });
    fireEvent.click(openButton);
    expect(handleOpen).toHaveBeenCalledTimes(1);

    rerender(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={[]}
        isOpen={true}
        onClose={handleClose}
        onOpen={handleOpen}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('never displays a submission capability in the list', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const companionText = screen.getByLabelText('Agent Companion').textContent;
    expect(companionText).not.toMatch(/submit_application/i);
    expect(companionText).not.toMatch(/submitDemo/i);
  });

  it('renders one body-portal confirmation modal with complete sanitized fields and focus trapping', () => {
    const controller = makeController();
    const speechOutput = { speak: vi.fn(), cancel: vi.fn() };
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        speechOutput={speechOutput}
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-modal-1',
        toolName: 'add_income_source',
        message: 'A change is ready for confirmation.',
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

    const modal = document.querySelector('.tool-confirmation-modal');
    expect(modal).not.toBeNull();
    expect(document.querySelectorAll('.tool-confirmation-modal')).toHaveLength(
      1,
    );
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveTextContent('Maya Carter');
    expect(modal).toHaveTextContent('Acme Health');
    expect(modal).toHaveTextContent('$1,250.00');
    expect(modal).toHaveTextContent('Monthly');
    expect(modal).toHaveTextContent('Draft preview');
    expect(modal).toHaveTextContent(
      'This is the review screen for the proposed change.',
    );
    expect(modal).not.toHaveTextContent('call-modal-1');
    expect(modal).not.toHaveTextContent('argumentsJson');
    expect(modal).not.toHaveTextContent('ownerPersonId');
    expect(
      document.querySelector('.tool-confirmation-modal-backdrop'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm and apply' }),
    ).toHaveFocus();

    screen.getByRole('button', { name: 'Cancel' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(
      screen.getByRole('button', { name: 'Confirm and apply' }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.queryByRole('textbox', { name: /correction/i })).toBeNull();
    expect(screen.getByText(/say .*confirm/i)).toBeInTheDocument();
    expect(speechOutput.speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Need correction' }));
    expect(controller.requestRevision).toHaveBeenCalledWith('call-modal-1');
    expect(document.querySelector('.tool-confirmation-modal')).not.toBeNull();

    act(() => {
      controller.emit({
        type: 'revision_requested',
        callId: 'call-modal-1',
        toolName: 'add_income_source',
        correction: 'The user requested a correction.',
      });
    });
    expect(document.querySelector('.tool-confirmation-modal')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /submit|attest/i }),
    ).not.toBeInTheDocument();
  });

  it('does not speak automatically when the confirmation modal opens', () => {
    const controller = makeController();
    const speechOutput = { speak: vi.fn(), cancel: vi.fn() };
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        speechOutput={speechOutput}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-no-auto-speech',
        toolName: 'add_income_source',
        message: 'A change is ready for confirmation.',
        draft: {
          title: 'Add income source',
          fields: [{ label: 'Employer or source', value: 'Acme Health' }],
        },
      });
    });

    expect(speechOutput.speak).not.toHaveBeenCalled();
  });

  it('keeps the compact companion closed after correction when the desktop panel is visible', () => {
    const controller = makeController();
    const onOpen = vi.fn();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen={false}
        onClose={() => {}}
        onOpen={onOpen}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-desktop-correction',
        toolName: 'add_household_member',
        message: 'Review the household member.',
        draft: {
          title: 'Add household member',
          fields: [{ label: 'First name', value: 'Emma' }],
        },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Need correction' }));
    act(() => {
      controller.emit({
        type: 'revision_requested',
        callId: 'call-desktop-correction',
        toolName: 'add_household_member',
        correction: 'The user requested a correction.',
      });
    });

    expect(onOpen).not.toHaveBeenCalled();
    window.matchMedia = originalMatchMedia;
  });

  it('opens the companion after correction when compact layout hides the side panel', () => {
    const controller = makeController();
    const onOpen = vi.fn();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen={false}
        onClose={() => {}}
        onOpen={onOpen}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-compact-correction',
        toolName: 'add_household_member',
        message: 'Review the household member.',
        draft: {
          title: 'Add household member',
          fields: [{ label: 'First name', value: 'Emma' }],
        },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Need correction' }));
    act(() => {
      controller.emit({
        type: 'revision_requested',
        callId: 'call-compact-correction',
        toolName: 'add_household_member',
        correction: 'The user requested a correction.',
      });
    });

    expect(onOpen).toHaveBeenCalledOnce();
    window.matchMedia = originalMatchMedia;
  });

  it('keeps the draft open when a correction loses a race with an already-started apply', () => {
    const controller = makeController();
    controller.requestRevision.mockReturnValue(false);
    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-race',
        toolName: 'add_income_source',
        message: 'A change is ready for confirmation.',
        draft: {
          title: 'Add income source',
          fields: [{ label: 'Member', value: 'Maya Carter' }],
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Need correction' }));

    expect(document.querySelector('.tool-confirmation-modal')).not.toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This change is already being applied',
    );
  });

  it('uses Escape as safe cancellation and closes/focuses only after successful completion', async () => {
    const controller = makeController();
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <h2 id="active-section-heading" tabIndex={-1}>
          Income
        </h2>
        <AgentCompanion
          capabilities={[]}
          assistantController={controller as unknown as AssistantController}
          assistantEnabled
          isOpen
          onClose={onClose}
          onOpen={() => {}}
        />
      </>,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-modal-2',
        toolName: 'set_current_coverage',
        message: 'A coverage change is ready for confirmation.',
        draft: {
          title: 'Set current coverage',
          fields: [{ label: 'Members', value: 'Maya Carter' }],
        },
      });
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(controller.cancelToolCall).toHaveBeenCalledWith('call-modal-2');
    expect(document.querySelector('.tool-confirmation-modal')).toBeNull();

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-modal-3',
        toolName: 'set_current_coverage',
        message: 'A coverage change is ready for confirmation.',
        draft: {
          title: 'Set current coverage',
          fields: [{ label: 'Members', value: 'Maya Carter' }],
        },
      });
      controller.emit({
        type: 'failed',
        callId: 'call-modal-3',
        toolName: 'set_current_coverage',
        message: 'Coverage could not be updated.',
      });
    });
    expect(
      document.querySelector('.tool-confirmation-modal'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Coverage could not be updated.',
    );
    expect(
      screen.getByRole('button', { name: 'Confirm and apply' }),
    ).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      controller.emit({
        type: 'succeeded',
        callId: 'call-modal-4',
        toolName: 'set_current_coverage',
        summary: 'Updated coverage for Maya Carter.',
      });
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-modal-4',
        toolName: 'set_current_coverage',
        message: 'A coverage change is ready for confirmation.',
        draft: {
          title: 'Set current coverage',
          fields: [{ label: 'Members', value: 'Maya Carter' }],
        },
      });
      controller.emit({
        type: 'succeeded',
        callId: 'call-modal-4',
        toolName: 'set_current_coverage',
        summary: 'Updated coverage for Maya Carter.',
      });
    });
    expect(document.querySelector('.tool-confirmation-modal')).toBeNull();
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <>
        <h2 id="active-section-heading" tabIndex={-1}>
          Income
        </h2>
        <AgentCompanion
          capabilities={[]}
          assistantController={controller as unknown as AssistantController}
          assistantEnabled
          isOpen={false}
          onClose={onClose}
          onOpen={() => {}}
        />
      </>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income' })).toHaveFocus();
    });
  });

  it('routes a failure to the single long-lived companion panel', () => {
    const controller = makeController();
    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const panels = Array.from(
      document.querySelectorAll<HTMLElement>('.assistant-panel'),
    );
    expect(panels).toHaveLength(1);

    act(() => {
      controller.emit({
        type: 'failed',
        callId: 'call-visible-failure',
        toolName: 'set_current_coverage',
        message: 'Coverage could not be updated.',
      });
    });

    expect(
      within(panels[0]!).getByText(
        /I couldn't apply that change: Coverage could not be updated\./,
      ),
    ).toBeInTheDocument();
  });

  it('keeps confirmation controls inert while applying and allows the terminal lifecycle to finish', () => {
    const controller = makeController();
    const onClose = vi.fn();
    render(
      <AgentCompanion
        capabilities={[]}
        assistantController={controller as unknown as AssistantController}
        assistantEnabled
        isOpen
        onClose={onClose}
        onOpen={() => {}}
      />,
    );

    act(() => {
      controller.emit({
        type: 'confirmation_required',
        callId: 'call-applying',
        toolName: 'set_current_coverage',
        message: 'A coverage change is ready for confirmation.',
        draft: {
          title: 'Set current coverage',
          fields: [{ label: 'Members', value: 'Maya Carter' }],
        },
      });
      controller.emit({
        type: 'applying',
        callId: 'call-applying',
        toolName: 'set_current_coverage',
      });
    });

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(controller.cancelToolCall).not.toHaveBeenCalled();
    expect(
      document.querySelector('.tool-confirmation-modal'),
    ).toBeInTheDocument();

    act(() => {
      controller.emit({
        type: 'succeeded',
        callId: 'call-applying',
        toolName: 'set_current_coverage',
        summary: 'Updated coverage for Maya Carter.',
      });
    });
    expect(document.querySelector('.tool-confirmation-modal')).toBeNull();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
