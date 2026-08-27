import {
  ENTITY_CAPS,
  MAX_INCOME_CENTS,
  INCOME_FREQUENCIES,
  RELATIONSHIPS,
  type ApplicationState,
  type CoverageRecord,
  type DemoDocument,
  type IncomeSource,
  type Person,
  createDemoApplicationSeed,
  getApplicantAndHouseholdPeople,
  normalizeDisplayName,
  normalizePersonName,
  canSubmitDemo,
  validateApplicationState,
} from '../domain';
import type {
  AddHouseholdMemberInput,
  AddIncomeSourceInput,
  AttachDemoDocumentInput,
  CommandContext,
  CommandErrorCode,
  CommandResult,
  ChangedEntitySummary,
  SetAttestationInput,
  SetCurrentCoverageInput,
  UpdateHouseholdMemberInput,
  UpdateApplicantInput,
  UpdateIncomeSourceInput,
} from './command-types';

export type {
  AddHouseholdMemberInput,
  AddIncomeSourceInput,
  AttachDemoDocumentInput,
  CommandContext,
  CommandErrorCode,
  ChangedEntityKind,
  ChangedEntitySummary,
  CommandReceipt,
  CommandResult,
  CommandSuccessReceipt,
  SetAttestationInput,
  SetCurrentCoverageInput,
  UpdateHouseholdMemberInput,
  UpdateApplicantInput,
  UpdateIncomeSourceInput,
} from './command-types';

class CommandInputError extends Error {
  constructor(
    readonly code: CommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CommandInputError';
  }
}

function failure(
  state: ApplicationState,
  actionId: string,
  code: CommandErrorCode,
  message: string,
): CommandResult<ApplicationState> {
  return {
    nextState: state,
    receipt: {
      kind: 'failure',
      code,
      actionId,
      changed: false,
      stateRevision: state.revision,
      message,
      changedEntities: [],
    },
  };
}

function entitySummary(
  kind: ChangedEntitySummary['kind'],
  id: string,
  label: string,
): ChangedEntitySummary {
  return { kind, id, label };
}

function changedIds<T extends { id: string }>(
  previous: readonly T[],
  next: readonly T[],
): Set<string> {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  return new Set(
    next
      .filter(
        (item) =>
          JSON.stringify(previousById.get(item.id)) !== JSON.stringify(item),
      )
      .map((item) => item.id),
  );
}

function summarizeChangedEntities(
  previous: ApplicationState,
  next: ApplicationState,
): ChangedEntitySummary[] {
  const summaries: ChangedEntitySummary[] = [];
  if (JSON.stringify(previous.applicant) !== JSON.stringify(next.applicant)) {
    summaries.push(
      entitySummary(
        'applicant',
        next.applicant.id,
        next.applicant.firstName + ' ' + next.applicant.lastName,
      ),
    );
  }
  const changedMembers = changedIds(
    previous.householdMembers,
    next.householdMembers,
  );
  for (const member of next.householdMembers) {
    if (changedMembers.has(member.id)) {
      summaries.push(
        entitySummary(
          'household_member',
          member.id,
          member.firstName + ' ' + member.lastName,
        ),
      );
    }
  }
  const changedIncome = changedIds(previous.incomeSources, next.incomeSources);
  for (const income of next.incomeSources) {
    if (changedIncome.has(income.id)) {
      summaries.push(
        entitySummary('income_source', income.id, income.employerName),
      );
    }
  }
  const previousCoverage = new Map(
    previous.coverageRecords.map((record) => [record.personId, record]),
  );
  for (const coverage of next.coverageRecords) {
    if (
      JSON.stringify(previousCoverage.get(coverage.personId)) !==
      JSON.stringify(coverage)
    ) {
      summaries.push(
        entitySummary(
          'coverage_record',
          coverage.personId,
          coverage.personId + ' coverage',
        ),
      );
    }
  }
  const changedDocuments = changedIds(previous.documents, next.documents);
  for (const document of next.documents) {
    if (changedDocuments.has(document.id)) {
      summaries.push(
        entitySummary('document', document.id, document.displayName),
      );
    }
  }
  if (
    JSON.stringify(previous.attestation) !== JSON.stringify(next.attestation)
  ) {
    summaries.push(entitySummary('attestation', 'attestation', 'Attestation'));
  }
  if (JSON.stringify(previous.submission) !== JSON.stringify(next.submission)) {
    summaries.push(
      entitySummary('submission', 'submission', 'Demo submission'),
    );
  }
  if (previous.householdConfirmed !== next.householdConfirmed) {
    summaries.push(
      entitySummary('application', next.applicationId, 'Household confirmed'),
    );
  }
  if (previous.noIncomeConfirmed !== next.noIncomeConfirmed) {
    summaries.push(
      entitySummary('application', next.applicationId, 'No income confirmed'),
    );
  }
  return summaries;
}

