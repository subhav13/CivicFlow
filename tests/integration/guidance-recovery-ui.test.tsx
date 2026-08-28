import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../../src/application/store';
import {
  createStaticToolHandlers,
  type WebMcpToolHandlers,
} from '../../src/webmcp/tool-handlers';
import { RecoveryBanner } from '../../src/ui/feedback/RecoveryBanner';

describe('Guidance and Recovery UI & Integration (Packet 3.3)', () => {
  let store: CivicFlowStore;
  let handlers: WebMcpToolHandlers;

  beforeEach(() => {
    store = createCivicFlowStore();
    handlers = createStaticToolHandlers(store);
  });

  it('handles Emma-before-income failure with structured recovery in tool result and UI', async () => {
    const revBefore = store.getState().application.revision;

    // Attempt to add income for Emma Carter without adding her to household first
    const rawResult = await handlers.add_income_source({
      ownerName: 'Emma Carter',
      employerName: 'Supermarket',
      amount: 1200,
      frequency: 'monthly',
    });

    const parsed = JSON.parse(rawResult);

    // 1. Result contract
    expect(parsed.ok).toBe(false);
    expect(parsed.tool).toBe('add_income_source');
    expect(parsed.error.code).toBe('PERSON_NOT_FOUND');
    expect(parsed.stateRevision).toBe(revBefore);
    expect(rawResult.length).toBeLessThanOrEqual(1500);

    // Structured recovery attached to result
    expect(parsed.error.recovery).toBeDefined();
    expect(parsed.error.recovery.section).toBe('household');
    expect(parsed.error.recovery.suggestedTool).toBe('add_household_member');
    expect(parsed.error.recovery.requiredFields).toEqual([
      'firstName',
      'ageYears',
      'relationship',
      'applyingForCoverage',
    ]);
    expect('focusTargetId' in parsed.error.recovery).toBe(false);

    // 2. Store operation lifecycle state
    const op = store.getState().ui.activeOperation;
    expect(op).not.toBeNull();
    expect(op?.phase).toBe('failed');
    expect(op?.actionId).toBe(parsed.actionId);
    expect(op?.beforeRevision).toBe(revBefore);
    expect(op?.recovery).toBeDefined();
    expect(op?.recovery?.section).toBe('household');
    expect(op?.recovery?.focusTargetId).toBe('member-first-name');

    // 3. UI RecoveryBanner rendering
    const onNavigate = vi.fn();
    const onDismiss = vi.fn();

    render(
      <RecoveryBanner
        operation={op}
        onNavigate={onNavigate}
        onDismiss={onDismiss}
      />,
    );

    const banner = screen.getByTestId('recovery-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getAllByText(/household/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/firstName/i)).toBeInTheDocument();
    const navBtn = screen.getByTestId('recovery-banner-navigate');
    fireEvent.click(navBtn);
    expect(onNavigate).toHaveBeenCalledWith('household', 'member-first-name');

    const dismissBtn = screen.getByTestId('recovery-banner-dismiss');
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledWith(parsed.actionId);

    // Application state revision unchanged
    expect(store.getState().application.revision).toBe(revBefore);
  });

  it('handles stale household selection failure with recovery', async () => {
    const revBefore = store.getState().application.revision;

    const raw = await handlers.update_household_member({
      firstName: 'Alice',
    });

    const parsed = JSON.parse(raw);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('CONTEXT_STALE');
    expect(parsed.error.recovery).toBeDefined();
    expect(parsed.error.recovery.section).toBe('household');
    expect(store.getState().application.revision).toBe(revBefore);

    const op = store.getState().ui.activeOperation;
    expect(op?.recovery?.section).toBe('household');
  });

  it('handles stale income selection failure with recovery', async () => {
    const revBefore = store.getState().application.revision;

    const raw = await handlers.update_income_source({
      amount: 2000,
    });

    const parsed = JSON.parse(raw);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('CONTEXT_STALE');
    expect(parsed.error.recovery).toBeDefined();
    expect(parsed.error.recovery.section).toBe('income');
    expect(store.getState().application.revision).toBe(revBefore);

    const op = store.getState().ui.activeOperation;
    expect(op?.recovery?.section).toBe('income');
  });

  it('handles missing coverage provider failure with recovery', async () => {
    const revBefore = store.getState().application.revision;
    const applicant = store.getState().application.applicant;
    const fullName = `${applicant.firstName} ${applicant.lastName}`;

    const raw = await handlers.set_current_coverage({
      memberNames: [fullName],
      status: 'covered',
    });
    const parsed = JSON.parse(raw);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('MISSING_PROVIDER');
    expect(parsed.error.recovery).toBeDefined();
    expect(parsed.error.recovery.section).toBe('coverage');
    expect(parsed.error.recovery.suggestedTool).toBe('set_current_coverage');
    expect(parsed.error.recovery.requiredFields).toContain('providerName');
    expect(store.getState().application.revision).toBe(revBefore);
  });
});
