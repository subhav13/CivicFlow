import Ajv from 'ajv';

import {
  type SectionId,
  getApplicationProgress,
  getReviewIssues,
  canSubmitDemo,
  resolvePerson,
  PersonResolutionError,
} from '../domain';
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
): { valid: true; data: T } | { valid: false; result: string } {
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
    return { valid: false, result: serializeToolResult(fail) };
  }
  return { valid: true, data: input as T };
}

function hasExcessDecimals(value: number): boolean {
  if (!Number.isFinite(value)) {
    return true;
  }
  return Math.round(value * 100) / 100 !== value;
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

    add_household_member: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput<AddHouseholdMemberToolInput>(
        'add_household_member',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const raw = validation.data;
      const lastName =
        raw.lastName?.trim() || state.application.applicant.lastName;

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
        const fail = failureResult(
          'add_household_member',
          actionId,
          receipt.code,
          receipt.message,
          true,
          receipt.stateRevision,
        );
        return serializeToolResult(fail);
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
      return serializeToolResult(res);
    },

    update_household_member: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput<UpdateHouseholdMemberToolInput>(
        'update_household_member',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const selection = state.ui.selection;
      if (!selection || selection.kind !== 'household') {
        const fail = failureResult(
          'update_household_member',
          actionId,
          'CONTEXT_STALE',
          'No household member is currently selected. Select a household member before updating.',
          true,
          state.application.revision,
        );
        return serializeToolResult(fail);
      }

      const member = state.application.householdMembers.find(
        (m) => m.id === selection.id,
      );
      if (!member) {
        const fail = failureResult(
          'update_household_member',
          actionId,
          'CONTEXT_STALE',
          'The selected household member was not found.',
          true,
          state.application.revision,
        );
        return serializeToolResult(fail);
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
        const fail = failureResult(
          'update_household_member',
          actionId,
          receipt.code,
          receipt.message,
          true,
          receipt.stateRevision,
        );
        return serializeToolResult(fail);
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
      return serializeToolResult(res);
    },

    add_income_source: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput<AddIncomeSourceToolInput>(
        'add_income_source',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const raw = validation.data;

      if (hasExcessDecimals(raw.amount)) {
        const fail = failureResult(
          'add_income_source',
          actionId,
          'INVALID_ARGUMENTS',
          'Income amount cannot have more than two decimal places.',
          true,
          state.application.revision,
          { amount: 'Excess decimal precision' },
        );
        return serializeToolResult(fail);
      }

      let ownerPersonId: string;
      try {
        const owner = resolvePerson(state.application, raw.ownerName);
        ownerPersonId = owner.id;
      } catch (err) {
        const code =
          err instanceof PersonResolutionError ? err.code : 'PERSON_NOT_FOUND';
        const msg =
          err instanceof Error
            ? err.message
            : `Could not resolve person "${raw.ownerName}"`;
        const fail = failureResult(
          'add_income_source',
          actionId,
          code,
          msg,
          true,
          state.application.revision,
          { ownerName: msg },
        );
        return serializeToolResult(fail);
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
        const fail = failureResult(
          'add_income_source',
          actionId,
          receipt.code,
          receipt.message,
          true,
          receipt.stateRevision,
        );
        return serializeToolResult(fail);
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
      return serializeToolResult(res);
    },

    update_income_source: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput<UpdateIncomeSourceToolInput>(
        'update_income_source',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const selection = state.ui.selection;
      if (!selection || selection.kind !== 'income') {
        const fail = failureResult(
          'update_income_source',
          actionId,
          'CONTEXT_STALE',
          'No income source is currently selected. Select an income card before updating.',
          true,
          state.application.revision,
        );
        return serializeToolResult(fail);
      }

      const income = state.application.incomeSources.find(
        (i) => i.id === selection.id,
      );
      if (!income) {
        const fail = failureResult(
          'update_income_source',
          actionId,
          'CONTEXT_STALE',
          'The selected income source was not found.',
          true,
          state.application.revision,
        );
        return serializeToolResult(fail);
      }

      const raw = validation.data;
      let ownerPersonId: string | undefined;

      if (raw.ownerName !== undefined) {
        try {
          const owner = resolvePerson(state.application, raw.ownerName);
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
          const fail = failureResult(
            'update_income_source',
            actionId,
            code,
            msg,
            true,
            state.application.revision,
            { ownerName: msg },
          );
          return serializeToolResult(fail);
        }
      }

      if (raw.amount !== undefined && hasExcessDecimals(raw.amount)) {
        const fail = failureResult(
          'update_income_source',
          actionId,
          'INVALID_ARGUMENTS',
          'Income amount cannot have more than two decimal places.',
          true,
          state.application.revision,
          { amount: 'Excess decimal precision' },
        );
        return serializeToolResult(fail);
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
                ...(raw.employerName ? { employerName: raw.employerName } : {}),
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
        const fail = failureResult(
          'update_income_source',
          actionId,
          receipt.code,
          receipt.message,
          true,
          receipt.stateRevision,
        );
        return serializeToolResult(fail);
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
      return serializeToolResult(res);
    },

    set_current_coverage: async (input) => {
      const actionId = defaultActionId();
      const state = store.getState();
      const validation = validateToolInput<SetCurrentCoverageToolInput>(
        'set_current_coverage',
        input,
        actionId,
        state.application.revision,
      );
      if (!validation.valid) return validation.result;

      const raw = validation.data;

      if (
        raw.status === 'covered' &&
        (!raw.providerName || raw.providerName.trim().length === 0)
      ) {
        const fail = failureResult(
          'set_current_coverage',
          actionId,
          'MISSING_PROVIDER',
          'Provider name is required when coverage status is "covered".',
          true,
          state.application.revision,
          { providerName: 'Provider name is required' },
        );
        return serializeToolResult(fail);
      }

      if (
        raw.status === 'none' &&
        (raw.providerName?.trim() || raw.planName?.trim())
      ) {
        const fail = failureResult(
          'set_current_coverage',
          actionId,
          'INVALID_COVERAGE_DETAILS',
          'Provider and plan details must be empty when coverage status is "none".',
          true,
          state.application.revision,
        );
        return serializeToolResult(fail);
      }

      // Resolve all member names atomically
      const resolvedPersonIds: string[] = [];
      for (const name of raw.memberNames) {
        try {
          const person = resolvePerson(state.application, name);
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
          const fail = failureResult(
            'set_current_coverage',
            actionId,
            code,
            msg,
            true,
            state.application.revision,
            { memberNames: msg },
          );
          return serializeToolResult(fail);
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
        const fail = failureResult(
          'set_current_coverage',
          actionId,
          receipt.code,
          receipt.message,
          true,
          receipt.stateRevision,
        );
        return serializeToolResult(fail);
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
      return serializeToolResult(res);
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

      const documents = state.application.documents.map((d) => ({
        kind: d.kind,
        displayName: d.displayName,
        status: d.status,
      }));

      const res = successResult(
        'list_uploaded_documents',
        actionId,
        false,
        `Found ${documents.length} attached document(s).`,
        {
          documents,
          count: documents.length,
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
        const fail = failureResult(
          'review_application',
          actionId,
          'CONTEXT_STALE',
          'review_application is only available when Review & Sign section is active.',
          true,
          state.application.revision,
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
