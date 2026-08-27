import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgentCompanion } from './AgentCompanion';
import type { ActivityEntry, CapabilitySummary } from '../../application/store';

describe('AgentCompanion Component', () => {
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
      occurredAt: '2026-08-27T12:00:00.000Z',
    },
    {
      id: 'act-2',
      summary: 'Navigated to Income section',
      source: 'human',
      occurredAt: '2026-08-27T12:01:00.000Z',
    },
  ];

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

    expect(screen.getByText('get_application_progress')).toBeInTheDocument();
    expect(screen.getByText('add_household_member')).toBeInTheDocument();
    expect(screen.getByText('Add a new household member')).toBeInTheDocument();
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

  it('renders recent activity with truthful "Agent action" attribution', () => {
    render(
      <AgentCompanion
        capabilities={sampleCapabilities}
        activity={sampleActivity}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(
      screen.getByText('Added household member Emma Carter'),
    ).toBeInTheDocument();
    expect(screen.getByText('Agent action')).toBeInTheDocument();
    expect(screen.getByText('Human action')).toBeInTheDocument();
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
