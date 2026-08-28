import Ajv from 'ajv';

import {
  type SectionId,
  getApplicationProgress,
  getReviewIssues,
  canSubmitDemo,
  resolvePerson,
  PersonResolutionError,
} from '../domain';
import { getDocumentReadiness } from '../domain/document-readiness';
import { getNextActions } from '../domain/guidance';
import type { CivicFlowStore } from '../application/store';
import {
  addHouseholdMember,
  updateHouseholdMember,
  addIncomeSource,
  updateIncomeSource,
  setCurrentCoverage,
  type CommandSuccessReceipt,
} from '../application/commands';
import {
  TOOL_CATALOG,
  type CivicFlowToolName,
  type AddHouseholdMemberToolInput,
  type UpdateHouseholdMemberToolInput,
  type AddIncomeSourceToolInput,
  type UpdateIncomeSourceToolInput,
  type SetCurrentCoverageToolInput,
  type NavigateToSectionInput,
} from './tool-catalog';
import {
  failureResult,
  serializeToolResult,
  successResult,
} from './tool-results';
import { getRecoveryDescriptor, toSerializableRecovery } from './recovery';
import { runWebMcpMutation, type MutationOutcome } from './tool-lifecycle';

export type WebMcpToolHandler = (
  input: unknown,
  options?: { signal?: AbortSignal },
) => Promise<string>;

export type WebMcpToolHandlers = Record<CivicFlowToolName, WebMcpToolHandler>;

const ajv = new Ajv({ strict: true, allErrors: true });

const validators = {
  get_application_progress: ajv.compile(
    TOOL_CATALOG.get_application_progress.inputSchema,
  ),
  get_next_actions: ajv.compile(TOOL_CATALOG.get_next_actions.inputSchema),
  navigate_to_section: ajv.compile(
    TOOL_CATALOG.navigate_to_section.inputSchema,
  ),
  add_household_member: ajv.compile(
    TOOL_CATALOG.add_household_member.inputSchema,
  ),
  update_household_member: ajv.compile(
    TOOL_CATALOG.update_household_member.inputSchema,
  ),
  add_income_source: ajv.compile(TOOL_CATALOG.add_income_source.inputSchema),
  update_income_source: ajv.compile(
    TOOL_CATALOG.update_income_source.inputSchema,
  ),
  set_current_coverage: ajv.compile(
    TOOL_CATALOG.set_current_coverage.inputSchema,
  ),
  list_uploaded_documents: ajv.compile(
    TOOL_CATALOG.list_uploaded_documents.inputSchema,
  ),
  review_application: ajv.compile(TOOL_CATALOG.review_application.inputSchema),
};

const SECTION_DISPLAY_NAMES: Readonly<Record<SectionId, string>> = {
  about: 'About You',
  household: 'Household',
  income: 'Income',
  coverage: 'Current Coverage',
  documents: 'Documents',
  review: 'Review & Sign',
};

function defaultActionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `act-${globalThis.crypto.randomUUID()}`;
  }
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateToolInput<T>(
  tool: CivicFlowToolName,
  input: unknown,
  actionId: string,
  stateRevision: number,
):
  | { valid: true; data: T }
  | { valid: false; result: string; fieldErrors: Record<string, string> } {
  const validator = validators[tool];
  if (!validator(input)) {
    const fieldErrors: Record<string, string> = {};
    if (validator.errors) {
      for (const err of validator.errors) {
        const field = err.instancePath.replace(/^\//u, '') || 'input';
        fieldErrors[field] = err.message || 'Invalid input parameter';
      }
    }
    const fail = failureResult(
      tool,
      actionId,
      'INVALID_ARGUMENTS',
      `Input validation failed for tool "${tool}"`,
      true,
      stateRevision,
      fieldErrors,
    );
    return { valid: false, result: serializeToolResult(fail), fieldErrors };
  }
  return { valid: true, data: input as T };
}
function hasExcessDecimals(value: number): boolean {
  if (!Number.isFinite(value)) {
    return true;
  }
  return Math.round(value * 100) / 100 !== value;
}

function makeMutationFailure(
  tool: CivicFlowToolName,
  actionId: string,
  code: string,
  message: string,
  stateRevision: number,
  section: SectionId,
  fieldErrors?: Record<string, string>,
): MutationOutcome {
  const recoveryDesc = getRecoveryDescriptor({
    code,
    tool,
    section,
    message,
    fieldErrors,
  });
  const serializable = toSerializableRecovery(recoveryDesc);
  const fail = failureResult(
    tool,
    actionId,
    code,
    message,
    true,
    stateRevision,
    fieldErrors,
    serializable,
  );
  return {
    serialized: serializeToolResult(fail),
    status: 'failure',
    stateRevision,
    changed: false,
    changedEntityIds: [],
    recovery: recoveryDesc
      ? {
          section: recoveryDesc.section,
          message: recoveryDesc.message,
          ...(recoveryDesc.suggestedTool
            ? { suggestedTool: recoveryDesc.suggestedTool }
            : {}),
          ...(recoveryDesc.requiredFields
            ? { requiredFields: recoveryDesc.requiredFields.slice() }
            : {}),
          ...(recoveryDesc.focusTargetId
            ? { focusTargetId: recoveryDesc.focusTargetId }
            : {}),
        }
      : undefined,
  };
}
function focusHeading(section: SectionId): void {
  if (typeof document === 'undefined') return;
  const heading =
    document.getElementById(`section-heading-${section}`) ||
    document.querySelector(`h2[data-section="${section}"]`);
  if (heading instanceof HTMLElement) {
    heading.focus();
  }
}

/**
 * Creates static and contextual tool handlers bound to the application store.
 */
export function createStaticToolHandlers(
  store: CivicFlowStore,
): WebMcpToolHandlers {
  return {
    get_application_progress: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput(
        'get_application_progress',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const progress = getApplicationProgress(state.application);
      const issues = getReviewIssues(state.application);
      const res = successResult(
        'get_application_progress',
        actionId,
        false,
        `Application is ${progress.percent}% complete with ${issues.length} issue(s).`,
        {
          percent: progress.percent,
          completedSections: progress.completedSections,
          nextSection: progress.nextSection,
          issues: issues.slice(0, 5).map((i) => ({
            code: i.code,
            severity: i.severity,
            section: i.section,
            message: i.message,
            ...(i.entityLabel ? { entityLabel: i.entityLabel } : {}),
          })),
          totalIssues: issues.length,
          stateRevision: state.application.revision,
        },
        state.application.revision,
        'None (read-only query)',
      );
      return serializeToolResult(res);
    },
    get_next_actions: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput(
        'get_next_actions',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const actions = getNextActions(state.application);
      const progress = getApplicationProgress(state.application);
      const issues = getReviewIssues(state.application);
      const completedCount = progress.completedSections.length;
      const totalSections = 6;
      const blockerCount = issues.length;

      const res = successResult(
        'get_next_actions',
        actionId,
        false,
        `Retrieved ${actions.length} next action(s).`,
        {
          percent: progress.percent,
          completedCount,
          totalSections,
          blockerCount,
          actions,
          stateRevision: state.application.revision,
        },
        state.application.revision,
        'None (read-only query)',
      );
      return serializeToolResult(res);
    },

    navigate_to_section: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput<NavigateToSectionInput>(
        'navigate_to_section',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const targetSection = validation.data.section;
      const sectionName = SECTION_DISPLAY_NAMES[targetSection] || targetSection;

      // Clear incompatible selection
      if (
        (state.ui.selection?.kind === 'household' &&
          targetSection !== 'household') ||
        (state.ui.selection?.kind === 'income' && targetSection !== 'income')
      ) {
        store.clearSelection();
      }

      store.navigateToSection(targetSection);
      store.appendActivity({
        id: actionId,
        summary: `Navigated to ${sectionName} section`,
        source: 'webmcp',
      });
      focusHeading(targetSection);

      const res = successResult(
        'navigate_to_section',
        actionId,
        false,
        `Navigated to ${sectionName} section.`,
        { activeSection: targetSection },
        state.application.revision,
        `Navigated to ${sectionName} section`,
      );
      return serializeToolResult(res);
    },

    add_household_member: async (input, options) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const descriptor = {
        actionId,
        source: 'webmcp' as const,
        label: 'Add household member',
        section: 'household',
        toolName: 'add_household_member',
        startedAt: new Date().toISOString(),
        beforeRevision: state.application.revision,
      };
      return runWebMcpMutation(
        store,
        descriptor,
        async (): Promise<MutationOutcome> => {
          const currentState = store.getState();
          const validation = validateToolInput<AddHouseholdMemberToolInput>(
            'add_household_member',
            input,
            actionId,
            currentState.application.revision,
          );
          if (!validation.valid) {
            return makeMutationFailure(
              'add_household_member',
              actionId,
              'INVALID_ARGUMENTS',
              `Input validation failed for tool "add_household_member"`,
              currentState.application.revision,
              'household',
              validation.fieldErrors,
            );
          }

          const raw = validation.data;
          const lastName =
            raw.lastName?.trim() || currentState.application.applicant.lastName;

          const receipt = store.dispatch(
            (appState, ctx) =>
              addHouseholdMember(
                appState,
                {
                  firstName: raw.firstName,
                  lastName,
                  ageYears: raw.ageYears,
                  relationship: raw.relationship,
                  applyingForCoverage: raw.applyingForCoverage,
                },
                ctx,
              ),
            {
              source: 'webmcp',
              activity: {
                id: actionId,
                summary: `Added household member ${raw.firstName} ${lastName}`,
              },
            },
          );

          if (receipt.kind === 'failure') {
            return makeMutationFailure(
              'add_household_member',
              actionId,
              receipt.code,
              receipt.message,
              receipt.stateRevision,
              'household',
            );
          }

          const successReceipt = receipt as CommandSuccessReceipt;
          const memberSummary = successReceipt.changedEntities.find(
            (e) => e.kind === 'household_member',
          );
          if (memberSummary) {
            store.selectRecord({ kind: 'household', id: memberSummary.id });
          }
          store.navigateToSection('household');

          const res = successResult(
            'add_household_member',
            actionId,
            successReceipt.changed,
            successReceipt.message,
            {
              member: memberSummary ?? null,
              householdConfirmed: true,
            },
            successReceipt.stateRevision,
            successReceipt.changed
              ? `Added household member ${raw.firstName} ${lastName} and selected card`
              : `Identified existing member ${raw.firstName} ${lastName} and selected card`,
          );
          return {
            serialized: serializeToolResult(res),
            status: 'success',
            stateRevision: successReceipt.stateRevision,
            changed: successReceipt.changed,
            changedEntityIds: successReceipt.changedEntities.map((e) => e.id),
          };
        },
        options?.signal,
      );
    },

    update_household_member: async (input, options) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const descriptor = {
        actionId,
        source: 'webmcp' as const,
        label: 'Update household member',
        section: 'household',
        toolName: 'update_household_member',
        startedAt: new Date().toISOString(),
        beforeRevision: state.application.revision,
      };
      return runWebMcpMutation(
        store,
        descriptor,
        async (): Promise<MutationOutcome> => {
          const currentState = store.getState();
          const validation = validateToolInput<UpdateHouseholdMemberToolInput>(
            'update_household_member',
            input,
            actionId,
            currentState.application.revision,
          );
          if (!validation.valid) {
            return makeMutationFailure(
              'update_household_member',
              actionId,
              'INVALID_ARGUMENTS',
              `Input validation failed for tool "update_household_member"`,
              currentState.application.revision,
              'household',
              validation.fieldErrors,
            );
          }

          const selection = currentState.ui.selection;
          if (!selection || selection.kind !== 'household') {
            return makeMutationFailure(
              'update_household_member',
              actionId,
              'CONTEXT_STALE',
              'No household member is currently selected. Select a household member before updating.',
              currentState.application.revision,
              'household',
            );
          }

          const member = currentState.application.householdMembers.find(
            (m) => m.id === selection.id,
          );
          if (!member) {
            return makeMutationFailure(
              'update_household_member',
              actionId,
              'CONTEXT_STALE',
              'The selected household member was not found.',
              currentState.application.revision,
              'household',
            );
          }

          const receipt = store.dispatch(
            (appState, ctx) =>
              updateHouseholdMember(
                appState,
                {
                  personId: selection.id,
                  changes: validation.data,
                },
                ctx,
              ),
            {
              source: 'webmcp',
              activity: {
                id: actionId,
                summary: `Updated household member ${member.firstName} ${member.lastName}`,
              },
            },
          );

          if (receipt.kind === 'failure') {
            return makeMutationFailure(
              'update_household_member',
              actionId,
              receipt.code,
              receipt.message,
              receipt.stateRevision,
              'household',
            );
          }

          const successReceipt = receipt as CommandSuccessReceipt;
          store.selectRecord({ kind: 'household', id: selection.id });
          store.navigateToSection('household');

          const res = successResult(
            'update_household_member',
            actionId,
            successReceipt.changed,
            successReceipt.message,
            { memberId: selection.id },
            successReceipt.stateRevision,
            `Updated household member details and selected card`,
          );
          return {
            serialized: serializeToolResult(res),
            status: 'success',
            stateRevision: successReceipt.stateRevision,
            changed: successReceipt.changed,
            changedEntityIds: successReceipt.changedEntities.map((e) => e.id),
          };
        },
        options?.signal,
      );
    },

    add_income_source: async (input, options) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const descriptor = {
        actionId,
        source: 'webmcp' as const,
        label: 'Add income source',
        section: 'income',
        toolName: 'add_income_source',
        startedAt: new Date().toISOString(),
        beforeRevision: state.application.revision,
      };
      return runWebMcpMutation(
        store,
        descriptor,
        async (): Promise<MutationOutcome> => {
          const currentState = store.getState();
          const validation = validateToolInput<AddIncomeSourceToolInput>(
            'add_income_source',
            input,
            actionId,
            currentState.application.revision,
          );
          if (!validation.valid) {
            return makeMutationFailure(
              'add_income_source',
              actionId,
              'INVALID_ARGUMENTS',
              `Input validation failed for tool "add_income_source"`,
              currentState.application.revision,
              'income',
              validation.fieldErrors,
            );
          }

          const raw = validation.data;

          if (hasExcessDecimals(raw.amount)) {
            return makeMutationFailure(
              'add_income_source',
              actionId,
              'INVALID_ARGUMENTS',
              'Income amount cannot have more than two decimal places.',
              currentState.application.revision,
              'income',
              { amount: 'Excess decimal precision' },
            );
          }

          let ownerPersonId: string;
          try {
            const owner = resolvePerson(
              currentState.application,
              raw.ownerName,
            );
            ownerPersonId = owner.id;
          } catch (err) {
            const code =
              err instanceof PersonResolutionError
                ? err.code
                : 'PERSON_NOT_FOUND';
            const msg =
              err instanceof Error
                ? err.message
                : `Could not resolve person "${raw.ownerName}"`;
            return makeMutationFailure(
              'add_income_source',
              actionId,
              code,
              msg,
              currentState.application.revision,
              'income',
              { ownerName: msg },
            );
          }

          const amountCents = Math.round(raw.amount * 100);
          const receipt = store.dispatch(
            (appState, ctx) =>
              addIncomeSource(
                appState,
                {
                  ownerPersonId,
                  employerName: raw.employerName,
                  amountCents,
                  frequency: raw.frequency,
                  currency: 'USD',
                },
                ctx,
              ),
            {
              source: 'webmcp',
              activity: {
                id: actionId,
                summary: `Added income from ${raw.employerName}`,
              },
            },
          );

          if (receipt.kind === 'failure') {
            return makeMutationFailure(
              'add_income_source',
              actionId,
              receipt.code,
              receipt.message,
              receipt.stateRevision,
              'income',
            );
          }

          const successReceipt = receipt as CommandSuccessReceipt;
          const incomeSummary = successReceipt.changedEntities.find(
            (e) => e.kind === 'income_source',
          );
          if (incomeSummary) {
            store.selectRecord({ kind: 'income', id: incomeSummary.id });
          }
          store.navigateToSection('income');

          const res = successResult(
            'add_income_source',
            actionId,
            successReceipt.changed,
            successReceipt.message,
            { income: incomeSummary ?? null },
            successReceipt.stateRevision,
            `Added income source from ${raw.employerName} and selected card`,
          );
          return {
            serialized: serializeToolResult(res),
            status: 'success',
            stateRevision: successReceipt.stateRevision,
            changed: successReceipt.changed,
            changedEntityIds: successReceipt.changedEntities.map((e) => e.id),
          };
        },
        options?.signal,
      );
    },

    update_income_source: async (input, options) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const descriptor = {
        actionId,
        source: 'webmcp' as const,
        label: 'Update income source',
        section: 'income',
        toolName: 'update_income_source',
        startedAt: new Date().toISOString(),
        beforeRevision: state.application.revision,
      };
      return runWebMcpMutation(
        store,
        descriptor,
        async (): Promise<MutationOutcome> => {
          const currentState = store.getState();
          const validation = validateToolInput<UpdateIncomeSourceToolInput>(
            'update_income_source',
            input,
            actionId,
            currentState.application.revision,
          );
          if (!validation.valid) {
            return makeMutationFailure(
              'update_income_source',
              actionId,
              'INVALID_ARGUMENTS',
              `Input validation failed for tool "update_income_source"`,
              currentState.application.revision,
              'income',
              validation.fieldErrors,
            );
          }

          const selection = currentState.ui.selection;
          if (!selection || selection.kind !== 'income') {
            return makeMutationFailure(
              'update_income_source',
              actionId,
              'CONTEXT_STALE',
              'No income source is currently selected. Select an income card before updating.',
              currentState.application.revision,
              'income',
            );
          }

          const income = currentState.application.incomeSources.find(
            (i) => i.id === selection.id,
          );
          if (!income) {
            return makeMutationFailure(
              'update_income_source',
              actionId,
              'CONTEXT_STALE',
              'The selected income source was not found.',
              currentState.application.revision,
              'income',
            );
          }

          const raw = validation.data;
          let ownerPersonId: string | undefined;

          if (raw.ownerName !== undefined) {
            try {
              const owner = resolvePerson(
                currentState.application,
                raw.ownerName,
              );
              ownerPersonId = owner.id;
            } catch (err) {
              const code =
                err instanceof PersonResolutionError
                  ? err.code
                  : 'PERSON_NOT_FOUND';
              const msg =
                err instanceof Error
                  ? err.message
                  : `Could not resolve person "${raw.ownerName}"`;
              return makeMutationFailure(
                'update_income_source',
                actionId,
                code,
                msg,
                currentState.application.revision,
                'income',
                { ownerName: msg },
              );
            }
          }

          if (raw.amount !== undefined && hasExcessDecimals(raw.amount)) {
            return makeMutationFailure(
              'update_income_source',
              actionId,
              'INVALID_ARGUMENTS',
              'Income amount cannot have more than two decimal places.',
              currentState.application.revision,
              'income',
              { amount: 'Excess decimal precision' },
            );
          }
          const amountCents =
            raw.amount !== undefined ? Math.round(raw.amount * 100) : undefined;

          const receipt = store.dispatch(
            (appState, ctx) =>
              updateIncomeSource(
                appState,
                {
                  incomeSourceId: selection.id,
                  changes: {
                    ...(ownerPersonId ? { ownerPersonId } : {}),
                    ...(raw.employerName
                      ? { employerName: raw.employerName }
                      : {}),
                    ...(amountCents !== undefined ? { amountCents } : {}),
                    ...(raw.frequency ? { frequency: raw.frequency } : {}),
                    currency: 'USD',
                  },
                },
                ctx,
              ),
            {
              source: 'webmcp',
              activity: {
                id: actionId,
                summary: `Updated income from ${raw.employerName || income.employerName}`,
              },
            },
          );

          if (receipt.kind === 'failure') {
            return makeMutationFailure(
              'update_income_source',
              actionId,
              receipt.code,
              receipt.message,
              receipt.stateRevision,
              'income',
            );
          }

          const successReceipt = receipt as CommandSuccessReceipt;
          store.selectRecord({ kind: 'income', id: selection.id });
          store.navigateToSection('income');

          const res = successResult(
            'update_income_source',
            actionId,
            successReceipt.changed,
            successReceipt.message,
            { incomeId: selection.id },
            successReceipt.stateRevision,
            'Updated income source details and selected card',
          );
          return {
            serialized: serializeToolResult(res),
            status: 'success',
            stateRevision: successReceipt.stateRevision,
            changed: successReceipt.changed,
            changedEntityIds: successReceipt.changedEntities.map((e) => e.id),
          };
        },
        options?.signal,
      );
    },

    set_current_coverage: async (input, options) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const descriptor = {
        actionId,
        source: 'webmcp' as const,
        label: 'Set current coverage',
        section: 'coverage',
        toolName: 'set_current_coverage',
        startedAt: new Date().toISOString(),
        beforeRevision: state.application.revision,
      };
      return runWebMcpMutation(
        store,
        descriptor,
        async (): Promise<MutationOutcome> => {
          const currentState = store.getState();
          const validation = validateToolInput<SetCurrentCoverageToolInput>(
            'set_current_coverage',
            input,
            actionId,
            currentState.application.revision,
          );
          if (!validation.valid) {
            return makeMutationFailure(
              'set_current_coverage',
              actionId,
              'INVALID_ARGUMENTS',
              `Input validation failed for tool "set_current_coverage"`,
              currentState.application.revision,
              'coverage',
              validation.fieldErrors,
            );
          }

          const raw = validation.data;

          if (
            raw.status === 'covered' &&
            (!raw.providerName || raw.providerName.trim().length === 0)
          ) {
            return makeMutationFailure(
              'set_current_coverage',
              actionId,
              'MISSING_PROVIDER',
              'Provider name is required when coverage status is "covered".',
              currentState.application.revision,
              'coverage',
              { providerName: 'Provider name is required' },
            );
          }

          if (
            raw.status === 'none' &&
            (raw.providerName?.trim() || raw.planName?.trim())
          ) {
            return makeMutationFailure(
              'set_current_coverage',
              actionId,
              'INVALID_COVERAGE_DETAILS',
              'Provider and plan details must be empty when coverage status is "none".',
              currentState.application.revision,
              'coverage',
            );
          }

          // Resolve all member names atomically
          const resolvedPersonIds: string[] = [];
          for (const name of raw.memberNames) {
            try {
              const person = resolvePerson(currentState.application, name);
              resolvedPersonIds.push(person.id);
            } catch (err) {
              const code =
                err instanceof PersonResolutionError
                  ? err.code
                  : 'PERSON_NOT_FOUND';
              const msg =
                err instanceof Error
                  ? err.message
                  : `Could not resolve person "${name}"`;
              return makeMutationFailure(
                'set_current_coverage',
                actionId,
                code,
                msg,
                currentState.application.revision,
                'coverage',
                { memberNames: msg },
              );
            }
          }

          const records = resolvedPersonIds.map((personId) => ({
            personId,
            status: raw.status,
            ...(raw.providerName?.trim()
              ? { providerName: raw.providerName.trim() }
              : {}),
            ...(raw.planName?.trim() ? { planName: raw.planName.trim() } : {}),
          }));
          const receipt = store.dispatch(
            (appState, ctx) =>
              setCurrentCoverage(
                appState,
                {
                  records,
                },
                ctx,
              ),
            {
              source: 'webmcp',
              activity: {
                id: actionId,
                summary: `Updated coverage for ${resolvedPersonIds.length} person(s)`,
              },
            },
          );

          if (receipt.kind === 'failure') {
            return makeMutationFailure(
              'set_current_coverage',
              actionId,
              receipt.code,
              receipt.message,
              receipt.stateRevision,
              'coverage',
            );
          }

          const successReceipt = receipt as CommandSuccessReceipt;
          store.navigateToSection('coverage');

          const res = successResult(
            'set_current_coverage',
            actionId,
            successReceipt.changed,
            successReceipt.message,
            { updatedCount: resolvedPersonIds.length },
            successReceipt.stateRevision,
            `Updated coverage for ${resolvedPersonIds.length} member(s)`,
          );
          return {
            serialized: serializeToolResult(res),
            status: 'success',
            stateRevision: successReceipt.stateRevision,
            changed: successReceipt.changed,
            changedEntityIds: successReceipt.changedEntities.map((e) => e.id),
          };
        },
        options?.signal,
      );
    },

    list_uploaded_documents: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput(
        'list_uploaded_documents',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const readiness = getDocumentReadiness(state.application);
      const documents = state.application.documents.map((d) => ({
        kind: d.kind,
        displayName: d.displayName,
        status: d.status,
      }));
      const requirements = readiness.requirements.map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label,
        status: r.status,
        required: r.required,
        reason: r.reason,
      }));

      const res = successResult(
        'list_uploaded_documents',
        actionId,
        false,
        `Found ${documents.length} attached document(s). Missing ${readiness.missingRequiredCount} required document(s).`,
        {
          documents,
          count: documents.length,
          requirements,
          missingRequiredCount: readiness.missingRequiredCount,
        },
        state.application.revision,
        'None (read-only query)',
      );
      return serializeToolResult(res);
    },

    review_application: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput(
        'review_application',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      if (state.ui.activeSection !== 'review') {
        const recoveryDesc = getRecoveryDescriptor({
          code: 'CONTEXT_STALE',
          tool: 'review_application',
          section: 'review',
        });
        const fail = failureResult(
          'review_application',
          actionId,
          'CONTEXT_STALE',
          'review_application is only available when Review & Sign section is active.',
          true,
          state.application.revision,
          undefined,
          toSerializableRecovery(recoveryDesc),
        );
        return serializeToolResult(fail);
      }

      const progress = getApplicationProgress(state.application);
      const issues = getReviewIssues(state.application);
      const blockerCodes = issues.map((i) => i.code);

      store.setReviewHighlights(blockerCodes);
      store.appendActivity({
        id: actionId,
        summary: `Reviewed application (${issues.length} issue(s) remaining)`,
        source: 'webmcp',
      });

      const res = successResult(
        'review_application',
        actionId,
        false,
        `Review completed: ${issues.length} blocker(s) found.`,
        {
          percent: progress.percent,
          issuesCount: issues.length,
          issues: issues.slice(0, 8).map((i) => ({
            code: i.code,
            severity: i.severity,
            section: i.section,
            message: i.message,
            ...(i.entityLabel ? { entityLabel: i.entityLabel } : {}),
          })),
          attestationAccepted: state.application.attestation.accepted,
          canSubmitDemo: canSubmitDemo(state.application),
        },
        state.application.revision,
        'Updated review highlights and readiness summary in UI',
      );
      return serializeToolResult(res);
    },
  };
}
