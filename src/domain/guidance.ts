import {
  type ApplicationState,
  type SectionId,
  getApplicationProgress,
} from './index';

export interface NextAction {
  id: string;
  priority: 1 | 2 | 3;
  section: SectionId;
  title: string;
  reason: string;
  suggestedTool?: string;
  requiredFields?: readonly string[];
}

/**
 * Pure domain selector deriving the next safe application actions without calculating
 * eligibility, benefits, coverage recommendations, or policy.
 *
 * Rules:
 * - At most three actions, stable canonical order (about, household, income, coverage, documents, review).
 * - Blockers before optional improvements.
 * - Clock-free, network-free, deterministic.
 * - Returns [] for fully complete or submitted applications.
 */
export function getNextActions(application: ApplicationState): NextAction[] {
  // If submitted, do not invent new actions
  if (application.submission.status === 'submitted_demo') {
    return [];
  }

  const progress = getApplicationProgress(application);
  const sectionStatus = new Map<SectionId, boolean>();
  for (const s of progress.sections) {
    sectionStatus.set(s.id, s.complete);
  }

  const actions: NextAction[] = [];

  // 1. About section
  if (!sectionStatus.get('about')) {
    actions.push({
      id: 'action-about-details',
      priority: 1,
      section: 'about',
      title: 'Complete applicant details',
      reason: 'Provide applicant identity and contact information.',
      requiredFields: [
        'firstName',
        'lastName',
        'ageYears',
        'email',
        'phone',
        'addressLine1',
        'city',
        'state',
        'postalCode',
      ],
    });
  }

  // 2. Household section
  if (!sectionStatus.get('household')) {
    actions.push({
      id: 'action-household-confirm',
      priority: 1,
      section: 'household',
      title: 'Confirm household members',
      reason: 'Record all household members and confirm the household roster.',
      suggestedTool: 'add_household_member',
      requiredFields: [
        'firstName',
        'ageYears',
        'relationship',
        'applyingForCoverage',
      ],
    });
  }

  // 3. Income section
  if (!sectionStatus.get('income')) {
    actions.push({
      id: 'action-income-report',
      priority: 1,
      section: 'income',
      title: 'Report household income',
      reason:
        'Add an income source for household earners or confirm no income.',
      suggestedTool: 'add_income_source',
      requiredFields: ['ownerName', 'employerName', 'amount', 'frequency'],
    });
  }

  // 4. Coverage section
  if (!sectionStatus.get('coverage')) {
    actions.push({
      id: 'action-coverage-status',
      priority: 1,
      section: 'coverage',
      title: 'Record current health coverage',
      reason: 'Specify coverage status for all applying household members.',
      suggestedTool: 'set_current_coverage',
      requiredFields: ['memberNames', 'status'],
    });
  }

  // 5. Documents section
  if (!sectionStatus.get('documents')) {
    // Only require documents if income is reported
    if (application.incomeSources.length > 0) {
      actions.push({
        id: 'action-documents-proof-of-income',
        priority: 1,
        section: 'documents',
        title: 'Attach proof of income',
        reason: 'Attach demo proof of income for reported household income.',
      });
    }
  }

  // 6. Review section
  if (!sectionStatus.get('review')) {
    // Only show review/attestation action if all data sections are completed
    const dataSectionsComplete =
      (sectionStatus.get('about') ?? false) &&
      (sectionStatus.get('household') ?? false) &&
      (sectionStatus.get('income') ?? false) &&
      (sectionStatus.get('coverage') ?? false) &&
      (sectionStatus.get('documents') ?? false);

    if (
      dataSectionsComplete &&
      (!application.attestation.accepted ||
        application.attestation.acceptedAt === null)
    ) {
      actions.push({
        id: 'action-review-attestation',
        priority: 1,
        section: 'review',
        title: 'Accept demo attestation',
        reason:
          'Review the completed application and accept the demo attestation.',
      });
    }
  }

  // Return at most 3 actions in canonical order
  return actions.slice(0, 3);
}
