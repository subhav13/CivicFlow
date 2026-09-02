import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';

import { App } from '../../app/App';
import {
  createDemoApplicationSeed,
  getApplicationProgress,
} from '../../domain';
import type { OperationState } from '../../application/operation-feedback';
import { ApplicationShell } from './ApplicationShell';

describe('CivicFlow application shell', () => {
  it('renders the six sections in order with the seeded 20 percent progress', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /a webmpc benefit portal synthetic demo/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      /fictional research demo.*synthetic data only/i,
    );
    expect(screen.getByText('20% complete')).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', {
      name: /application sections/i,
    });
    expect(
      within(navigation)
        .getAllByRole('button')
        .filter((button) => button.classList.contains('section-nav-button'))
        .map((button) =>
          button.querySelector('.section-nav-copy > span')?.textContent?.trim(),
        ),
    ).toEqual([
      'About You',
      'Household',
      'Income',
      'Current Coverage',
      'Documents',
      'Review & Sign',
    ]);
  });

  it('keeps the companion truthful and exposes a mobile drawer affordance', () => {
    render(<App />);

    expect(
      screen.getByRole('complementary', { name: /agent companion/i }),
    ).toHaveTextContent(/no site tools are enabled yet/i);

    fireEvent.click(
      screen.getByRole('button', { name: /open agent companion/i }),
    );
    expect(
      screen.getByRole('dialog', { name: /agent companion/i }),
    ).toHaveTextContent(/no site tools are enabled yet/i);
    expect(
      screen.getByRole('button', { name: 'Close Agent Companion' }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: /agent companion/i }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: /open agent companion/i }),
    ).toHaveFocus();
  });

  it('uses a compact coachmark instead of the large first-run guide', () => {
    render(<App />);

    expect(screen.queryByTestId('first-run-guide')).toBeNull();
    expect(screen.getByTestId('assistant-coachmark')).toHaveTextContent(
      /try the assistant/i,
    );
  });

  it('keeps the assistant launcher outside the application workspace columns', () => {
    render(<App />);

    const workspace = document.querySelector('.workspace-grid');
    expect(workspace).not.toBeNull();
    expect(workspace?.querySelector('.assistant-companion-host')).toBeNull();
    expect(workspace?.children).toHaveLength(2);
    expect(screen.getByTestId('assistant-launcher')).toBeInTheDocument();
  });

  it('traverses each section with its visible next control', () => {
    render(<App />);

    const labels = [
      'About You',
      'Household',
      'Income',
      'Current Coverage',
      'Documents',
      'Review & Sign',
    ];

    for (const label of labels.slice(1)) {
      fireEvent.click(
        screen.getByRole('button', { name: new RegExp(`^Next: ${label}`) }),
      );
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }

    expect(
      screen.getByRole('button', { name: 'Next section unavailable' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Review & Sign is the final section.'),
    ).toBeInTheDocument();
  });

  it('renders detailed progress tracker with N of 6, blockers, active step, and next target', () => {
    render(<App />);

    const tracker = screen.getByTestId('application-progress-tracker');
    expect(tracker).toBeInTheDocument();
    expect(within(tracker).getByText('1 of 6')).toBeInTheDocument();
    expect(within(tracker).getByText('4')).toBeInTheDocument(); // 4 blockers in seed
    expect(within(tracker).getByText('About You')).toBeInTheDocument();
    expect(within(tracker).getByText('Household')).toBeInTheDocument();
    expect(
      within(tracker).getByText(
        'Demo data ready · Changes save in this browser',
      ),
    ).toBeInTheDocument();
  });

  it('shows a dismissible agent notice when a completed change belongs to another section', () => {
    const operation: OperationState = {
      actionId: 'agent-household-change',
      source: 'webmcp',
      label: 'Add household member',
      toolName: 'add_household_member',
      section: 'household',
      startedAt: '2026-08-28T00:00:00.000Z',
      completedAt: '2026-08-28T00:00:01.000Z',
      beforeRevision: 0,
      afterRevision: 1,
      phase: 'succeeded',
      affectedEntityIds: ['person-emma'],
    };
    const onDismiss = vi.fn();

    render(
      <ApplicationShell
        activeSection="income"
        capabilities={[]}
        companionOpen={false}
        currentSection={<div>Current section</div>}
        onCloseCompanion={() => {}}
        onNavigate={() => {}}
        onOpenCompanion={() => {}}
        progress={getApplicationProgress(createDemoApplicationSeed())}
        activeOperation={operation}
        onDismissOperation={onDismiss}
      />,
    );

    const toast = screen.getByTestId('agent-change-toast');
    expect(toast).toHaveAttribute('data-action-id', 'agent-household-change');
    expect(toast).toHaveTextContent(/household/i);

    fireEvent.click(
      screen.getByRole('button', { name: /dismiss agent update/i }),
    );
    expect(onDismiss).toHaveBeenCalledWith('agent-household-change');
  });

  it('describes a failed cross-section agent action as failed rather than updated', () => {
    const operation: OperationState = {
      actionId: 'agent-household-failure',
      source: 'webmcp',
      label: 'Update household member',
      toolName: 'update_household_member',
      section: 'household',
      startedAt: '2026-08-28T00:00:00.000Z',
      completedAt: '2026-08-28T00:00:01.000Z',
      beforeRevision: 0,
      phase: 'failed',
      affectedEntityIds: [],
      recovery: {
        section: 'household',
        message: 'Select a household member first.',
      },
    };

    render(
      <ApplicationShell
        activeSection="income"
        capabilities={[]}
        companionOpen={false}
        currentSection={<div>Current section</div>}
        onCloseCompanion={() => {}}
        onNavigate={() => {}}
        onOpenCompanion={() => {}}
        progress={getApplicationProgress(createDemoApplicationSeed())}
        activeOperation={operation}
      />,
    );

    const toast = screen.getByTestId('agent-change-toast');
    expect(toast).toHaveTextContent(/failed|could not|unable/i);
    expect(toast).not.toHaveTextContent(/updated/i);
  });
});