function success(
  state: ApplicationState,
  actionId: string,
  changed: boolean,
  previousState: ApplicationState = state,
): CommandResult<ApplicationState> {
  return {
    nextState: state,
    receipt: {
      kind: 'success',
      code: 'OK',
      actionId,
      changed,
      stateRevision: state.revision,
      message: changed
        ? 'Application updated successfully.'
        : 'No changes were needed.',
      changedEntities: changed
        ? summarizeChangedEntities(previousState, state)
        : [],
    },
  };
}

function errorCode(error: unknown): CommandErrorCode {
  if (error instanceof CommandInputError) return error.code;
  return 'VALIDATION_ERROR';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Command validation failed';
}

function isLocked(state: ApplicationState): boolean {
  return state.submission.status === 'submitted_demo';
}

/**
 * All ordinary commands use this shared transition path: action IDs are
 * generated before validation, no-op identity is retained, and only changed
 * valid states receive exactly one revision increment.
 */
function ordinaryCommand(
  state: ApplicationState,
  ctx: CommandContext,
  transition: () => ApplicationState | null,
): CommandResult<ApplicationState> {
  const actionId = ctx.newId();
  if (isLocked(state)) {
    return failure(
      state,
      actionId,
      'APPLICATION_LOCKED',
      'The submitted demo is locked. Reset it before making changes.',
    );
  }
  try {
    const candidate = transition();
    if (candidate === null) return success(state, actionId, false);
    const nextState = validateApplicationState({
      ...candidate,
      revision: state.revision + 1,
    });
    return success(nextState, actionId, true, state);
  } catch (error) {
    return failure(state, actionId, errorCode(error), errorMessage(error));
  }
}

function ensureRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      label + ' must be an object',
    );
  }
  return value as Record<string, unknown>;
}

function ensureNonBlank(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      label + ' must be a string',
    );
  }
  const normalized = normalizeDisplayName(value);
  if (normalized.length === 0) {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      label + ' must not be blank',
    );
  }
  return normalized;
}

function ensureInteger(value: unknown, label: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      label + ' must be a non-negative integer',
    );
  }
  return value;
}

function ensureBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      label + ' must be a boolean',
    );
  }
  return value;
}

function ensureKnownPerson(state: ApplicationState, personId: unknown): string {
  if (typeof personId !== 'string') {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      'personId must be a string',
    );
  }
  if (
    !getApplicantAndHouseholdPeople(state).some(
      (person) => person.id === personId,
    )
  ) {
    throw new CommandInputError(
      'PERSON_NOT_FOUND',
      'The requested person was not found',
    );
  }
  return personId;
}

function memberKey(
  member: Pick<
    Person,
    | 'firstName'
    | 'lastName'
    | 'relationship'
    | 'ageYears'
    | 'applyingForCoverage'
  >,
): string {
  return [
    normalizePersonName(member.firstName),
    normalizePersonName(member.lastName),
    member.relationship,
    member.ageYears,
    member.applyingForCoverage,
  ].join('|');
}

function normalizeMember(input: Omit<Person, 'id'>): Omit<Person, 'id'> {
  const relationship = input.relationship;
  if (!RELATIONSHIPS.includes(relationship) || relationship === 'self') {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      'Household relationship must not be self',
    );
  }
  const ageYears = ensureInteger(input.ageYears, 'ageYears');
  if (ageYears > 130) {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      'ageYears is outside allowed bounds',
    );
  }
  return {
    firstName: ensureNonBlank(input.firstName, 'firstName'),
    lastName: ensureNonBlank(input.lastName, 'lastName'),
    ageYears,
    relationship,
    applyingForCoverage: ensureBoolean(
      input.applyingForCoverage,
      'applyingForCoverage',
    ),
  };
}

