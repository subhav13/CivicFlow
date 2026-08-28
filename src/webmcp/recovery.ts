import type { SectionId } from '../domain';
import type { CivicFlowToolName } from './tool-catalog';

export interface RecoveryDescriptor {
  section: SectionId;
  message: string;
  suggestedTool?: CivicFlowToolName;
  requiredFields?: readonly string[];
  focusTargetId?: string; // UI-only; omit from serialized ToolFailure.error
}

export interface RecoveryContext {
  code: string;
  tool?: CivicFlowToolName;
  section?: SectionId;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export interface SerializableRecovery {
  section: SectionId;
  message: string;
  suggestedTool?: CivicFlowToolName;
  requiredFields?: readonly string[];
}

/**
 * Pure mapper deriving deterministic recovery descriptors from known failure codes
 * and tool/section contexts. Unknown failure codes return undefined without invented recovery.
 */
export function getRecoveryDescriptor(
  context: RecoveryContext,
): RecoveryDescriptor | undefined {
  const { code, tool, section } = context;

  // 1. PERSON_NOT_FOUND
  if (code === 'PERSON_NOT_FOUND') {
    // If attempting to add or update income for an unknown person (e.g. Emma scenario)
    if (
      tool === 'add_income_source' ||
      tool === 'update_income_source' ||
      section === 'income'
    ) {
      return {
        section: 'household',
        message:
          'Add the person as a household member before recording their income.',
        suggestedTool: 'add_household_member',
        requiredFields: [
          'firstName',
          'ageYears',
          'relationship',
          'applyingForCoverage',
        ],
        focusTargetId: 'member-first-name',
      };
    }

    if (tool === 'set_current_coverage' || section === 'coverage') {
      return {
        section: 'household',
        message:
          'Add the person as a household member before setting their coverage.',
        suggestedTool: 'add_household_member',
        requiredFields: [
          'firstName',
          'ageYears',
          'relationship',
          'applyingForCoverage',
        ],
        focusTargetId: 'member-first-name',
      };
    }

    return {
      section: 'household',
      message:
        'The requested person was not found in the household. Add them as a member first.',
      suggestedTool: 'add_household_member',
      requiredFields: [
        'firstName',
        'ageYears',
        'relationship',
        'applyingForCoverage',
      ],
      focusTargetId: 'member-first-name',
    };
  }

  // 2. PERSON_AMBIGUOUS
  if (code === 'PERSON_AMBIGUOUS') {
    const targetSection: SectionId =
      section ??
      (tool === 'add_income_source' || tool === 'update_income_source'
        ? 'income'
        : tool === 'set_current_coverage'
          ? 'coverage'
          : 'household');

    const focusTargetId =
      targetSection === 'income'
        ? 'income-source-list'
        : targetSection === 'coverage'
          ? 'coverage-section'
          : 'household-member-list';

    return {
      section: targetSection,
      message:
        'Multiple people match the specified query. Specify the exact full name or unique ID.',
      focusTargetId,
    };
  }

  // 3. CONTEXT_STALE
  if (code === 'CONTEXT_STALE') {
    if (tool === 'update_household_member' || section === 'household') {
      return {
        section: 'household',
        message:
          'No household member is currently selected. Select a household member before updating.',
        focusTargetId: 'member-first-name',
      };
    }

    if (tool === 'update_income_source' || section === 'income') {
      return {
        section: 'income',
        message:
          'No income source is currently selected. Select an income card before updating.',
        focusTargetId: 'income-employer',
      };
    }

    if (tool === 'review_application' || section === 'review') {
      return {
        section: 'review',
        message:
          'Navigate to the Review & Sign section before reviewing application readiness.',
        focusTargetId: 'active-section-heading',
      };
    }
  }

  // 4. MISSING_PROVIDER
  if (
    code === 'MISSING_PROVIDER' ||
    (tool === 'set_current_coverage' &&
      context.fieldErrors?.providerName !== undefined)
  ) {
    return {
      section: 'coverage',
      message: 'Provider name is required when coverage status is "covered".',
      suggestedTool: 'set_current_coverage',
      requiredFields: ['providerName'],
      focusTargetId: 'coverage-provider',
    };
  }

  // 5. PROOF_OF_INCOME_MISSING
  if (code === 'PROOF_OF_INCOME_MISSING') {
    return {
      section: 'documents',
      message:
        'Attach a demo proof of income document in the Documents section.',
      focusTargetId: 'documents-proof-of-income',
    };
  }

  // 6. ATTESTATION_REQUIRED
  if (code === 'ATTESTATION_REQUIRED') {
    return {
      section: 'review',
      message:
        'Accept the demo attestation checkbox in the Review & Sign section.',
      focusTargetId: 'demo-attestation',
    };
  }

  // 7. APPLICATION_LOCKED
  if (code === 'APPLICATION_LOCKED') {
    return {
      section: 'review',
      message:
        'The synthetic demo application is submitted and locked. Reset the demo to make changes.',
      focusTargetId: 'reset-demo-button',
    };
  }

  return undefined;
}

/**
 * Strips UI-only DOM identifiers (focusTargetId) for serializable tool results.
 */
export function toSerializableRecovery(
  descriptor: RecoveryDescriptor | undefined,
): SerializableRecovery | undefined {
  if (!descriptor) return undefined;
  const result: SerializableRecovery = {
    section: descriptor.section,
    message: descriptor.message,
  };
  if (descriptor.suggestedTool !== undefined) {
    result.suggestedTool = descriptor.suggestedTool;
  }
  if (descriptor.requiredFields !== undefined) {
    result.requiredFields = descriptor.requiredFields.slice();
  }
  return result;
}
