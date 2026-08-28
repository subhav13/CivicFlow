import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../../src/application/store';
import { getApplicationProgress } from '../../src/domain';
import {
  createStaticToolHandlers,
  type WebMcpToolHandlers,
} from '../../src/webmcp/tool-handlers';
import { CIVICFLOW_TOOL_NAMES } from '../../src/webmcp/tool-catalog';

describe('Static Mutation Tools', () => {
  let store: CivicFlowStore;
  let handlers: WebMcpToolHandlers;

  beforeEach(() => {
    store = createCivicFlowStore();
    handlers = createStaticToolHandlers(store);
  });

  describe('golden path step 1 & 2: add_household_member and add_income_source', () => {
    it('advances application progress from 20% to 40% when adding a household member', async () => {
      expect(getApplicationProgress(store.getState().application).percent).toBe(
        20,
      );

      const resultStr = await handlers.add_household_member({
        firstName: 'Emma',
        lastName: 'Carter',
        ageYears: 7,
        relationship: 'daughter',
        applyingForCoverage: true,
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.tool).toBe('add_household_member');
      expect(result.changed).toBe(true);
      expect(result.stateRevision).toBe(1);
      expect(result.visibleEffect).toContain('Emma Carter');

      const state = store.getState();
      expect(state.application.householdMembers).toHaveLength(1);
      expect(state.application.householdMembers[0].firstName).toBe('Emma');
      expect(state.application.householdConfirmed).toBe(true);
      expect(state.ui.activeSection).toBe('household');
      expect(state.ui.selection?.kind).toBe('household');
      expect(state.ui.selection?.id).toBe(
        state.application.householdMembers[0].id,
      );
      expect(getApplicationProgress(state.application).percent).toBe(40);
    });

    it('defaults optional lastName to applicant lastName', async () => {
      const resultStr = await handlers.add_household_member({
        firstName: 'Emma',
        ageYears: 7,
        relationship: 'daughter',
        applyingForCoverage: true,
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(store.getState().application.householdMembers[0].lastName).toBe(
        'Carter',
      );
    });

    it('advances progress from 40% to 60% when adding income for resolved person', async () => {
      // First add Emma
      await handlers.add_household_member({
        firstName: 'Emma',
        lastName: 'Carter',
        ageYears: 7,
        relationship: 'daughter',
        applyingForCoverage: true,
      });

      const resultStr = await handlers.add_income_source({
        ownerName: 'Maya Carter',
        employerName: 'Acme Dental',
        amount: 4950.0,
        frequency: 'monthly',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.tool).toBe('add_income_source');
      expect(result.changed).toBe(true);
      expect(result.stateRevision).toBe(2);

      const state = store.getState();
      expect(state.application.incomeSources).toHaveLength(1);
      expect(state.application.incomeSources[0].amountCents).toBe(495000);
      expect(state.application.incomeSources[0].employerName).toBe(
        'Acme Dental',
      );
      expect(state.ui.activeSection).toBe('income');
      expect(state.ui.selection?.kind).toBe('income');
      expect(getApplicationProgress(state.application).percent).toBe(60);
    });
  });

  describe('strict validation and precision limits', () => {
    it('accepts valid decimal values representable to two decimal places (including 0.29, 0.58, 4950.1)', async () => {
      const amountsToTest = [
        { input: 0.29, expectedCents: 29 },
        { input: 0.58, expectedCents: 58 },
        { input: 4950.1, expectedCents: 495010 },
        { input: 4950.12, expectedCents: 495012 },
      ];

      for (const { input, expectedCents } of amountsToTest) {
        const testStore = createCivicFlowStore({ storage: null });
        const testHandlers = createStaticToolHandlers(testStore);
        const resultStr = await testHandlers.add_income_source({
          ownerName: 'Maya Carter',
          employerName: `Employer ${input}`,
          amount: input,
          frequency: 'monthly',
        });
        const result = JSON.parse(resultStr);

        expect(result.ok).toBe(true);
        expect(result.error).toBeUndefined();
        const sources = testStore.getState().application.incomeSources;
        expect(sources).toHaveLength(1);
        expect(sources[0].amountCents).toBe(expectedCents);
      }
    });

    it('rejects income amounts with true excess decimal places without rounding', async () => {
      const excessAmounts = [
        4950.125, 0.001, 100.005, 0.0000001, 9999999.00000001,
      ];

      for (const amount of excessAmounts) {
        const initialRev = store.getState().application.revision;

        const resultStr = await handlers.add_income_source({
          ownerName: 'Maya Carter',
          employerName: 'Acme Dental',
          amount,
          frequency: 'monthly',
        });
        const result = JSON.parse(resultStr);

        expect(result.ok).toBe(false);
        expect(result.error.code).toBe('INVALID_ARGUMENTS');
        expect(result.error.recoverable).toBe(true);
        expect(store.getState().application.revision).toBe(initialRev);
        expect(store.getState().application.incomeSources).toHaveLength(0);
      }
    });

    it('rejects missing or out-of-range fields for add_household_member', async () => {
      const initialRevision = store.getState().application.revision;
      const resultStr = await handlers.add_household_member({
        firstName: '',
        ageYears: 150,
        relationship: 'daughter',
        applyingForCoverage: true,
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_ARGUMENTS');
      expect(result.error.fieldErrors).toBeDefined();
      expect(result.error.fieldErrors?.firstName).toBeDefined();
      expect(result.stateRevision).toBe(initialRevision);
      expect(store.getState().application.revision).toBe(initialRevision);
    });
  });

  describe('person resolution errors', () => {
    it('returns PERSON_NOT_FOUND when ownerName does not match any member', async () => {
      const resultStr = await handlers.add_income_source({
        ownerName: 'Unknown Person',
        employerName: 'Tech Corp',
        amount: 3000,
        frequency: 'monthly',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('PERSON_NOT_FOUND');
      expect(result.error.recoverable).toBe(true);
    });
  });

  describe('duplicate / idempotency behavior', () => {
    it('returns changed: false when adding identical household member', async () => {
      await handlers.add_household_member({
        firstName: 'Emma',
        lastName: 'Carter',
        ageYears: 7,
        relationship: 'daughter',
        applyingForCoverage: true,
      });
      const revAfterFirst = store.getState().application.revision;

      const resultStr = await handlers.add_household_member({
        firstName: 'Emma',
        lastName: 'Carter',
        ageYears: 7,
        relationship: 'daughter',
        applyingForCoverage: true,
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(false);
      expect(result.stateRevision).toBe(revAfterFirst);
      expect(store.getState().application.householdMembers).toHaveLength(1);
    });

    it('returns changed: false when adding identical income source', async () => {
      await handlers.add_income_source({
        ownerName: 'Maya Carter',
        employerName: 'Acme Dental',
        amount: 4950.0,
        frequency: 'monthly',
      });
      const revAfterFirst = store.getState().application.revision;

      const resultStr = await handlers.add_income_source({
        ownerName: 'Maya Carter',
        employerName: 'Acme Dental',
        amount: 4950.0,
        frequency: 'monthly',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(false);
      expect(result.stateRevision).toBe(revAfterFirst);
      expect(store.getState().application.incomeSources).toHaveLength(1);
    });
  });

  describe('set_current_coverage tool', () => {
    beforeEach(async () => {
      await handlers.add_household_member({
        firstName: 'Emma',
        lastName: 'Carter',
        ageYears: 7,
        relationship: 'daughter',
        applyingForCoverage: true,
      });
    });

    it('atomically sets coverage for multiple applying members', async () => {
      const resultStr = await handlers.set_current_coverage({
        memberNames: ['Maya Carter', 'Emma Carter'],
        status: 'none',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);
      expect(result.data.updatedCount).toBe(2);

      const state = store.getState();
      expect(state.application.coverageRecords).toHaveLength(2);
      expect(
        state.application.coverageRecords.every((r) => r.status === 'none'),
      ).toBe(true);
      expect(state.ui.activeSection).toBe('coverage');
    });

    it('atomically sets covered status with provider name', async () => {
      const resultStr = await handlers.set_current_coverage({
        memberNames: ['Maya Carter'],
        status: 'covered',
        providerName: 'Blue Cross Blue Shield',
        planName: 'Standard Silver',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.changed).toBe(true);

      const state = store.getState();
      expect(state.application.coverageRecords[0].providerName).toBe(
        'Blue Cross Blue Shield',
      );
      expect(state.application.coverageRecords[0].planName).toBe(
        'Standard Silver',
      );
    });

    it('fails atomically if any member name cannot be resolved', async () => {
      const revBefore = store.getState().application.revision;

      const resultStr = await handlers.set_current_coverage({
        memberNames: ['Maya Carter', 'NonExistent Member'],
        status: 'none',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('PERSON_NOT_FOUND');
      expect(store.getState().application.revision).toBe(revBefore);
      expect(store.getState().application.coverageRecords).toHaveLength(0);
    });

    it('rejects covered status without providerName', async () => {
      const resultStr = await handlers.set_current_coverage({
        memberNames: ['Maya Carter'],
        status: 'covered',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('MISSING_PROVIDER');
    });

    it('rejects none status with provider or plan details', async () => {
      const resultStr = await handlers.set_current_coverage({
        memberNames: ['Maya Carter'],
        status: 'none',
        providerName: 'Some Provider',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_COVERAGE_DETAILS');
    });
  });

  describe('no-submit invariant scan', () => {
    it('verifies no submit capability or handler is present', () => {
      for (const name of CIVICFLOW_TOOL_NAMES) {
        expect(name).not.toMatch(/submit/i);
      }
      expect(handlers).not.toHaveProperty('submitDemo');
      expect(handlers).not.toHaveProperty('submit_application');
      expect(handlers).not.toHaveProperty('submit');
    });
  });
});