function sameCoverage(
  left: readonly CoverageRecord[],
  right: readonly CoverageRecord[],
): boolean {
  if (left.length !== right.length) return false;
  const byPersonId = new Map(left.map((record) => [record.personId, record]));
  return right.every(
    (record) =>
      JSON.stringify(byPersonId.get(record.personId)) ===
      JSON.stringify(record),
  );
}

function sameDocument(
  document: DemoDocument,
  kind: AttachDemoDocumentInput['kind'],
  displayName: string,
): boolean {
  return (
    document.kind === kind &&
    normalizePersonName(document.displayName) ===
      normalizePersonName(displayName)
  );
}

/** Updates only editable synthetic applicant fields; identity, state, and self relationship stay fixed. */
export function updateApplicant(
  state: ApplicationState,
  input: UpdateApplicantInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    const changes = ensureRecord(input.changes, 'changes');
    const allowed = new Set([
      'firstName',
      'lastName',
      'ageYears',
      'applyingForCoverage',
      'email',
      'phone',
      'addressLine1',
      'city',
      'postalCode',
    ]);
    if (
      Object.keys(changes).length === 0 ||
      Object.keys(changes).some((key) => !allowed.has(key))
    ) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'changes must be non-empty and contain only editable applicant fields',
      );
    }
    const source = { ...state.applicant, ...changes };
    const ageYears = ensureInteger(source.ageYears, 'ageYears');
    if (ageYears > 130) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'ageYears is outside allowed bounds',
      );
    }
    const applicant = {
      ...state.applicant,
      firstName: ensureNonBlank(source.firstName, 'firstName'),
      lastName: ensureNonBlank(source.lastName, 'lastName'),
      ageYears,
      applyingForCoverage: ensureBoolean(
        source.applyingForCoverage,
        'applyingForCoverage',
      ),
      email: ensureNonBlank(source.email, 'email'),
      phone: ensureNonBlank(source.phone, 'phone'),
      addressLine1: ensureNonBlank(source.addressLine1, 'addressLine1'),
      city: ensureNonBlank(source.city, 'city'),
      postalCode: ensureNonBlank(source.postalCode, 'postalCode'),
    };
    if (JSON.stringify(applicant) === JSON.stringify(state.applicant)) {
      return null;
    }
    return { ...state, applicant };
  });
}

/** Records an explicit confirmation when no additional household members exist. */
export function confirmHousehold(
  state: ApplicationState,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () =>
    state.householdConfirmed ? null : { ...state, householdConfirmed: true },
  );
}

/** The no-income branch is human-only and cannot coexist with recorded income. */
export function confirmNoIncome(
  state: ApplicationState,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    if (ctx.source !== 'human') {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'No-income confirmation is available only in the human UI',
      );
    }
    if (state.incomeSources.length > 0) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'No-income confirmation requires no recorded income sources',
      );
    }
    return state.noIncomeConfirmed
      ? null
      : { ...state, noIncomeConfirmed: true };
  });
}

export function addHouseholdMember(
  state: ApplicationState,
  input: AddHouseholdMemberInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    const member = normalizeMember(input);
    const key = memberKey(member);
    if (
      state.householdMembers.some((existing) => memberKey(existing) === key)
    ) {
      return null;
    }
    if (state.householdMembers.length >= ENTITY_CAPS.householdMembers) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'Household member limit reached',
      );
    }
    return {
      ...state,
      householdConfirmed: true,
      householdMembers: [
        ...state.householdMembers,
        { id: ctx.newId(), ...member },
      ],
    };
  });
}

