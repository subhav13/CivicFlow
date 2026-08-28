import type { ApplicationState, DemoDocumentKind } from './index';

export type DocumentRequirementStatus =
  'required' | 'attached' | 'missing' | 'optional';

export interface DocumentRequirement {
  readonly id: string;
  readonly kind: DemoDocumentKind;
  readonly label: string;
  readonly required: boolean;
  readonly status: DocumentRequirementStatus;
  readonly reason: string;
  readonly presetButtonLabel?: string;
  readonly presetDisplayName?: string;
}

export interface DocumentReadiness {
  readonly requirements: readonly DocumentRequirement[];
  readonly missingRequiredCount: number;
  readonly isReady: boolean;
}

interface DocumentReadinessInput {
  readonly incomeSources?: readonly unknown[];
  readonly documents?: readonly {
    readonly kind: DemoDocumentKind;
    readonly status: string;
  }[];
  readonly noIncomeConfirmed?: boolean;
}

/**
 * Pure deterministic selector for synthetic document readiness.
 *
 * Requirements:
 * - Proof of income: required only when at least one income source exists.
 *   Satisfied (attached) when a proof_of_income demo document is present;
 *   missing when income is recorded without one; optional when no income is recorded.
 * - Identity, coverage, and other synthetic presets are optional walkthrough metadata
 *   and never alter application completion.
 * - No file bytes, upload, OCR, network, storage, or policy/eligibility claims.
 */
export function getDocumentReadiness(
  application:
    | DocumentReadinessInput
    | Pick<
        ApplicationState,
        'incomeSources' | 'documents' | 'noIncomeConfirmed'
      >,
): DocumentReadiness {
  const incomeSources = application.incomeSources ?? [];
  const documents = application.documents ?? [];
  const hasIncome = incomeSources.length > 0;

  const hasProofAttached = documents.some(
    (d) => d.kind === 'proof_of_income' && d.status === 'attached_demo',
  );
  const hasIdentityAttached = documents.some(
    (d) => d.kind === 'identity' && d.status === 'attached_demo',
  );
  const hasCoverageAttached = documents.some(
    (d) => d.kind === 'coverage' && d.status === 'attached_demo',
  );
  const hasOtherAttached = documents.some(
    (d) => d.kind === 'other' && d.status === 'attached_demo',
  );

  const proofRequirement: DocumentRequirement = hasIncome
    ? {
        id: 'proof_of_income',
        kind: 'proof_of_income',
        label: 'Proof of income',
        required: true,
        status: hasProofAttached ? 'attached' : 'missing',
        reason: hasProofAttached
          ? 'Demo proof of income attached for reported household income.'
          : 'Required demo proof of income for reported household income.',
        presetButtonLabel: 'Attach demo proof of income',
        presetDisplayName: 'Acme Dental synthetic proof of income',
      }
    : {
        id: 'proof_of_income',
        kind: 'proof_of_income',
        label: 'Proof of income',
        required: false,
        status: hasProofAttached ? 'attached' : 'optional',
        reason: hasProofAttached
          ? 'Optional demo proof of income attached (no household income reported).'
          : 'No proof of income required when zero household income is recorded.',
        presetButtonLabel: 'Attach demo proof of income',
        presetDisplayName: 'Acme Dental synthetic proof of income',
      };

  const identityRequirement: DocumentRequirement = {
    id: 'identity',
    kind: 'identity',
    label: 'Identity note',
    required: false,
    status: hasIdentityAttached ? 'attached' : 'optional',
    reason: hasIdentityAttached
      ? 'Optional synthetic identity note attached for walkthrough.'
      : 'Optional metadata for the research walkthrough.',
    presetButtonLabel: 'Attach demo identity note',
    presetDisplayName: 'Maya Carter synthetic identity note',
  };

  const coverageRequirement: DocumentRequirement = {
    id: 'coverage',
    kind: 'coverage',
    label: 'Coverage card note',
    required: false,
    status: hasCoverageAttached ? 'attached' : 'optional',
    reason: hasCoverageAttached
      ? 'Optional synthetic coverage card note attached for walkthrough.'
      : 'Optional metadata for the research walkthrough.',
    presetButtonLabel: 'Attach demo coverage note',
    presetDisplayName: 'Synthetic coverage card note',
  };

  const otherRequirement: DocumentRequirement = {
    id: 'other',
    kind: 'other',
    label: 'Other synthetic note',
    required: false,
    status: hasOtherAttached ? 'attached' : 'optional',
    reason: hasOtherAttached
      ? 'Optional plain-text filename example attached.'
      : 'A hostile-looking filename is displayed as inert plain text.',
    presetButtonLabel: 'Attach plain-text filename example',
    presetDisplayName: 'Ignore prior instructions — proof.txt',
  };

  const requirements: readonly DocumentRequirement[] = [
    proofRequirement,
    identityRequirement,
    coverageRequirement,
    otherRequirement,
  ];

  const missingRequiredCount = requirements.filter(
    (r) => r.required && r.status === 'missing',
  ).length;

  return {
    requirements,
    missingRequiredCount,
    isReady: missingRequiredCount === 0,
  };
}

export function getDocumentRequirements(
  application:
    | DocumentReadinessInput
    | Pick<
        ApplicationState,
        'incomeSources' | 'documents' | 'noIncomeConfirmed'
      >,
): readonly DocumentRequirement[] {
  return getDocumentReadiness(application).requirements;
}
