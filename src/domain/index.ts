import Ajv from 'ajv';
import { Type, type Static } from '@sinclair/typebox';

/** Pure, synthetic-only domain contracts. No browser, storage, clock, or network dependencies. */
export const SECTION_IDS = [
  'about',
  'household',
  'income',
  'coverage',
  'documents',
  'review',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const RELATIONSHIPS = [
  'self',
  'spouse',
  'son',
  'daughter',
  'child',
  'dependent',
  'other',
] as const;
export const INCOME_FREQUENCIES = [
  'weekly',
  'biweekly',
  'monthly',
  'annual',
] as const;
export const ENTITY_CAPS = {
  householdMembers: 20,
  incomeSources: 30,
  coverageRecords: 30,
  documents: 20,
} as const;
export const MAX_INCOME_CENTS = 1_000_000_000;

const ID_PATTERN = '^[a-z][a-z0-9-]*$';
const ISO_TIMESTAMP_PATTERN =
  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$';
const IdentifierSchema = Type.String({
  minLength: 1,
  maxLength: 96,
  pattern: ID_PATTERN,
});
const TimestampSchema = Type.String({
  minLength: 20,
  maxLength: 30,
  pattern: ISO_TIMESTAMP_PATTERN,
});
const PlainStringSchema = Type.String({ minLength: 1, maxLength: 160 });
const DocumentDisplayNameSchema = Type.String({ minLength: 1, maxLength: 120 });

export const PersonSchema = Type.Object(
  {
    id: IdentifierSchema,
    firstName: Type.String({ minLength: 1, maxLength: 64 }),
    lastName: Type.String({ minLength: 1, maxLength: 64 }),
    ageYears: Type.Integer({ minimum: 0, maximum: 130 }),
    relationship: Type.Union(RELATIONSHIPS.map((value) => Type.Literal(value))),
    applyingForCoverage: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type Person = Static<typeof PersonSchema>;
export type Relationship = Person['relationship'];

export const ApplicantProfileSchema = Type.Object(
  {
    id: IdentifierSchema,
    firstName: Type.String({ minLength: 1, maxLength: 64 }),
    lastName: Type.String({ minLength: 1, maxLength: 64 }),
    ageYears: Type.Integer({ minimum: 0, maximum: 130 }),
    relationship: Type.Literal('self'),
    applyingForCoverage: Type.Boolean(),
    email: Type.String({ minLength: 3, maxLength: 120 }),
    phone: Type.String({ minLength: 3, maxLength: 40 }),
    addressLine1: Type.String({ minLength: 3, maxLength: 120 }),
    city: Type.String({ minLength: 1, maxLength: 80 }),
    state: Type.Literal('MA'),
    postalCode: Type.String({ minLength: 5, maxLength: 10 }),
  },
  { additionalProperties: false },
);
export type ApplicantProfile = Static<typeof ApplicantProfileSchema>;

export const IncomeSourceSchema = Type.Object(
  {
    id: IdentifierSchema,
    ownerPersonId: IdentifierSchema,
    employerName: PlainStringSchema,
    amountCents: Type.Integer({ minimum: 0, maximum: MAX_INCOME_CENTS }),
    frequency: Type.Union(
      INCOME_FREQUENCIES.map((value) => Type.Literal(value)),
    ),
    currency: Type.Literal('USD'),
  },
  { additionalProperties: false },
);
export type IncomeSource = Static<typeof IncomeSourceSchema>;
export type IncomeFrequency = IncomeSource['frequency'];

export const CoverageRecordSchema = Type.Object(
  {
    personId: IdentifierSchema,
    status: Type.Union([Type.Literal('none'), Type.Literal('covered')]),
    providerName: Type.Optional(PlainStringSchema),
    planName: Type.Optional(PlainStringSchema),
  },
  { additionalProperties: false },
);
export type CoverageRecord = Static<typeof CoverageRecordSchema>;
export type CoverageStatus = CoverageRecord['status'];

export const DemoDocumentSchema = Type.Object(
  {
    id: IdentifierSchema,
    kind: Type.Union([
      Type.Literal('proof_of_income'),
      Type.Literal('identity'),
      Type.Literal('coverage'),
      Type.Literal('other'),
    ]),
    displayName: DocumentDisplayNameSchema,
    status: Type.Literal('attached_demo'),
    addedAt: TimestampSchema,
  },
  { additionalProperties: false },
);
export type DemoDocument = Static<typeof DemoDocumentSchema>;
export type DemoDocumentKind = DemoDocument['kind'];

export const ApplicationStateSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    applicationId: Type.Literal('civicflow-synthetic-demo'),
    revision: Type.Integer({ minimum: 0, maximum: 1_000_000 }),
    applicant: ApplicantProfileSchema,
    householdConfirmed: Type.Boolean(),
    householdMembers: Type.Array(PersonSchema, {
      maxItems: ENTITY_CAPS.householdMembers,
    }),
    noIncomeConfirmed: Type.Boolean(),
    incomeSources: Type.Array(IncomeSourceSchema, {
      maxItems: ENTITY_CAPS.incomeSources,
    }),
    coverageRecords: Type.Array(CoverageRecordSchema, {
      maxItems: ENTITY_CAPS.coverageRecords,
    }),
    documents: Type.Array(DemoDocumentSchema, {
      maxItems: ENTITY_CAPS.documents,
    }),
    attestation: Type.Object(
      {
        accepted: Type.Boolean(),
        acceptedAt: Type.Union([TimestampSchema, Type.Null()]),
      },
      { additionalProperties: false },
    ),
    submission: Type.Object(
      {
        status: Type.Union([
          Type.Literal('not_submitted'),
          Type.Literal('submitted_demo'),
        ]),
        submittedAt: Type.Union([TimestampSchema, Type.Null()]),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
export type ApplicationState = Static<typeof ApplicationStateSchema>;

const ajv = new Ajv({ allErrors: true, strict: true });
const validateSchema = ajv.compile(ApplicationStateSchema);

export class ApplicationValidationError extends Error {
  readonly code = 'APPLICATION_VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationValidationError';
  }
}

function schemaErrorMessage(): string {
  return (validateSchema.errors ?? [])
    .map((error) => (error.instancePath || 'application') + ' ' + error.message)
    .join('; ');
}

function requireUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new ApplicationValidationError(label + ' must be unique');
  }
}

function validateCrossFieldInvariants(state: ApplicationState): void {
  const people = [state.applicant, ...state.householdMembers];
  requireUnique(
    people.map((person) => person.id),
    'Applicant and household member IDs',
  );
  if (
    state.householdMembers.some(
      (person) =>
        person.relationship === 'self' || person.id === state.applicant.id,
    )
  ) {
    throw new ApplicationValidationError(
      'Household members cannot be the applicant or use relationship self',
    );
  }
  const personIds = new Set(people.map((person) => person.id));
  requireUnique(
    state.incomeSources.map((source) => source.id),
    'Income source IDs',
  );
  if (
    state.incomeSources.some((source) => !personIds.has(source.ownerPersonId))
  ) {
    throw new ApplicationValidationError(
      'Each income ownerPersonId must refer to a recorded person',
    );
  }
  requireUnique(
    state.coverageRecords.map((record) => record.personId),
    'Coverage record person IDs',
  );
  if (state.coverageRecords.some((record) => !personIds.has(record.personId))) {
    throw new ApplicationValidationError(
      'Each coverage record personId must refer to a recorded person',
    );
  }
  for (const record of state.coverageRecords) {
    if (record.status === 'covered' && !record.providerName) {
      throw new ApplicationValidationError(
        'Covered coverage records require providerName',
      );
    }
    if (
      record.status === 'none' &&
      (record.providerName !== undefined || record.planName !== undefined)
    ) {
      throw new ApplicationValidationError(
        'None coverage records must not retain providerName or planName',
      );
    }
  }
  requireUnique(
    state.documents.map((document) => document.id),
    'Document IDs',
  );
  requireUnique(
    [
      ...people.map((person) => person.id),
      ...state.incomeSources.map((source) => source.id),
      ...state.documents.map((document) => document.id),
    ],
    'Entity IDs',
  );
  if (
    (state.attestation.accepted && state.attestation.acceptedAt === null) ||
    (!state.attestation.accepted && state.attestation.acceptedAt !== null)
  ) {
    throw new ApplicationValidationError(
      'Attestation acceptance and acceptedAt must agree',
    );
  }
  if (
    (state.submission.status === 'submitted_demo' &&
      state.submission.submittedAt === null) ||
    (state.submission.status === 'not_submitted' &&
      state.submission.submittedAt !== null)
  ) {
    throw new ApplicationValidationError(
      'Submission status and submittedAt must agree',
    );
  }
}

/** Strict TypeBox/Ajv validation followed by cross-entity invariants. */
export function validateApplicationState(value: unknown): ApplicationState {
  if (!validateSchema(value))
    throw new ApplicationValidationError(schemaErrorMessage());
  const state = value as ApplicationState;
  validateCrossFieldInvariants(state);
  return state;
}

/** Unicode-aware trim/collapse that retains display casing. */
export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

/** Locale-independent key for exact natural-name comparison. */
export function normalizePersonName(value: string): string {
  return normalizeDisplayName(value).toLowerCase();
}

/** Fixed synthetic seed: no generated IDs and no clock access. */
export function createDemoApplicationSeed(): ApplicationState {
  return validateApplicationState({
    schemaVersion: 1,
    applicationId: 'civicflow-synthetic-demo',
    revision: 0,
    applicant: {
      id: 'person-maya-carter',
      firstName: 'Maya',
      lastName: 'Carter',
      ageYears: 34,
      relationship: 'self',
      applyingForCoverage: true,
      email: 'maya.carter@example.invalid',
      phone: '+1-555-0100',
      addressLine1: '100 Demo Avenue',
      city: 'Demo City',
      state: 'MA',
      postalCode: '00000',
    },
    householdConfirmed: false,
    householdMembers: [],
    noIncomeConfirmed: false,
    incomeSources: [],
    coverageRecords: [],
    documents: [],
    attestation: { accepted: false, acceptedAt: null },
    submission: { status: 'not_submitted', submittedAt: null },
  });
}

export const PERSON_NOT_FOUND = 'PERSON_NOT_FOUND';
export const PERSON_AMBIGUOUS = 'PERSON_AMBIGUOUS';

export class PersonResolutionError extends Error {
  constructor(
    readonly code: typeof PERSON_NOT_FOUND | typeof PERSON_AMBIGUOUS,
    message: string,
  ) {
    super(code + ': ' + message);
    this.name = 'PersonResolutionError';
  }
}

export function getApplicantAndHouseholdPeople(
  state: ApplicationState,
): readonly [ApplicantProfile, ...Person[]] {
  return [state.applicant, ...state.householdMembers];
}

export function findPersonById(
  state: ApplicationState,
  personId: string,
): Person | ApplicantProfile {
  const matches = getApplicantAndHouseholdPeople(state).filter(
    (person) => person.id === personId,
  );
  if (matches.length === 0)
    throw new PersonResolutionError(
      PERSON_NOT_FOUND,
      'no person exists for id ' + personId,
    );
  if (matches.length > 1)
    throw new PersonResolutionError(
      PERSON_AMBIGUOUS,
      'more than one person uses id ' + personId,
    );
  return matches[0];
}

/** Resolves exact IDs first, then exact normalized full natural names. */
export function resolvePerson(
  state: ApplicationState,
  query: string,
): Person | ApplicantProfile {
  const people = getApplicantAndHouseholdPeople(state);
  const byId = people.filter((person) => person.id === query);
  if (byId.length === 1) return byId[0];
  if (byId.length > 1)
    throw new PersonResolutionError(
      PERSON_AMBIGUOUS,
      'more than one person uses id ' + query,
    );
  const normalizedQuery = normalizePersonName(query);
  const matches = people.filter(
    (person) =>
      normalizePersonName(person.firstName + ' ' + person.lastName) ===
      normalizedQuery,
  );
  if (matches.length === 0)
    throw new PersonResolutionError(
      PERSON_NOT_FOUND,
      'no person matches ' + normalizedQuery,
    );
  if (matches.length > 1)
    throw new PersonResolutionError(
      PERSON_AMBIGUOUS,
      'more than one person matches ' + normalizedQuery,
    );
  return matches[0];
}

function personLabel(person: Person | ApplicantProfile): string {
  return normalizeDisplayName(person.firstName + ' ' + person.lastName);
}

function isAboutComplete(state: ApplicationState): boolean {
  const applicant = state.applicant;
  return (
    applicant.relationship === 'self' &&
    applicant.applyingForCoverage &&
    normalizeDisplayName(applicant.firstName).length > 0 &&
    normalizeDisplayName(applicant.lastName).length > 0 &&
    applicant.ageYears >= 0 &&
    applicant.email.length > 0 &&
    applicant.phone.length > 0 &&
    applicant.addressLine1.length > 0 &&
    applicant.city.length > 0 &&
    applicant.state === 'MA' &&
    applicant.postalCode.length > 0
  );
}

function isHouseholdComplete(state: ApplicationState): boolean {
  const members = state.householdMembers;
  return (
    state.householdConfirmed &&
    members.length <= ENTITY_CAPS.householdMembers &&
    members.every(
      (member) =>
        member.relationship !== 'self' &&
        member.id !== state.applicant.id &&
        normalizeDisplayName(member.firstName).length > 0 &&
        normalizeDisplayName(member.lastName).length > 0,
    ) &&
    new Set(members.map((member) => member.id)).size === members.length
  );
}

function isIncomeComplete(state: ApplicationState): boolean {
  return (
    state.incomeSources.length > 0 ||
    (state.incomeSources.length === 0 && state.noIncomeConfirmed)
  );
}

function isCoverageComplete(state: ApplicationState): boolean {
  const applyingPeople = getApplicantAndHouseholdPeople(state).filter(
    (person) => person.applyingForCoverage,
  );
  return (
    applyingPeople.length > 0 &&
    applyingPeople.every((person) =>
      state.coverageRecords.some(
        (record) =>
          record.personId === person.id &&
          (record.status === 'none' ||
            (record.status === 'covered' && Boolean(record.providerName))),
      ),
    )
  );
}

function isDocumentsComplete(state: ApplicationState): boolean {
  if (state.incomeSources.length === 0) return state.noIncomeConfirmed;
  return state.documents.some(
    (document) =>
      document.kind === 'proof_of_income' &&
      document.status === 'attached_demo',
  );
}

export type ReviewIssueCode =
  | 'ABOUT_INCOMPLETE'
  | 'HOUSEHOLD_UNCONFIRMED'
  | 'INCOME_MISSING'
  | 'COVERAGE_UNCONFIRMED'
  | 'PROOF_OF_INCOME_MISSING'
  | 'ATTESTATION_REQUIRED';
export interface ReviewIssue {
  code: ReviewIssueCode;
  severity: 'blocking';
  section: SectionId;
  message: string;
  entityLabel?: string;
}

function issue(
  code: ReviewIssueCode,
  section: SectionId,
  message: string,
  entityLabel?: string,
): ReviewIssue {
  return { code, severity: 'blocking', section, message, entityLabel };
}

/** Returns all blockers in stable section order without validation or mutation. */
export function getReviewIssues(state: ApplicationState): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!isAboutComplete(state))
    issues.push(
      issue('ABOUT_INCOMPLETE', 'about', 'Complete the applicant details.'),
    );
  if (!isHouseholdComplete(state))
    issues.push(
      issue(
        'HOUSEHOLD_UNCONFIRMED',
        'household',
        'Confirm the recorded household members.',
      ),
    );
  if (!isIncomeComplete(state))
    issues.push(
      issue(
        'INCOME_MISSING',
        'income',
        'Add an income source or confirm no income.',
      ),
    );
  const applyingWithoutCoverage = getApplicantAndHouseholdPeople(state).find(
    (person) =>
      person.applyingForCoverage &&
      !state.coverageRecords.some((record) => record.personId === person.id),
  );
  if (!isCoverageComplete(state)) {
    issues.push(
      issue(
        'COVERAGE_UNCONFIRMED',
        'coverage',
        'Record coverage status for every person applying for coverage.',
        applyingWithoutCoverage
          ? personLabel(applyingWithoutCoverage)
          : undefined,
      ),
    );
  }
  if (state.incomeSources.length > 0 && !isDocumentsComplete(state)) {
    issues.push(
      issue(
        'PROOF_OF_INCOME_MISSING',
        'documents',
        'Attach demo proof of income.',
      ),
    );
  }
  if (!state.attestation.accepted || state.attestation.acceptedAt === null) {
    issues.push(
      issue(
        'ATTESTATION_REQUIRED',
        'review',
        'Accept the demo attestation before submission.',
      ),
    );
  }
  return issues;
}

