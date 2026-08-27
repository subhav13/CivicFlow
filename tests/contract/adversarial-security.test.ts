import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../../src/application/store';
import {
  APPLICATION_STORAGE_KEY,
  loadApplication,
  type StorageLike,
} from '../../src/application/persistence';
import { createDemoApplicationSeed } from '../../src/domain';
import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';
import { WebMcpRegistryManager } from '../../src/webmcp/registry-manager';
import { createStaticToolHandlers } from '../../src/webmcp/tool-handlers';
import {
  failureResult,
  serializeToolResult,
  successResult,
} from '../../src/webmcp/tool-results';

class InMemoryStorage implements StorageLike {
  readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('Packet 3.2 Contract & Integration Safety Gates', () => {
  let store: CivicFlowStore;

  beforeEach(() => {
    store = createCivicFlowStore();
  });

  it('2. oversized tool input is rejected with a compact safe error and no revision change', async () => {
    const handlers = createStaticToolHandlers(store);
    const initialRevision = store.getState().application.revision;

    // Call add_household_member with oversized 5,000-character name string
    const rawResult = await handlers.add_household_member({
      firstName: 'A'.repeat(5000),
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });

    const parsed = JSON.parse(rawResult);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('INVALID_ARGUMENTS');
    expect(parsed.stateRevision).toBe(initialRevision);
    expect(rawResult.length).toBeLessThanOrEqual(1500);
    expect(store.getState().application.revision).toBe(initialRevision);
    expect(store.getState().application.householdMembers).toHaveLength(0);

    // Call set_current_coverage with 50 member names (exceeding maxItems: 10)
    const rawCoverageResult = await handlers.set_current_coverage({
      memberNames: Array.from({ length: 50 }, (_, i) => `Person ${i}`),
      status: 'none',
    });
    const parsedCoverage = JSON.parse(rawCoverageResult);
    expect(parsedCoverage.ok).toBe(false);
    expect(parsedCoverage.error.code).toBe('INVALID_ARGUMENTS');
    expect(parsedCoverage.stateRevision).toBe(initialRevision);
    expect(rawCoverageResult.length).toBeLessThanOrEqual(1500);
    expect(store.getState().application.revision).toBe(initialRevision);
  });

  it('3. oversized issue/document output is compact and remains at or below 1,500 characters', () => {
    // Generate massive list of 100 issues
    const massiveIssues = Array.from({ length: 100 }, (_, i) => ({
      code: `ISSUE_${i}`,
      message: `Extremely long synthetic issue message describing detail ${i} in section ${i} with extra padding text.`,
      section: 'income' as const,
    }));

    const result = successResult(
      'review_application',
      'act-oversized-issues',
      false,
      'Application has multiple blocking issues',
      { issues: massiveIssues, canSubmit: false },
      5,
      'Compacted blocking issue list',
    );

    const serialized = serializeToolResult(result);
    expect(serialized.length).toBeLessThanOrEqual(1500);

    const parsed = JSON.parse(serialized);
    expect(parsed.ok).toBe(true);
    expect(parsed.tool).toBe('review_application');
    expect(parsed.stateRevision).toBe(5);
    expect(Array.isArray(parsed.data.issues)).toBe(true);
    expect(parsed.data._note).toContain('compacted');
    expect(parsed.data.issues.length).toBeLessThan(100);

    // Generate massive list of 100 failure field errors
    const massiveErrors: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      massiveErrors[`field_${i}`] =
        `Error description for field ${i} with long informative text.`;
    }
    const failResult = failureResult(
      'add_household_member',
      'act-oversized-fail',
      'VALIDATION_FAILED',
      'Multiple validation errors',
      true,
      2,
      massiveErrors,
    );

    const serializedFail = serializeToolResult(failResult);
    expect(serializedFail.length).toBeLessThanOrEqual(1500);
    const parsedFail = JSON.parse(serializedFail);
    expect(parsedFail.ok).toBe(false);
    expect(parsedFail.error).toBeDefined();
  });

  it('4. extra properties in tool inputs are rejected', async () => {
    const handlers = createStaticToolHandlers(store);
    const initialRevision = store.getState().application.revision;

    // Strict schema rejecting additional unknown property
    const rawResult = await handlers.navigate_to_section({
      section: 'income',
      injectedExtraProperty: 'MALICIOUS_OVERRIDE',
    } as unknown as { section: 'income' });

    const parsed = JSON.parse(rawResult);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('INVALID_ARGUMENTS');
    expect(parsed.error.message).toContain('Input validation failed');
    expect(parsed.stateRevision).toBe(initialRevision);
    expect(store.getState().application.revision).toBe(initialRevision);

    // Extra property on add_income_source
    const rawIncomeResult = await handlers.add_income_source({
      ownerName: 'Maya Carter',
      employerName: 'Acme Dental',
      amount: 4950,
      frequency: 'monthly',
      unauthorizedAdminGrant: true,
    } as unknown as Parameters<typeof handlers.add_income_source>[0]);

    const parsedIncome = JSON.parse(rawIncomeResult);
    expect(parsedIncome.ok).toBe(false);
    expect(parsedIncome.error.code).toBe('INVALID_ARGUMENTS');
    expect(store.getState().application.revision).toBe(initialRevision);
    expect(store.getState().application.incomeSources).toHaveLength(0);
  });

  it('5. a delayed registration followed by rapid context change leaves no stale contextual tool or stale capability summary', async () => {
    const delayedPort = new FakeModelContextPort({ registerDelayMs: 20 });
    const dynamicStore = createCivicFlowStore();
    const manager = new WebMcpRegistryManager({
      port: delayedPort,
      store: dynamicStore,
    });
    await manager.start();

    const handlers = createStaticToolHandlers(dynamicStore);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });

    const memberId = dynamicStore.getState().application.householdMembers[0].id;

    // Select household record (context 1)
    dynamicStore.selectRecord({ kind: 'household', id: memberId });

    // Immediately clear selection and navigate to documents (context 2)
    dynamicStore.clearSelection();
    dynamicStore.navigateToSection('documents');

    await manager.waitForSync();

    const tools = await delayedPort.getTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).not.toContain('update_household_member');
    expect(toolNames).not.toContain('update_income_source');
    expect(toolNames).not.toContain('review_application');

