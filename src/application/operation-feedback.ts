export const TOOL_FRIENDLY_LABELS: Readonly<Record<string, string>> = {
  get_application_progress: 'Get application progress',
  get_next_actions: 'Get next actions',
  navigate_to_section: 'Navigate to section',
  add_household_member: 'Add household member',
  update_household_member: 'Update household member',
  add_income_source: 'Add income source',
  update_income_source: 'Update income source',
  set_current_coverage: 'Set current coverage',
  list_uploaded_documents: 'List uploaded documents',
  review_application: 'Review application',
};

export function getFriendlyOperationLabel(
  labelOrToolName?: string,
  toolName?: string,
): string {
  if (toolName && TOOL_FRIENDLY_LABELS[toolName]) {
    return TOOL_FRIENDLY_LABELS[toolName];
  }
  if (labelOrToolName && TOOL_FRIENDLY_LABELS[labelOrToolName]) {
    return TOOL_FRIENDLY_LABELS[labelOrToolName];
  }
  return labelOrToolName ?? 'Operation';
}

export type OperationPhase = 'validating' | 'applying' | 'succeeded' | 'failed';

export interface OperationDescriptor {
  actionId: string;
  source: 'human' | 'webmcp';
  label: string;
  section: string;
  toolName?: string;
  startedAt: string;
  beforeRevision: number;
}

export interface OperationState extends OperationDescriptor {
  phase: OperationPhase;
  completedAt?: string;
  afterRevision?: number;
  affectedEntityIds: readonly string[];
  recovery?: {
    section: string;
    message: string;
    suggestedTool?: string;
    requiredFields?: readonly string[];
    focusTargetId?: string;
  };
}

export type OperationAction =
  | { type: 'start'; operation: OperationDescriptor }
  | { type: 'advance'; actionId: string }
  | {
      type: 'succeed';
      actionId: string;
      completedAt: string;
      afterRevision: number;
      affectedEntityIds: readonly string[];
    }
  | {
      type: 'fail';
      actionId: string;
      completedAt: string;
      recovery?: OperationState['recovery'];
    }
  | { type: 'clear'; actionId?: string };

export function reduceOperation(
  current: OperationState | null,
  action: OperationAction,
): OperationState | null {
  switch (action.type) {
    case 'start': {
      const desc = action.operation;
      const next: OperationState = {
        actionId: desc.actionId,
        source: desc.source,
        label: desc.label,
        section: desc.section,
        startedAt: desc.startedAt,
        beforeRevision: desc.beforeRevision,
        phase: 'validating',
        affectedEntityIds: [],
      };
      if (desc.toolName !== undefined) next.toolName = desc.toolName;
      return next;
    }

    case 'advance': {
      if (
        current === null ||
        current.actionId !== action.actionId ||
        current.phase !== 'validating'
      ) {
        return current;
      }
      return { ...current, phase: 'applying' };
    }

    case 'succeed': {
      if (
        current === null ||
        current.actionId !== action.actionId ||
        current.phase !== 'applying'
      ) {
        return current;
      }
      return {
        ...current,
        phase: 'succeeded',
        completedAt: action.completedAt,
        afterRevision: action.afterRevision,
        affectedEntityIds: action.affectedEntityIds.slice(),
      };
    }

    case 'fail': {
      if (
        current === null ||
        current.actionId !== action.actionId ||
        (current.phase !== 'validating' && current.phase !== 'applying')
      ) {
        return current;
      }
      const next: OperationState = {
        ...current,
        phase: 'failed',
        completedAt: action.completedAt,
      };
      if (action.recovery !== undefined) {
        const r = action.recovery;
        next.recovery = {
          section: r.section,
          message: r.message,
          ...(r.suggestedTool !== undefined
            ? { suggestedTool: r.suggestedTool }
            : {}),
          ...(r.requiredFields !== undefined
            ? { requiredFields: r.requiredFields.slice() }
            : {}),
          ...(r.focusTargetId !== undefined
            ? { focusTargetId: r.focusTargetId }
            : {}),
        };
      }
      return next;
    }

    case 'clear': {
      if (current === null) return null;
      if (
        action.actionId === undefined ||
        action.actionId === current.actionId
      ) {
        return null;
      }
      return current;
    }
  }
}
