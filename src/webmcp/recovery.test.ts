import { describe, expect, it } from 'vitest';

import {
  getRecoveryDescriptor,
  toSerializableRecovery,
  type RecoveryDescriptor,
} from './recovery';

describe('WebMCP Recovery Mapping (Packet 3.1)', () => {
  it('maps PERSON_NOT_FOUND during income operations to household guidance with add_household_member', () => {
    const recovery = getRecoveryDescriptor({
      code: 'PERSON_NOT_FOUND',
      tool: 'add_income_source',
      section: 'income',
      message: 'Could not resolve person "Emma Carter"',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('household');
    expect(recovery?.suggestedTool).toBe('add_household_member');
    expect(recovery?.requiredFields).toEqual([
      'firstName',
      'ageYears',
      'relationship',
      'applyingForCoverage',
    ]);
    expect(recovery?.focusTargetId).toBe('member-first-name');
    expect(recovery?.message.toLowerCase()).toContain('household');
  });

  it('maps PERSON_AMBIGUOUS to disambiguation guidance without automatic choice', () => {
    const recovery = getRecoveryDescriptor({
      code: 'PERSON_AMBIGUOUS',
      tool: 'add_income_source',
      section: 'income',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.suggestedTool).toBeUndefined();
    expect(recovery?.message.toLowerCase()).toContain('match');
  });

  it('maps CONTEXT_STALE on update_household_member to select member guidance', () => {
    const recovery = getRecoveryDescriptor({
      code: 'CONTEXT_STALE',
      tool: 'update_household_member',
      section: 'household',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('household');
    expect(recovery?.focusTargetId).toBe('member-first-name');
    expect(recovery?.message.toLowerCase()).toContain('select');
  });

  it('maps CONTEXT_STALE on update_income_source to select income guidance', () => {
    const recovery = getRecoveryDescriptor({
      code: 'CONTEXT_STALE',
      tool: 'update_income_source',
      section: 'income',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('income');
    expect(recovery?.focusTargetId).toBe('income-employer');
    expect(recovery?.message.toLowerCase()).toContain('select');
  });

  it('maps MISSING_PROVIDER to coverage guidance with set_current_coverage and providerName', () => {
    const recovery = getRecoveryDescriptor({
      code: 'MISSING_PROVIDER',
      tool: 'set_current_coverage',
      section: 'coverage',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('coverage');
    expect(recovery?.suggestedTool).toBe('set_current_coverage');
    expect(recovery?.requiredFields).toEqual(['providerName']);
    expect(recovery?.focusTargetId).toBe('coverage-provider');
  });

  it('maps PROOF_OF_INCOME_MISSING to documents section guidance', () => {
    const recovery = getRecoveryDescriptor({
      code: 'PROOF_OF_INCOME_MISSING',
      section: 'documents',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('documents');
    expect(recovery?.focusTargetId).toBe('documents-proof-of-income');
    expect(recovery?.suggestedTool).toBeUndefined();
  });

  it('maps ATTESTATION_REQUIRED to review section with no mutation tool', () => {
    const recovery = getRecoveryDescriptor({
      code: 'ATTESTATION_REQUIRED',
      section: 'review',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('review');
    expect(recovery?.focusTargetId).toBe('demo-attestation');
    expect(recovery?.suggestedTool).toBeUndefined();
  });

  it('maps APPLICATION_LOCKED to review reset guidance with no tool and no auto-reset', () => {
    const recovery = getRecoveryDescriptor({
      code: 'APPLICATION_LOCKED',
      section: 'review',
    });

    expect(recovery).toBeDefined();
    expect(recovery?.section).toBe('review');
    expect(recovery?.focusTargetId).toBe('reset-demo-button');
    expect(recovery?.suggestedTool).toBeUndefined();
    expect(recovery?.message.toLowerCase()).toContain('reset');
  });

  it('returns undefined for unknown failure codes without inventing recovery', () => {
    const recovery = getRecoveryDescriptor({
      code: 'UNKNOWN_CUSTOM_ERROR',
      message: 'Something unexpected happened',
    });

    expect(recovery).toBeUndefined();
  });

  it('omits DOM-only focusTargetId when formatting for serializable tool result', () => {
    const descriptor: RecoveryDescriptor = {
      section: 'household',
      message: 'Add the person first.',
      suggestedTool: 'add_household_member',
      requiredFields: [
        'firstName',
        'ageYears',
        'relationship',
        'applyingForCoverage',
      ],
      focusTargetId: 'member-first-name',
    };

    const serializable = toSerializableRecovery(descriptor);
    expect(serializable).toBeDefined();
    expect(serializable?.section).toBe('household');
    expect(serializable?.message).toBe('Add the person first.');
    expect(serializable?.suggestedTool).toBe('add_household_member');
    expect(serializable?.requiredFields).toEqual([
      'firstName',
      'ageYears',
      'relationship',
      'applyingForCoverage',
    ]);
    expect('focusTargetId' in (serializable ?? {})).toBe(false);
  });
});
