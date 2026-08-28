import { describe, expect, it } from 'vitest';

import { createDemoApplicationSeed, type ApplicationState } from './index';
import { getNextActions } from './guidance';
describe('Domain Guidance — getNextActions (Packet 3.1)', () => {
  it('returns exactly the first three canonical blockers for the demo seed', () => {
    const seed = createDemoApplicationSeed();
    const actions = getNextActions(seed);

    expect(actions).toHaveLength(3);

    // Canonical order: household, income, coverage
    expect(actions[0].section).toBe('household');
    expect(actions[0].priority).toBe(1);
    expect(actions[0].suggestedTool).toBe('add_household_member');
    expect(actions[0].requiredFields).toBeDefined();

    expect(actions[1].section).toBe('income');
    expect(actions[1].priority).toBe(1);
    expect(actions[1].suggestedTool).toBe('add_income_source');
    expect(actions[1].requiredFields).toBeDefined();

    expect(actions[2].section).toBe('coverage');
    expect(actions[2].priority).toBe(1);
    expect(actions[2].suggestedTool).toBe('set_current_coverage');
    expect(actions[2].requiredFields).toBeDefined();
  });

  it('caps actions at at most three even when more sections have blockers', () => {
    const seed = createDemoApplicationSeed();
    const actions = getNextActions(seed);
    expect(actions.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for a fully complete, attested demo application', () => {
    const completeApp: ApplicationState = {
      schemaVersion: 1,
      applicationId: 'civicflow-synthetic-demo',
      revision: 6,
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
      householdConfirmed: true,
      householdMembers: [],
      noIncomeConfirmed: true,
      incomeSources: [],
      coverageRecords: [
        {
          personId: 'person-maya-carter',
          status: 'none',
        },
      ],
      documents: [],
      attestation: {
        accepted: true,
        acceptedAt: '2026-08-28T12:00:00.000Z',
      },
      submission: {
        status: 'not_submitted',
        submittedAt: null,
      },
    };

    const actions = getNextActions(completeApp);
    expect(actions).toEqual([]);
  });

  it('returns empty array for a submitted demo application', () => {
    const submittedApp: ApplicationState = {
      schemaVersion: 1,
      applicationId: 'civicflow-synthetic-demo',
      revision: 7,
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
      householdConfirmed: true,
      householdMembers: [],
      noIncomeConfirmed: true,
      incomeSources: [],
      coverageRecords: [
        {
          personId: 'person-maya-carter',
          status: 'none',
        },
      ],
      documents: [],
      attestation: {
        accepted: true,
        acceptedAt: '2026-08-28T12:00:00.000Z',
      },
      submission: {
        status: 'submitted_demo',
        submittedAt: '2026-08-28T12:05:00.000Z',
      },
    };

    const actions = getNextActions(submittedApp);
    expect(actions).toEqual([]);
  });

  it('suggests proof of income document when income is reported but documents are missing', () => {
    const appWithIncome: ApplicationState = {
      schemaVersion: 1,
      applicationId: 'civicflow-synthetic-demo',
      revision: 3,
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
      householdConfirmed: true,
      householdMembers: [],
      noIncomeConfirmed: false,
      incomeSources: [
        {
          id: 'income-1',
          ownerPersonId: 'person-maya-carter',
          employerName: 'Acme Corp',
          amountCents: 350000,
          frequency: 'monthly',
          currency: 'USD',
        },
      ],
      coverageRecords: [
        {
          personId: 'person-maya-carter',
          status: 'none',
        },
      ],
      documents: [],
      attestation: {
        accepted: false,
        acceptedAt: null,
      },
      submission: {
        status: 'not_submitted',
        submittedAt: null,
      },
    };

    const actions = getNextActions(appWithIncome);
    expect(actions.length).toBeGreaterThan(0);
    const docAction = actions.find((a) => a.section === 'documents');
    expect(docAction).toBeDefined();
    expect(docAction?.title.toLowerCase()).toContain('proof of income');
    // Human-only preset attachment; no mutation tool suggested
    expect(docAction?.suggestedTool).toBeUndefined();
  });

  it('suggests attestation review when all sections are complete but attestation is unaccepted', () => {
    const readyForAttestation: ApplicationState = {
      schemaVersion: 1,
      applicationId: 'civicflow-synthetic-demo',
      revision: 4,
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
      householdConfirmed: true,
      householdMembers: [],
      noIncomeConfirmed: true,
      incomeSources: [],
      coverageRecords: [
        {
          personId: 'person-maya-carter',
          status: 'none',
        },
      ],
      documents: [],
      attestation: {
        accepted: false,
        acceptedAt: null,
      },
      submission: {
        status: 'not_submitted',
        submittedAt: null,
      },
    };

    const actions = getNextActions(readyForAttestation);
    expect(actions).toHaveLength(1);
    expect(actions[0].section).toBe('review');
    expect(actions[0].title.toLowerCase()).toContain('attestation');
    // Human-only attestation checkbox; no mutation tool
    expect(actions[0].suggestedTool).toBeUndefined();
  });

  it('never contains eligibility, benefit amount, government, Medicaid, or MassHealth language', () => {
    const seed = createDemoApplicationSeed();
    const actions = getNextActions(seed);

    const forbidden = [
      'eligible',
      'eligibility',
      'benefit amount',
      'government',
      'medicaid',
      'masshealth',
      'recommend',
    ];

    for (const action of actions) {
      const text = `${action.title} ${action.reason}`.toLowerCase();
      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
    }
  });
});
