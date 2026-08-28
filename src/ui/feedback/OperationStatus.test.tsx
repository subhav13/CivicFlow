import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { OperationState } from '../../application/operation-feedback';
import { OperationStatus } from './OperationStatus';

describe('OperationStatus component (Packet 2.2)', () => {
  const humanValidatingOp: OperationState = {
    actionId: 'act-human-1',
    source: 'human',
    label: 'Add household member',
    section: 'household',
    startedAt: '2026-08-28T00:00:00.000Z',
    beforeRevision: 0,
    phase: 'validating',
    affectedEntityIds: [],
  };

  const webmcpApplyingOp: OperationState = {
    actionId: 'act-webmcp-1',
    source: 'webmcp',
    label: 'add_income_source',
    toolName: 'add_income_source',
    section: 'income',
    startedAt: '2026-08-28T00:00:00.000Z',
    beforeRevision: 1,
    phase: 'applying',
    affectedEntityIds: [],
  };

  const succeededOp: OperationState = {
    actionId: 'act-webmcp-2',
    source: 'webmcp',
    label: 'add_household_member',
    toolName: 'add_household_member',
    section: 'household',
    startedAt: '2026-08-28T00:00:00.000Z',
    completedAt: '2026-08-28T00:00:00.100Z',
    beforeRevision: 0,
    afterRevision: 1,
    phase: 'succeeded',
    affectedEntityIds: ['person-emma'],
  };

  const failedOp: OperationState = {
    actionId: 'act-human-2',
    source: 'human',
    label: 'Update income',
    section: 'income',
    startedAt: '2026-08-28T00:00:00.000Z',
    completedAt: '2026-08-28T00:00:00.050Z',
    beforeRevision: 1,
    phase: 'failed',
    affectedEntityIds: [],
    recovery: {
      section: 'income',
      message: 'Select an income source first.',
    },
  };

  it('renders null when operation is null (suppression for read-only/no-op)', () => {
    const { container } = render(<OperationStatus operation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Human source, validating phase, and actionId attribute', () => {
    render(<OperationStatus operation={humanValidatingOp} />);

    const statusEl = screen.getByTestId('operation-status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('data-action-id', 'act-human-1');
    expect(statusEl).toHaveAttribute('data-source', 'human');
    expect(statusEl).toHaveAttribute('data-phase', 'validating');
    expect(statusEl).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Human:')).toBeInTheDocument();
    expect(
      screen.getByText(/validating add household member/i),
    ).toBeInTheDocument();
  });

  it('renders Site Tool source, applying phase, and tool name for WebMCP mutations', () => {
    render(<OperationStatus operation={webmcpApplyingOp} />);

    const statusEl = screen.getByTestId('operation-status');
    expect(statusEl).toHaveAttribute('data-action-id', 'act-webmcp-1');
    expect(statusEl).toHaveAttribute('data-source', 'webmcp');
    expect(statusEl).toHaveAttribute('data-phase', 'applying');
    expect(statusEl).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Site Tool:')).toBeInTheDocument();
    expect(screen.getByText(/applying add_income_source/i)).toBeInTheDocument();
  });

  it('renders revision and success feedback with aria-busy false', () => {
    render(<OperationStatus operation={succeededOp} />);

    const statusEl = screen.getByTestId('operation-status');
    expect(statusEl).toHaveAttribute('aria-busy', 'false');
    expect(statusEl).toHaveAttribute('data-phase', 'succeeded');
    expect(screen.getByText(/succeeded/i)).toBeInTheDocument();
    expect(screen.getByText('(r1)')).toBeInTheDocument();
  });

  it('auto-dismisses succeeded operation after injected duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(
      <OperationStatus
        operation={succeededOp}
        onDismiss={onDismiss}
        autoDismissMs={2000}
      />,
    );

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('act-webmcp-2');

    vi.useRealTimers();
  });

  it('persists failure feedback and provides dismiss action', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(
      <OperationStatus
        operation={failedOp}
        onDismiss={onDismiss}
        autoDismissMs={2000}
      />,
    );

    const statusEl = screen.getByTestId('operation-status');
    expect(statusEl).toHaveAttribute('data-phase', 'failed');
    expect(statusEl).toHaveAttribute('aria-busy', 'false');
    expect(
      screen.getByText(/select an income source first/i),
    ).toBeInTheDocument();

    // Does not auto-dismiss
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // User can manually dismiss
    const dismissBtn = screen.getByRole('button', {
      name: /dismiss failure notice/i,
    });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledWith('act-human-2');

    vi.useRealTimers();
  });
});
