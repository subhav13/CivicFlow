import { describe, expect, it } from 'vitest';

import {
  ApplicationValidationError,
  PERSON_AMBIGUOUS,
  PERSON_NOT_FOUND,
  canSubmitDemo,
  createDemoApplicationSeed,
  getApplicantAndHouseholdPeople,
  getApplicationProgress,
  getReviewIssues,
  normalizeDisplayName,
  normalizePersonName,
  resolvePerson,
  validateApplicationState,
} from './index';

function completeState() {
  const seed = createDemoApplicationSeed();
  return {
    ...seed,
    householdConfirmed: true,
    incomeSources: [
      {
        id: 'income-demo-work',
        ownerPersonId: seed.applicant.id,
        employerName: 'Demo Work',
        amountCents: 500_00,
        frequency: 'monthly' as const,
        currency: 'USD' as const,
      },
    ],
    coverageRecords: [{ personId: seed.applicant.id, status: 'none' as const }],
    documents: [
      {
        id: 'document-demo-income',
        kind: 'proof_of_income' as const,
        displayName: 'Demo income statement',
        status: 'attached_demo' as const,
        addedAt: '2026-08-27T00:00:00.000Z',
      },
    ],
    attestation: { accepted: true, acceptedAt: '2026-08-27T00:00:00.000Z' },
  };
}

describe('TypeBox/Ajv application contract', () => {
  it('seeds only the fixed synthetic Maya Carter application at revision 0 and 20%', () => {
    const state = createDemoApplicationSeed();

    expect(state).toMatchObject({
      schemaVersion: 1,
      applicationId: 'civicflow-synthetic-demo',
      revision: 0,
      applicant: {
        id: 'person-maya-carter',
        firstName: 'Maya',
        lastName: 'Carter',
        ageYears: 34,
        relationship: 'self',
        state: 'MA',
        applyingForCoverage: true,
        email: 'maya.carter@example.invalid',
      },
      householdMembers: [],
      incomeSources: [],
      coverageRecords: [],
      documents: [],
      householdConfirmed: false,
      noIncomeConfirmed: false,
      attestation: { accepted: false, acceptedAt: null },
      submission: { status: 'not_submitted', submittedAt: null },
    });
    expect(getApplicationProgress(state)).toMatchObject({
      percent: 20,
      completedSections: ['about'],
      nextSection: 'household',
      stateRevision: 0,
    });
  });

  it('strictly rejects schema and cross-field violations', () => {
    const seed = createDemoApplicationSeed();

    expect(() => validateApplicationState({ ...seed, extra: true })).toThrow(
      ApplicationValidationError,
    );
    expect(() =>
      validateApplicationState({
        ...seed,
        incomeSources: [
          {
            id: 'income-bad-cents',
            ownerPersonId: seed.applicant.id,
            employerName: 'Demo Work',
            amountCents: 12.5,
            frequency: 'monthly',
            currency: 'USD',
          },
        ],
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        incomeSources: [
          {
            id: 'income-over-limit',
            ownerPersonId: seed.applicant.id,
            employerName: 'Demo Work',
            amountCents: 1_000_000_001,
            frequency: 'monthly',
            currency: 'USD',
          },
        ],
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        documents: [
          {
            id: 'document-over-limit',
            kind: 'other',
            displayName: 'a'.repeat(121),
            status: 'attached_demo',
            addedAt: '2026-08-27T00:00:00.000Z',
          },
        ],
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        coverageRecords: [{ personId: seed.applicant.id, status: 'covered' }],
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        coverageRecords: [
          {
            personId: seed.applicant.id,
            status: 'none',
            providerName: 'Demo provider',
          },
        ],
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        householdMembers: [{ ...seed.applicant, id: 'person-self-copy' }],
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        submission: { status: 'submitted_demo', submittedAt: null },
      }),
    ).toThrow(ApplicationValidationError);
    expect(() =>
      validateApplicationState({
        ...seed,
        incomeSources: [
          {
            id: seed.applicant.id,
            ownerPersonId: seed.applicant.id,
            employerName: 'Demo Work',
            amountCents: 1,
            frequency: 'monthly',
            currency: 'USD',
          },
        ],
      }),
    ).toThrow(ApplicationValidationError);
  });

  it('keeps display casing while normalizing exact natural-name lookup keys', () => {
    expect(normalizeDisplayName('\u00a0 Maya\t  CARTER \u00a0')).toBe(
      'Maya CARTER',
    );
    expect(normalizePersonName('\u00a0 Maya\t  CARTER \u00a0')).toBe(
      'maya carter',
    );

    const seed = createDemoApplicationSeed();
    expect(resolvePerson(seed, ' MAYA\tCARTER ').id).toBe('person-maya-carter');
    expect(() => resolvePerson(seed, 'Maya')).toThrow(PERSON_NOT_FOUND);
    expect(() =>
      resolvePerson(
        {
          ...seed,
          householdMembers: [
            {
              id: 'person-maya-duplicate',
              firstName: 'MAYA',
              lastName: 'CARTER',
              ageYears: 30,
              relationship: 'other',
              applyingForCoverage: false,
            },
          ],
        },
        'maya carter',
      ),
    ).toThrow(PERSON_AMBIGUOUS);
  });
});

