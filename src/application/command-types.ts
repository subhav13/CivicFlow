import type {
  CoverageStatus,
  DemoDocumentKind,
  IncomeFrequency,
  Person,
  Relationship,
} from '../domain';

export interface CommandContext {
  source: 'human' | 'webmcp';
  now: () => Date;
  newId: () => string;
}

export type CommandErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERSON_NOT_FOUND'
  | 'PERSON_AMBIGUOUS'
  | 'DUPLICATE_MEMBER'
  | 'DUPLICATE_INCOME'
  | 'APPLICATION_LOCKED'
  | 'REVIEW_BLOCKED'
  | 'ALREADY_SUBMITTED';

export type ChangedEntityKind =
  | 'application'
  | 'applicant'
  | 'household_member'
  | 'income_source'
  | 'coverage_record'
  | 'document'
  | 'attestation'
  | 'submission';

export interface ChangedEntitySummary {
  kind: ChangedEntityKind;
  id: string;
  label: string;
}

export interface CommandSuccessReceipt {
  kind: 'success';
  code: 'OK';
  actionId: string;
  changed: boolean;
  stateRevision: number;
  message: string;
  changedEntities: ChangedEntitySummary[];
}

export interface CommandFailureReceipt {
  kind: 'failure';
  code: CommandErrorCode;
  actionId: string;
  changed: false;
  stateRevision: number;
  message: string;
  changedEntities: ChangedEntitySummary[];
}

export type CommandReceipt = CommandSuccessReceipt | CommandFailureReceipt;

export interface CommandResult<State> {
  nextState: State;
  receipt: CommandReceipt;
}

export interface AddHouseholdMemberInput {
  firstName: string;
  lastName: string;
  ageYears: number;
  relationship: Exclude<Relationship, 'self'>;
  applyingForCoverage: boolean;
}

export interface UpdateApplicantInput {
  changes: Partial<
    Pick<
      Person,
      'firstName' | 'lastName' | 'ageYears' | 'applyingForCoverage'
    > & {
      email: string;
      phone: string;
      addressLine1: string;
      city: string;
      postalCode: string;
    }
  >;
}

export interface UpdateHouseholdMemberInput {
  personId: string;
  changes: Partial<
    Pick<
      Person,
      | 'firstName'
      | 'lastName'
      | 'ageYears'
      | 'relationship'
      | 'applyingForCoverage'
    >
  >;
}

export interface AddIncomeSourceInput {
  ownerPersonId: string;
  employerName: string;
  amountCents: number;
  frequency: IncomeFrequency;
  currency: 'USD';
}

export interface UpdateIncomeSourceInput {
  incomeSourceId: string;
  changes: Partial<
    Pick<
      AddIncomeSourceInput,
      | 'ownerPersonId'
      | 'employerName'
      | 'amountCents'
      | 'frequency'
      | 'currency'
    >
  >;
}

export interface SetCurrentCoverageInput {
  records: Array<{
    personId: string;
    status: CoverageStatus;
    providerName?: string;
    planName?: string;
  }>;
}

export interface AttachDemoDocumentInput {
  kind: DemoDocumentKind;
  displayName: string;
}

export interface SetAttestationInput {
  accepted: boolean;
}