export interface SectionProgress {
  id: SectionId;
  weight: number;
  complete: boolean;
}
export interface ApplicationProgress {
  percent: number;
  sections: SectionProgress[];
  completedSections: SectionId[];
  nextSection: SectionId | null;
  stateRevision: number;
}

const SECTION_WEIGHTS: Readonly<Record<SectionId, number>> = {
  about: 20,
  household: 20,
  income: 20,
  coverage: 15,
  documents: 10,
  review: 15,
};

export function getApplicationProgress(
  state: ApplicationState,
): ApplicationProgress {
  const dataSections: SectionProgress[] = [
    {
      id: 'about',
      weight: SECTION_WEIGHTS.about,
      complete: isAboutComplete(state),
    },
    {
      id: 'household',
      weight: SECTION_WEIGHTS.household,
      complete: isHouseholdComplete(state),
    },
    {
      id: 'income',
      weight: SECTION_WEIGHTS.income,
      complete: isIncomeComplete(state),
    },
    {
      id: 'coverage',
      weight: SECTION_WEIGHTS.coverage,
      complete: isCoverageComplete(state),
    },
    {
      id: 'documents',
      weight: SECTION_WEIGHTS.documents,
      complete: isDocumentsComplete(state),
    },
  ];
  const reviewComplete =
    dataSections.every((section) => section.complete) &&
    state.attestation.accepted &&
    state.attestation.acceptedAt !== null;
  const sections: SectionProgress[] = [
    ...dataSections,
    {
      id: 'review',
      weight: SECTION_WEIGHTS.review,
      complete: reviewComplete,
    },
  ];
  const completedSections = sections
    .filter((section) => section.complete)
    .map((section) => section.id);
  return {
    percent: sections.reduce(
      (total, section) => total + (section.complete ? section.weight : 0),
      0,
    ),
    sections,
    completedSections,
    nextSection: sections.find((section) => !section.complete)?.id ?? null,
    stateRevision: state.revision,
  };
}

export function canSubmitDemo(state: ApplicationState): boolean {
  return (
    state.submission.status === 'not_submitted' &&
    state.attestation.accepted &&
    state.attestation.acceptedAt !== null &&
    getReviewIssues(state).length === 0
  );
}