describe('pure completion and review selectors', () => {
  it('preserves the golden 20 → 40 → 60 progression and reports revision metadata', () => {
    const initial = createDemoApplicationSeed();
    const household = { ...initial, revision: 1, householdConfirmed: true };
    const income = {
      ...household,
      revision: 2,
      incomeSources: [
        {
          id: 'income-demo-work',
          ownerPersonId: initial.applicant.id,
          employerName: 'Demo Work',
          amountCents: 500_00,
          frequency: 'monthly' as const,
          currency: 'USD' as const,
        },
      ],
    };

    expect(getApplicationProgress(initial)).toMatchObject({
      percent: 20,
      nextSection: 'household',
      stateRevision: 0,
    });
    expect(getApplicationProgress(household)).toMatchObject({
      percent: 40,
      nextSection: 'income',
      stateRevision: 1,
    });
    expect(getApplicationProgress(income)).toMatchObject({
      percent: 60,
      nextSection: 'coverage',
      stateRevision: 2,
    });
  });

  it('requires valid household confirmation, explicit applying-person coverage, and proof when income exists', () => {
    const seed = createDemoApplicationSeed();
    const withMember = {
      ...seed,
      householdConfirmed: true,
      householdMembers: [
        {
          id: 'person-demo-child',
          firstName: 'Ari',
          lastName: 'Carter',
          ageYears: 8,
          relationship: 'child' as const,
          applyingForCoverage: true,
        },
      ],
      incomeSources: [
        {
          id: 'income-demo-work',
          ownerPersonId: seed.applicant.id,
          employerName: 'Demo Work',
          amountCents: 500_00,
          frequency: 'monthly' as const,
          currency: 'USD' as const,
        },
      ],
      coverageRecords: [
        { personId: seed.applicant.id, status: 'none' as const },
      ],
    };

    expect(getApplicantAndHouseholdPeople(withMember)).toHaveLength(2);
    expect(getReviewIssues(withMember).map((issue) => issue.code)).toEqual([
      'COVERAGE_UNCONFIRMED',
      'PROOF_OF_INCOME_MISSING',
      'ATTESTATION_REQUIRED',
    ]);
    expect(getReviewIssues(withMember)[0]).toMatchObject({
      severity: 'blocking',
      section: 'coverage',
      entityLabel: 'Ari Carter',
    });
  });

  it('awards documents for explicitly confirmed no-income and permits only an unsubmitted, fully reviewed demo', () => {
    const seed = createDemoApplicationSeed();
    const noIncome = {
      ...seed,
      householdConfirmed: true,
      noIncomeConfirmed: true,
    };
    expect(getApplicationProgress(noIncome).sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'income', complete: true }),
        expect.objectContaining({ id: 'documents', complete: true }),
      ]),
    );

    const complete = completeState();
    expect(getReviewIssues(complete)).toEqual([]);
    expect(canSubmitDemo(complete)).toBe(true);
    expect(
      canSubmitDemo({
        ...complete,
        submission: {
          status: 'submitted_demo',
          submittedAt: '2026-08-27T00:00:00.000Z',
        },
      }),
    ).toBe(false);
  });
});