export function updateHouseholdMember(
  state: ApplicationState,
  input: UpdateHouseholdMemberInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    const changes = ensureRecord(input.changes, 'changes');
    const allowed = new Set([
      'firstName',
      'lastName',
      'ageYears',
      'relationship',
      'applyingForCoverage',
    ]);
    if (
      Object.keys(changes).length === 0 ||
      Object.keys(changes).some((key) => !allowed.has(key))
    ) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'changes must be non-empty and supported',
      );
    }
    if (input.personId === state.applicant.id) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'The applicant cannot be updated as a household member',
      );
    }
    const index = state.householdMembers.findIndex(
      (member) => member.id === input.personId,
    );
    if (index < 0) {
      throw new CommandInputError(
        'PERSON_NOT_FOUND',
        'The household member was not found',
      );
    }
    const existing = state.householdMembers[index];
    const candidate = normalizeMember({ ...existing, ...changes });
    const nextMember: Person = { id: existing.id, ...candidate };
    if (
      state.householdMembers.every(
        (member, memberIndex) =>
          memberIndex === index || memberKey(member) !== memberKey(nextMember),
      )
    ) {
      if (
        memberKey(existing) === memberKey(nextMember) &&
        state.householdConfirmed
      )
        return null;
      const householdMembers = state.householdMembers.map(
        (member, memberIndex) => (memberIndex === index ? nextMember : member),
      );
      return { ...state, householdConfirmed: true, householdMembers };
    }
    throw new CommandInputError(
      'DUPLICATE_MEMBER',
      'The update would duplicate an existing household member',
    );
  });
}

function normalizeIncome(
  state: ApplicationState,
  input: AddIncomeSourceInput,
): Omit<IncomeSource, 'id'> {
  const ownerPersonId = ensureKnownPerson(state, input.ownerPersonId);
  const amountCents = ensureInteger(input.amountCents, 'amountCents');
  if (amountCents > MAX_INCOME_CENTS) {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      'amountCents is outside allowed bounds',
    );
  }
  if (!INCOME_FREQUENCIES.includes(input.frequency)) {
    throw new CommandInputError('VALIDATION_ERROR', 'frequency is invalid');
  }
  if (input.currency !== 'USD') {
    throw new CommandInputError('VALIDATION_ERROR', 'currency must be USD');
  }
  return {
    ownerPersonId,
    employerName: ensureNonBlank(input.employerName, 'employerName'),
    amountCents,
    frequency: input.frequency,
    currency: 'USD',
  };
}

function incomeKey(
  income: Pick<
    IncomeSource,
    'ownerPersonId' | 'employerName' | 'amountCents' | 'frequency'
  >,
): string {
  return [
    income.ownerPersonId,
    normalizePersonName(income.employerName),
    income.amountCents,
    income.frequency,
  ].join('|');
}

export function addIncomeSource(
  state: ApplicationState,
  input: AddIncomeSourceInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    const income = normalizeIncome(state, input);
    if (
      state.incomeSources.some(
        (existing) => incomeKey(existing) === incomeKey(income),
      )
    ) {
      return null;
    }
    if (state.incomeSources.length >= ENTITY_CAPS.incomeSources) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'Income source limit reached',
      );
    }
    return {
      ...state,
      noIncomeConfirmed: false,
      incomeSources: [...state.incomeSources, { id: ctx.newId(), ...income }],
    };
  });
}

export function updateIncomeSource(
  state: ApplicationState,
  input: UpdateIncomeSourceInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    const changes = ensureRecord(input.changes, 'changes');
    const allowed = new Set([
      'ownerPersonId',
      'employerName',
      'amountCents',
      'frequency',
      'currency',
    ]);
    if (
      Object.keys(changes).length === 0 ||
      Object.keys(changes).some((key) => !allowed.has(key))
    ) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'changes must be non-empty and supported',
      );
    }
    const index = state.incomeSources.findIndex(
      (income) => income.id === input.incomeSourceId,
    );
    if (index < 0) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'The income source was not found',
      );
    }
    const existing = state.incomeSources[index];
    const normalized = normalizeIncome(state, { ...existing, ...changes });
    const nextIncome: IncomeSource = { id: existing.id, ...normalized };
    if (
      state.incomeSources.some(
        (income, incomeIndex) =>
          incomeIndex !== index && incomeKey(income) === incomeKey(nextIncome),
      )
    ) {
      throw new CommandInputError(
        'DUPLICATE_INCOME',
        'The update would duplicate an existing income source',
      );
    }
    if (JSON.stringify(existing) === JSON.stringify(nextIncome)) return null;
    return {
      ...state,
      incomeSources: state.incomeSources.map((income, incomeIndex) =>
        incomeIndex === index ? nextIncome : income,
      ),
    };
  });
}

