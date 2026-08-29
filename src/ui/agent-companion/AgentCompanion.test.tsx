import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgentCompanion } from './AgentCompanion';
import type { ActivityEntry, CapabilitySummary } from '../../application/store';

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
});
