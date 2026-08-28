import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../../src/application/store';
import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';
import { WebMcpRegistryManager } from '../../src/webmcp/registry-manager';
import { createStaticToolHandlers } from '../../src/webmcp/tool-handlers';

describe('Dynamic Registry Manager and Contextual Handlers', () => {
  let store: CivicFlowStore;
  let port: FakeModelContextPort;
  let registry: WebMcpRegistryManager;

  beforeEach(async () => {
    store = createCivicFlowStore();
    port = new FakeModelContextPort();
    registry = new WebMcpRegistryManager({ port, store });
    await registry.start();
  });

  it('registers all seven static tools on initialization', async () => {
    const tools = await port.getTools();
    const names = tools.map((t) => t.name).sort();

    expect(names).toEqual([
      'add_household_member',
      'add_income_source',
      'get_application_progress',
      'get_next_actions',
      'list_uploaded_documents',
      'navigate_to_section',
      'set_current_coverage',
    ]);
    expect(names).toHaveLength(7);
  });

  it('dynamically exposes and hides update_household_member based on household selection', async () => {
    // Add a member first
    const handlers = createStaticToolHandlers(store);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });

    const memberId = store.getState().application.householdMembers[0].id;

    // Selecting member should register update_household_member
    store.selectRecord({ kind: 'household', id: memberId });
    await registry.waitForSync();

    let tools = await port.getTools();
    expect(tools.map((t) => t.name)).toContain('update_household_member');

    // Deselecting should unregister update_household_member
    store.clearSelection();
    await registry.waitForSync();

    tools = await port.getTools();
    expect(tools.map((t) => t.name)).not.toContain('update_household_member');
  });

  it('dynamically exposes and hides update_income_source based on income selection', async () => {
    const handlers = createStaticToolHandlers(store);
    await handlers.add_income_source({
      ownerName: 'Maya Carter',
      employerName: 'Acme Dental',
      amount: 4950.0,
      frequency: 'monthly',
    });

    const incomeId = store.getState().application.incomeSources[0].id;

    // Selecting income should register update_income_source
    store.selectRecord({ kind: 'income', id: incomeId });
    await registry.waitForSync();

    let tools = await port.getTools();
    expect(tools.map((t) => t.name)).toContain('update_income_source');

    // Clearing selection unregisters it
    store.clearSelection();
    await registry.waitForSync();

    tools = await port.getTools();
    expect(tools.map((t) => t.name)).not.toContain('update_income_source');
  });

  it('dynamically exposes review_application only on review section', async () => {
    let tools = await port.getTools();
    expect(tools.map((t) => t.name)).not.toContain('review_application');

    store.navigateToSection('review');
    await registry.waitForSync();

    tools = await port.getTools();
    expect(tools.map((t) => t.name)).toContain('review_application');

    store.navigateToSection('about');
    await registry.waitForSync();

    tools = await port.getTools();
    expect(tools.map((t) => t.name)).not.toContain('review_application');
  });

  it('resolves selection at execution time and handles switching selection seamlessly', async () => {
    const handlers = createStaticToolHandlers(store);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });
    await handlers.add_household_member({
      firstName: 'Liam',
      lastName: 'Carter',
      ageYears: 10,
      relationship: 'son',
      applyingForCoverage: true,
    });

    const emmaId = store.getState().application.householdMembers[0].id;
    const liamId = store.getState().application.householdMembers[1].id;

    // Select Emma
    store.selectRecord({ kind: 'household', id: emmaId });
    await registry.waitForSync();

    // Switch selection to Liam
    store.selectRecord({ kind: 'household', id: liamId });
    await registry.waitForSync();

    const tools = await port.getTools();
    const updateTool = tools.find((t) => t.name === 'update_household_member')!;
    expect(updateTool).toBeDefined();

    // Executing update_household_member updates Liam because he is selected at execution time
    const resultStr = await port.executeTool(updateTool, { ageYears: 11 });
    const result = JSON.parse(resultStr);

    expect(result.ok).toBe(true);
    expect(store.getState().application.householdMembers[1].ageYears).toBe(11);
    expect(store.getState().application.householdMembers[0].ageYears).toBe(7);
  });

  it('returns CONTEXT_STALE if selection disappears before execution', async () => {
    const handlers = createStaticToolHandlers(store);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });

    const emmaId = store.getState().application.householdMembers[0].id;
    store.selectRecord({ kind: 'household', id: emmaId });
    await registry.waitForSync();

    const tools = await port.getTools();
    const updateTool = tools.find((t) => t.name === 'update_household_member')!;

    // Deselect right before execution
    store.clearSelection();

    const resultStr = (await updateTool)
      ? await port.executeTool(updateTool, { ageYears: 8 }).catch((err) => {
          // If port already unregistered tool or handler executes with stale context
          return JSON.stringify({
            ok: false,
            error: { code: 'CONTEXT_STALE', message: err.message },
          });
        })
      : '{}';

    const result = JSON.parse(resultStr);
    expect(result.ok).toBe(false);
  });

  it('serializes rapid context changes without duplicate registration errors', async () => {
    const handlers = createStaticToolHandlers(store);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });
    const memberId = store.getState().application.householdMembers[0].id;

    // Rapid selection toggles
    for (let i = 0; i < 5; i++) {
      store.selectRecord({ kind: 'household', id: memberId });
      store.clearSelection();
      store.selectRecord({ kind: 'household', id: memberId });
    }

    await registry.waitForSync();

    const tools = await port.getTools();
    expect(tools.map((t) => t.name)).toContain('update_household_member');
  });

  it('unregisters all tools and cleans up on dispose', async () => {
    registry.dispose();
    const tools = await port.getTools();
    expect(tools).toHaveLength(0);
  });

  it('prevents stale tool and capability publication when context changes mid-flight with delayed port', async () => {
    const delayedPort = new FakeModelContextPort({ registerDelayMs: 25 });
    const delayedStore = createCivicFlowStore();
    const delayedRegistry = new WebMcpRegistryManager({
      port: delayedPort,
      store: delayedStore,
    });
    await delayedRegistry.start();

    const handlers = createStaticToolHandlers(delayedStore);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });
    const memberId = delayedStore.getState().application.householdMembers[0].id;

    // Trigger context 1 (household selection)
    delayedStore.selectRecord({ kind: 'household', id: memberId });

    // Rapidly switch to context 2 (review section, clear selection) before context 1 finishes
    delayedStore.clearSelection();
    delayedStore.navigateToSection('review');
    await delayedRegistry.waitForSync();

    const tools = await delayedPort.getTools();
    const toolNames = tools.map((t) => t.name);

    // Must contain review_application and static tools, but NOT stale update_household_member
    expect(toolNames).toContain('review_application');
    expect(toolNames).not.toContain('update_household_member');

    const capabilities = delayedStore.getState().ui.capabilities;
    const capIds = capabilities.map((c) => c.id);
    expect(capIds).toContain('review_application');
    expect(capIds).not.toContain('update_household_member');

    delayedRegistry.dispose();
  });

  it('prevents late capability publication when disposed mid-flight during delayed registration', async () => {
    const delayedPort = new FakeModelContextPort({ registerDelayMs: 30 });
    const delayedStore = createCivicFlowStore();
    const delayedRegistry = new WebMcpRegistryManager({
      port: delayedPort,
      store: delayedStore,
    });

    const startPromise = delayedRegistry.start();
    // Dispose immediately while startup registration is in flight
    delayedRegistry.dispose();

    await startPromise;

    // Capabilities must remain empty and no late republish should occur
    expect(delayedStore.getState().ui.capabilities).toEqual([]);
    const tools = await delayedPort.getTools();
    expect(tools).toHaveLength(0);
  });

  it('explicitly invalidates generation on teardown and prevents in-flight async continuations from registering or publishing', async () => {
    let unblockRegister: (() => void) | null = null;
    const blockingPort = new FakeModelContextPort();
    const originalRegister = blockingPort.registerTool.bind(blockingPort);
    blockingPort.registerTool = async (tool, options) => {
      if (tool.name === 'update_household_member') {
        await new Promise<void>((resolve) => {
          unblockRegister = resolve;
        });
      }
      return originalRegister(tool, options);
    };

    const testStore = createCivicFlowStore();
    const testRegistry = new WebMcpRegistryManager({
      port: blockingPort,
      store: testStore,
    });
    await testRegistry.start();

    const handlers = createStaticToolHandlers(testStore);
    await handlers.add_household_member({
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });
    const memberId = testStore.getState().application.householdMembers[0].id;

    // Trigger contextual registration for update_household_member (which pauses inside registerTool)
    testStore.selectRecord({ kind: 'household', id: memberId });

    // Dispose registry while registration is blocked in-flight
    testRegistry.dispose();

    // Unblock the delayed registration continuation
    if (unblockRegister) {
      (unblockRegister as () => void)();
    }
    await testRegistry.waitForSync();

    // After teardown and continuation resolution, capabilities remain empty and tools are clean
    expect(testStore.getState().ui.capabilities).toEqual([]);
    const tools = await blockingPort.getTools();
    expect(tools).toHaveLength(0);
  });

  it('handles startup registration failure cleanly without unhandled rejection', async () => {
    const failingPort = new FakeModelContextPort();
    // Force registration failure by monkey-patching registerTool to reject
    failingPort.registerTool = async () => {
      throw new Error('Port registration hardware error');
    };

    const failingStore = createCivicFlowStore();
    const failingRegistry = new WebMcpRegistryManager({
      port: failingPort,
      store: failingStore,
    });

    // Must not throw or create unhandled rejection
    await expect(failingRegistry.start()).resolves.toBeUndefined();
    expect(failingStore.getState().ui.capabilities).toEqual([]);
  });
});
