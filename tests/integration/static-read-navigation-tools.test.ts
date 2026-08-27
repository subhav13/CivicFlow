import { beforeEach, describe, expect, it } from 'vitest';

import {
  createCivicFlowStore,
  type CivicFlowStore,
} from '../../src/application/store';
import {
  attachDemoDocument,
  type CommandContext,
} from '../../src/application/commands';
import {
  createStaticToolHandlers,
  type WebMcpToolHandlers,
} from '../../src/webmcp/tool-handlers';
import { FakeModelContextPort } from '../../src/webmcp/fake-model-context-port';
import { TOOL_CATALOG } from '../../src/webmcp/tool-catalog';

describe('Static Read and Navigation Handlers', () => {
  let store: CivicFlowStore;
  let port: FakeModelContextPort;
  let handlers: WebMcpToolHandlers;

  beforeEach(() => {
    store = createCivicFlowStore();
    port = new FakeModelContextPort();
    handlers = createStaticToolHandlers(store);
  });

  describe('get_application_progress handler', () => {
    it('returns progress and does not mutate persisted revision', async () => {
      const initialRev = store.getState().application.revision;

      const resultStr = await handlers.get_application_progress({});
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.tool).toBe('get_application_progress');
      expect(result.changed).toBe(false);
      expect(result.stateRevision).toBe(initialRev);
      expect(result.data.percent).toBe(20);
      expect(result.data.completedSections).toEqual(['about']);
      expect(result.data.nextSection).toBe('household');
      expect(Array.isArray(result.data.issues)).toBe(true);
      expect(store.getState().application.revision).toBe(initialRev);
    });

    it('rejects extra input properties strictly', async () => {
      const resultStr = await handlers.get_application_progress({
        unknownProp: 'invalid',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.tool).toBe('get_application_progress');
      expect(result.error.code).toBe('INVALID_ARGUMENTS');
      expect(result.error.recoverable).toBe(true);
    });
  });

  describe('navigate_to_section handler', () => {
    it('navigates to specified section and appends activity entry', async () => {
      const initialRev = store.getState().application.revision;

      const resultStr = await handlers.navigate_to_section({
        section: 'household',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.tool).toBe('navigate_to_section');
      expect(result.changed).toBe(false);
      expect(result.stateRevision).toBe(initialRev);
      expect(store.getState().ui.activeSection).toBe('household');

      const activity = store.getState().ui.activity;
      expect(activity.length).toBeGreaterThan(0);
      expect(activity[0].source).toBe('webmcp');
      expect(activity[0].summary).toContain('Household');
    });

    it('clears incompatible selection on navigation', async () => {
      store.selectRecord({ kind: 'household', id: 'person-test-1' });
      expect(store.getState().ui.selection).toEqual({
        kind: 'household',
        id: 'person-test-1',
      });

      await handlers.navigate_to_section({ section: 'income' });
      expect(store.getState().ui.activeSection).toBe('income');
      expect(store.getState().ui.selection).toBeNull();
    });

    it('rejects invalid section identifier', async () => {
      const resultStr = await handlers.navigate_to_section({
        // @ts-expect-error Testing invalid section
        section: 'invalid_section',
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_ARGUMENTS');
      expect(result.error.recoverable).toBe(true);
    });
  });

  describe('list_uploaded_documents handler', () => {
    it('returns attached demo documents safely', async () => {
      const ctx: CommandContext = {
        source: 'human',
        now: () => new Date('2026-08-27T12:00:00.000Z'),
        newId: () => 'doc-1',
      };
      store.dispatch(
        (state, c) =>
          attachDemoDocument(
            state,
            {
              kind: 'proof_of_income',
              displayName: 'paystub_july.pdf',
            },
            c,
          ),
        { source: ctx.source },
      );

      const resultStr = await handlers.list_uploaded_documents({});
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(true);
      expect(result.tool).toBe('list_uploaded_documents');
      expect(result.changed).toBe(false);
      expect(result.data.count).toBe(1);
      expect(result.data.documents).toEqual([
        {
          kind: 'proof_of_income',
          displayName: 'paystub_july.pdf',
          status: 'attached_demo',
        },
      ]);
    });

    it('rejects unexpected arguments strictly', async () => {
      const resultStr = await handlers.list_uploaded_documents({
        unexpected: 123,
      });
      const result = JSON.parse(resultStr);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_ARGUMENTS');
    });
  });

  describe('ModelContextPort integration with static read/nav tools', () => {
    it('registers and executes through port', async () => {
      await port.registerTool({
        ...TOOL_CATALOG.get_application_progress,
        handler: handlers.get_application_progress,
      });

      const tools = await port.getTools();
      const output = await port.executeTool(tools[0], {});
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.tool).toBe('get_application_progress');
    });
  });
});
