import { describe, expect, it } from 'vitest';

import {
  addHouseholdMember,
  addIncomeSource,
  attachDemoDocument,
  resetDemo,
  confirmHousehold,
  confirmNoIncome,
  setAttestation,
  setCurrentCoverage,
  submitDemo,
  updateHouseholdMember,
  updateApplicant,
  updateIncomeSource,
} from './commands';
import { createDemoApplicationSeed } from '../domain';

function context(...ids: string[]) {
  let index = 0;
  return {
    source: 'human' as const,
    now: () => new Date('2026-08-27T00:00:00.000Z'),
    newId: () => ids[index++] ?? 'generated-id-' + index,
  };
}

const ari = {
  firstName: '  Ari ',
  lastName: ' Carter  ',
  ageYears: 8,
  relationship: 'child' as const,
  applyingForCoverage: true,
};

describe('pure command transitions and receipts', () => {
  it('updates only editable applicant fields and confirms household or human no-income choices', () => {
    const seed = createDemoApplicationSeed();
    const applicant = updateApplicant(
      seed,
      { changes: { firstName: '  MAYA ', city: '  Demo City  ' } },
      context('action-applicant'),
    );
    expect(applicant.receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 1,
      message: expect.any(String),
      changedEntities: [
        expect.objectContaining({
          kind: 'applicant',
          id: 'person-maya-carter',
        }),
      ],
    });
    expect(applicant.nextState.applicant).toMatchObject({
      firstName: 'MAYA',
      city: 'Demo City',
      state: 'MA',
      relationship: 'self',
    });
    expect(
      updateApplicant(
        applicant.nextState,
        { changes: { state: 'CA' } as never },
        context('action-applicant-immutable'),
      ).receipt,
    ).toMatchObject({
      kind: 'failure',
      code: 'VALIDATION_ERROR',
      changedEntities: [],
    });

    const household = confirmHousehold(seed, context('action-household'));
    expect(household).toMatchObject({
      nextState: { householdConfirmed: true, revision: 1 },
      receipt: {
        kind: 'success',
        changed: true,
        changedEntities: [expect.objectContaining({ kind: 'application' })],
      },
    });
    expect(
      confirmHousehold(household.nextState, context('action-household-noop'))
        .receipt,
    ).toMatchObject({ kind: 'success', changed: false, changedEntities: [] });

    const noIncome = confirmNoIncome(seed, context('action-no-income'));
    expect(noIncome).toMatchObject({
      nextState: { noIncomeConfirmed: true, revision: 1 },
    });
    expect(
      confirmNoIncome(
        {
          ...seed,
          incomeSources: [
            {
              id: 'income-demo',
              ownerPersonId: seed.applicant.id,
              employerName: 'Demo Work',
              amountCents: 1,
              frequency: 'monthly',
              currency: 'USD',
            },
          ],
        },
        context('action-no-income-invalid'),
      ).receipt,
    ).toMatchObject({
      kind: 'failure',
      code: 'VALIDATION_ERROR',
      changed: false,
    });
    expect(
      confirmNoIncome(seed, {
        ...context('action-no-income-webmcp'),
        source: 'webmcp',
      }).receipt,
    ).toMatchObject({ kind: 'failure', code: 'VALIDATION_ERROR' });
  });

  it('adds a normalized household member, increments revision once, and is idempotent', () => {
    const seed = createDemoApplicationSeed();
    const first = addHouseholdMember(
      seed,
      ari,
      context('action-add-member', 'person-ari-carter'),
    );

    expect(first.receipt).toMatchObject({
      kind: 'success',
      actionId: 'action-add-member',
      changed: true,
      stateRevision: 1,
    });
    expect(first.nextState).toMatchObject({
      revision: 1,
      householdConfirmed: true,
      householdMembers: [
        expect.objectContaining({
          id: 'person-ari-carter',
          firstName: 'Ari',
          lastName: 'Carter',
        }),
      ],
    });
    expect(seed.householdMembers).toEqual([]);

    const duplicate = addHouseholdMember(
      first.nextState,
      ari,
      context('action-duplicate'),
    );
    expect(duplicate.receipt).toMatchObject({
      kind: 'success',
      changed: false,
      stateRevision: 1,
    });
    expect(duplicate.nextState).toBe(first.nextState);
  });

  it('updates household members atomically and rejects self, empty, and duplicate updates', () => {
    const added = addHouseholdMember(
      createDemoApplicationSeed(),
      ari,
      context('action-add', 'person-ari'),
    );
    const changed = updateHouseholdMember(
      added.nextState,
      { personId: 'person-ari', changes: { firstName: ' Arielle ' } },
      context('action-update'),
    );
    expect(changed.receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 2,
    });
    expect(changed.nextState.householdMembers[0].firstName).toBe('Arielle');

    const failures = [
      updateHouseholdMember(
        changed.nextState,
        { personId: 'person-maya-carter', changes: { firstName: 'Nope' } },
        context('action-self'),
      ),
      updateHouseholdMember(
        changed.nextState,
        { personId: 'person-ari', changes: {} },
        context('action-empty'),
      ),
    ];
    for (const result of failures) {
      expect(result.receipt).toMatchObject({
        kind: 'failure',
        changed: false,
        stateRevision: 2,
        code: 'VALIDATION_ERROR',
      });
      expect(result.nextState).toBe(changed.nextState);
    }
  });

  it('adds and updates income idempotently, clears no-income confirmation, and retains atomic state on invalid owner', () => {
    const seed = { ...createDemoApplicationSeed(), noIncomeConfirmed: true };
    const first = addIncomeSource(
      seed,
      {
        ownerPersonId: seed.applicant.id,
        employerName: '  Demo Work ',
        amountCents: 500_00,
        frequency: 'monthly',
        currency: 'USD',
      },
      context('action-income', 'income-demo-work'),
    );
    expect(first.receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 1,
    });
    expect(first.nextState).toMatchObject({
      noIncomeConfirmed: false,
      incomeSources: [expect.objectContaining({ employerName: 'Demo Work' })],
    });

    const duplicate = addIncomeSource(
      first.nextState,
      {
        ownerPersonId: seed.applicant.id,
        employerName: 'demo   work',
        amountCents: 500_00,
        frequency: 'monthly',
        currency: 'USD',
      },
      context('action-income-duplicate'),
    );
    expect(duplicate.receipt).toMatchObject({
      kind: 'success',
      changed: false,
      stateRevision: 1,
    });

    const failure = updateIncomeSource(
      first.nextState,
      {
        incomeSourceId: 'income-demo-work',
        changes: { ownerPersonId: 'person-missing' },
      },
      context('action-income-invalid'),
    );
    expect(failure.receipt).toMatchObject({
      kind: 'failure',
      code: 'PERSON_NOT_FOUND',
      changed: false,
      stateRevision: 1,
    });
    expect(failure.nextState).toBe(first.nextState);
  });

  it('enforces income-cents and metadata-only document display-name boundaries', () => {
    const seed = createDemoApplicationSeed();
    const maximumIncome = addIncomeSource(
      seed,
      {
        ownerPersonId: seed.applicant.id,
        employerName: 'Demo Work',
        amountCents: 1_000_000_000,
        frequency: 'annual',
        currency: 'USD',
      },
      context('action-income-limit', 'income-limit'),
    );
    expect(maximumIncome.receipt).toMatchObject({
      kind: 'success',
      changed: true,
    });
    expect(
      addIncomeSource(
        seed,
        {
          ownerPersonId: seed.applicant.id,
          employerName: 'Demo Work',
          amountCents: 1_000_000_001,
          frequency: 'annual',
          currency: 'USD',
        },
        context('action-income-over-limit'),
      ).receipt,
    ).toMatchObject({ kind: 'failure', code: 'VALIDATION_ERROR' });

    expect(
      attachDemoDocument(
        seed,
        { kind: 'other', displayName: 'a'.repeat(120) },
        context('action-document-limit', 'document-limit'),
      ).receipt,
    ).toMatchObject({ kind: 'success', changed: true });
    expect(
      attachDemoDocument(
        seed,
        { kind: 'other', displayName: 'a'.repeat(121) },
        context('action-document-over-limit'),
      ).receipt,
    ).toMatchObject({ kind: 'failure', code: 'VALIDATION_ERROR' });
  });

  it('upserts coverage atomically and clears none provider metadata', () => {
    const seed = createDemoApplicationSeed();
    const covered = setCurrentCoverage(
      seed,
      {
        records: [
          {
            personId: seed.applicant.id,
            status: 'covered',
            providerName: 'Demo Plan',
            planName: 'Gold',
          },
        ],
      },
      context('action-covered'),
    );
    expect(covered.receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 1,
    });
    expect(covered.nextState.coverageRecords[0]).toMatchObject({
      status: 'covered',
      providerName: 'Demo Plan',
    });

    const none = setCurrentCoverage(
      covered.nextState,
      {
        records: [{ personId: seed.applicant.id, status: 'none' }],
      },
      context('action-none'),
    );
    expect(none.nextState.coverageRecords[0]).toEqual({
      personId: seed.applicant.id,
      status: 'none',
    });

    const invalid = setCurrentCoverage(
      none.nextState,
      {
        records: [{ personId: seed.applicant.id, status: 'covered' }],
      },
      context('action-invalid-coverage'),
    );
    expect(invalid.receipt).toMatchObject({
      kind: 'failure',
      code: 'VALIDATION_ERROR',
      changed: false,
      stateRevision: 2,
    });
    expect(invalid.nextState).toBe(none.nextState);
  });

  it('preserves existing coverage order and treats reordered identical records as a no-op', () => {
    const member = addHouseholdMember(
      createDemoApplicationSeed(),
      ari,
      context('action-member', 'person-ari'),
    );
    const initial = setCurrentCoverage(
      member.nextState,
      {
        records: [
          { personId: 'person-maya-carter', status: 'none' },
          { personId: 'person-ari', status: 'none' },
        ],
      },
      context('action-coverage-initial'),
    );
    const updated = setCurrentCoverage(
      initial.nextState,
      {
        records: [
          {
            personId: 'person-maya-carter',
            status: 'covered',
            providerName: 'Demo Plan',
          },
        ],
      },
      context('action-coverage-update'),
    );
    expect(
      updated.nextState.coverageRecords.map((record) => record.personId),
    ).toEqual(['person-maya-carter', 'person-ari']);

    const reorderedNoop = setCurrentCoverage(
      updated.nextState,
      {
        records: [
          { personId: 'person-ari', status: 'none' },
          {
            personId: 'person-maya-carter',
            status: 'covered',
            providerName: 'Demo Plan',
          },
        ],
      },
      context('action-coverage-reordered'),
    );
    expect(reorderedNoop.receipt).toMatchObject({
      kind: 'success',
      changed: false,
      stateRevision: updated.nextState.revision,
    });
    expect(reorderedNoop.nextState).toBe(updated.nextState);
  });

  it('attaches metadata-only documents idempotently and timestamps attestation from the injected clock', () => {
    const seed = createDemoApplicationSeed();
    const document = attachDemoDocument(
      seed,
      { kind: 'identity', displayName: '<hostile> demo ID' },
      context('action-document', 'document-demo-id'),
    );
    expect(document.receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 1,
    });
    expect(document.nextState.documents[0]).toMatchObject({
      id: 'document-demo-id',
      status: 'attached_demo',
      displayName: '<hostile> demo ID',
      addedAt: '2026-08-27T00:00:00.000Z',
    });
    expect(
      attachDemoDocument(
        document.nextState,
        { kind: 'identity', displayName: '<HOSTILE>   demo id' },
        context('action-document-duplicate'),
      ).receipt,
    ).toMatchObject({ kind: 'success', changed: false, stateRevision: 1 });

    const attested = setAttestation(
      document.nextState,
      { accepted: true },
      context('action-attest'),
    );
    expect(attested.nextState.attestation).toEqual({
      accepted: true,
      acceptedAt: '2026-08-27T00:00:00.000Z',
    });
    expect(
      setAttestation(
        attested.nextState,
        { accepted: true },
        context('action-attest-noop'),
      ).receipt,
    ).toMatchObject({ kind: 'success', changed: false, stateRevision: 2 });
    const cleared = setAttestation(
      attested.nextState,
      { accepted: false },
      context('action-attest-clear'),
    );
    expect(cleared.nextState.attestation).toEqual({
      accepted: false,
      acceptedAt: null,
    });
  });

  it('returns APPLICATION_LOCKED for every ordinary post-submit mutation', () => {
    const seed = createDemoApplicationSeed();
    const locked = {
      ...seed,
      submission: {
        status: 'submitted_demo' as const,
        submittedAt: '2026-08-27T00:00:00.000Z',
      },
    };
    const attempts = [
      () => addHouseholdMember(locked, ari, context('lock-add-member')),
      () =>
        updateHouseholdMember(
          locked,
          { personId: seed.applicant.id, changes: { firstName: 'Nope' } },
          context('lock-update-member'),
        ),
      () =>
        addIncomeSource(
          locked,
          {
            ownerPersonId: seed.applicant.id,
            employerName: 'Demo Work',
            amountCents: 1,
            frequency: 'monthly',
            currency: 'USD',
          },
          context('lock-add-income'),
        ),
      () =>
        updateIncomeSource(
          locked,
          { incomeSourceId: 'income-missing', changes: { amountCents: 1 } },
          context('lock-update-income'),
        ),
      () =>
        setCurrentCoverage(locked, { records: [] }, context('lock-coverage')),
      () =>
        attachDemoDocument(
          locked,
          { kind: 'other', displayName: 'Demo' },
          context('lock-document'),
        ),
      () => setAttestation(locked, { accepted: true }, context('lock-attest')),
      () => submitDemo(locked, context('lock-submit')),
    ];

    for (const attempt of attempts) {
      expect(attempt().receipt).toMatchObject({
        kind: 'failure',
        code: 'APPLICATION_LOCKED',
        changed: false,
        stateRevision: 0,
      });
    }
  });

  it('submits only a complete review, locks ordinary mutations, and reset is the allowed post-submit transition', () => {
    const seed = createDemoApplicationSeed();
    expect(
      submitDemo(seed, context('action-submit-blocked')).receipt,
    ).toMatchObject({
      kind: 'failure',
      code: 'REVIEW_BLOCKED',
      changed: false,
      stateRevision: 0,
    });

    const member = addHouseholdMember(
      seed,
      ari,
      context('action-member', 'person-ari'),
    );
    const income = addIncomeSource(
      member.nextState,
      {
        ownerPersonId: seed.applicant.id,
        employerName: 'Demo Work',
        amountCents: 500_00,
        frequency: 'monthly',
        currency: 'USD',
      },
      context('action-income', 'income-work'),
    );
    const coverage = setCurrentCoverage(
      income.nextState,
      {
        records: [
          { personId: seed.applicant.id, status: 'none' },
          { personId: 'person-ari', status: 'none' },
        ],
      },
      context('action-coverage'),
    );
    const document = attachDemoDocument(
      coverage.nextState,
      { kind: 'proof_of_income', displayName: 'Demo proof' },
      context('action-document', 'document-proof'),
    );
    const attested = setAttestation(
      document.nextState,
      { accepted: true },
      context('action-attest'),
    );
    const submitted = submitDemo(attested.nextState, context('action-submit'));
    expect(submitted.receipt).toMatchObject({
      kind: 'success',
      changed: true,
      stateRevision: 6,
    });
    expect(submitted.nextState.submission).toEqual({
      status: 'submitted_demo',
      submittedAt: '2026-08-27T00:00:00.000Z',
    });
    expect(
      addIncomeSource(
        submitted.nextState,
        {
          ownerPersonId: seed.applicant.id,
          employerName: 'Nope',
          amountCents: 1,
          frequency: 'monthly',
          currency: 'USD',
        },
        context('action-locked'),
      ).receipt,
    ).toMatchObject({
      kind: 'failure',
      code: 'APPLICATION_LOCKED',
      changed: false,
      stateRevision: 6,
    });

    const reset = resetDemo(submitted.nextState, context('action-reset'));
    expect(reset.receipt).toMatchObject({
      kind: 'success',
      actionId: 'action-reset',
      changed: true,
      stateRevision: 0,
    });
    expect(reset.nextState).toEqual(createDemoApplicationSeed());
  });
});