function normalizeCoverageRecord(
  state: ApplicationState,
  record: SetCurrentCoverageInput['records'][number],
): CoverageRecord {
  const personId = ensureKnownPerson(state, record.personId);
  if (record.status !== 'none' && record.status !== 'covered') {
    throw new CommandInputError(
      'VALIDATION_ERROR',
      'coverage status is invalid',
    );
  }
  if (record.status === 'none') return { personId, status: 'none' };
  const providerName = ensureNonBlank(record.providerName, 'providerName');
  const planName =
    record.planName === undefined
      ? undefined
      : ensureNonBlank(record.planName, 'planName');
  return planName === undefined
    ? { personId, status: 'covered', providerName }
    : { personId, status: 'covered', providerName, planName };
}

export function setCurrentCoverage(
  state: ApplicationState,
  input: SetCurrentCoverageInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    if (!Array.isArray(input.records) || input.records.length === 0) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'records must be non-empty',
      );
    }
    if (input.records.length > ENTITY_CAPS.coverageRecords) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'Coverage record limit reached',
      );
    }
    const records = input.records.map((record) =>
      normalizeCoverageRecord(state, record),
    );
    if (
      new Set(records.map((record) => record.personId)).size !== records.length
    ) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'coverage person IDs must be unique',
      );
    }
    const requestedByPersonId = new Map(
      records.map((record) => [record.personId, record]),
    );
    const existingPersonIds = new Set(
      state.coverageRecords.map((record) => record.personId),
    );
    const coverageRecords = [
      ...state.coverageRecords.map(
        (record) => requestedByPersonId.get(record.personId) ?? record,
      ),
      ...records.filter((record) => !existingPersonIds.has(record.personId)),
    ];
    if (sameCoverage(state.coverageRecords, coverageRecords)) return null;
    return { ...state, coverageRecords };
  });
}

export function attachDemoDocument(
  state: ApplicationState,
  input: AttachDemoDocumentInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    if (
      !['proof_of_income', 'identity', 'coverage', 'other'].includes(input.kind)
    ) {
      throw new CommandInputError(
        'VALIDATION_ERROR',
        'document kind is invalid',
      );
    }
    const displayName = ensureNonBlank(input.displayName, 'displayName');
    if (
      state.documents.some((document) =>
        sameDocument(document, input.kind, displayName),
      )
    ) {
      return null;
    }
    if (state.documents.length >= ENTITY_CAPS.documents) {
      throw new CommandInputError('VALIDATION_ERROR', 'Document limit reached');
    }
    return {
      ...state,
      documents: [
        ...state.documents,
        {
          id: ctx.newId(),
          kind: input.kind,
          displayName,
          status: 'attached_demo',
          addedAt: ctx.now().toISOString(),
        },
      ],
    };
  });
}

export function setAttestation(
  state: ApplicationState,
  input: SetAttestationInput,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    const accepted = ensureBoolean(input.accepted, 'accepted');
    if (state.attestation.accepted === accepted) return null;
    return {
      ...state,
      attestation: {
        accepted,
        acceptedAt: accepted ? ctx.now().toISOString() : null,
      },
    };
  });
}

export function submitDemo(
  state: ApplicationState,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  return ordinaryCommand(state, ctx, () => {
    if (!canSubmitDemo(state)) {
      throw new CommandInputError(
        'REVIEW_BLOCKED',
        'Resolve all blocking review issues before submitting.',
      );
    }
    return {
      ...state,
      submission: {
        status: 'submitted_demo',
        submittedAt: ctx.now().toISOString(),
      },
    };
  });
}

/** The deterministic reset is intentionally the sole transition allowed after submission. */
export function resetDemo(
  state: ApplicationState,
  ctx: CommandContext,
): CommandResult<ApplicationState> {
  const actionId = ctx.newId();
  const seed = createDemoApplicationSeed();
  if (JSON.stringify(state) === JSON.stringify(seed))
    return success(state, actionId, false);
  return success(seed, actionId, true, state);
}