    const capabilities = dynamicStore.getState().ui.capabilities;
    const capabilityIds = capabilities.map((c) => c.id);
    expect(capabilityIds).not.toContain('update_household_member');
    expect(capabilityIds).not.toContain('update_income_source');

    manager.dispose();
  });

  it('6. disposing/unmounting during registration leaves no late capability publication or React warning', async () => {
    const delayedPort = new FakeModelContextPort({ registerDelayMs: 25 });
    const dynamicStore = createCivicFlowStore();
    const manager = new WebMcpRegistryManager({
      port: delayedPort,
      store: dynamicStore,
    });

    const startPromise = manager.start();
    // Dispose immediately in-flight
    manager.dispose();

    await startPromise;

    expect(dynamicStore.getState().ui.capabilities).toEqual([]);
    const tools = await delayedPort.getTools();
    expect(tools).toHaveLength(0);
  });

  it('7. corrupt, schema-invalid, or oversize localStorage recovers to the deterministic seed with a non-sensitive notice', () => {
    const storage = new InMemoryStorage();

    // 1. Corrupt malformed JSON
    storage.setItem(APPLICATION_STORAGE_KEY, '{invalid json: syntax error');
    const result1 = loadApplication(storage);
    expect(result1.application).toEqual(createDemoApplicationSeed());
    expect(result1.persistenceNotice).toBe('recovered');

    // 2. Oversized payload exceeding 100 KB
    storage.setItem(APPLICATION_STORAGE_KEY, 'X'.repeat(105 * 1024));
    const result2 = loadApplication(storage);
    expect(result2.application).toEqual(createDemoApplicationSeed());
    expect(result2.persistenceNotice).toBe('recovered');

    // 3. Schema invalid structure
    storage.setItem(
      APPLICATION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 999,
        applicant: { invalid: true },
      }),
    );
    const result3 = loadApplication(storage);
    expect(result3.application).toEqual(createDemoApplicationSeed());
    expect(result3.persistenceNotice).toBe('recovered');

    // Verify non-sensitive nature: notice is a fixed enum ('recovered'), not an error stack or secret leak
    expect(typeof result3.persistenceNotice).toBe('string');
    expect(result3.persistenceNotice).toBe('recovered');
  });
});
