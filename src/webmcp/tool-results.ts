export type CivicFlowToolName =
  | 'get_application_progress'
  | 'navigate_to_section'
  | 'get_next_actions'
  | 'add_household_member'
  | 'update_household_member'
  | 'add_income_source'
  | 'update_income_source'
  | 'set_current_coverage'
  | 'list_uploaded_documents'
  | 'review_application';

export interface ToolFailureRecovery {
  section: string;
  message: string;
  suggestedTool?: CivicFlowToolName;
  requiredFields?: readonly string[];
}
export interface ToolSuccess<T = unknown> {
  ok: true;
  tool: CivicFlowToolName;
  actionId: string;
  changed: boolean;
  message: string;
  data: T;
  stateRevision: number;
  visibleEffect: string;
}

export interface ToolFailure {
  ok: false;
  tool: CivicFlowToolName;
  actionId: string;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    fieldErrors?: Record<string, string>;
    recovery?: ToolFailureRecovery;
  };
  stateRevision: number;
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolFailure;

export function successResult<T>(
  tool: CivicFlowToolName,
  actionId: string,
  changed: boolean,
  message: string,
  data: T,
  stateRevision: number,
  visibleEffect: string,
): ToolSuccess<T> {
  return {
    ok: true,
    tool,
    actionId,
    changed,
    message,
    data,
    stateRevision,
    visibleEffect,
  };
}

export function failureResult(
  tool: CivicFlowToolName,
  actionId: string,
  code: string,
  message: string,
  recoverable: boolean,
  stateRevision: number,
  fieldErrors?: Record<string, string>,
  recovery?: ToolFailureRecovery,
): ToolFailure {
  return {
    ok: false,
    tool,
    actionId,
    error: {
      code,
      message,
      recoverable,
      ...(fieldErrors && Object.keys(fieldErrors).length > 0
        ? { fieldErrors }
        : {}),
      ...(recovery !== undefined ? { recovery } : {}),
    },
    stateRevision,
  };
}

const MAX_SERIALIZED_LENGTH = 1500;

function boundedActionId(actionId: string): string {
  const trimmed = actionId.trim();
  return trimmed ? trimmed.slice(0, 64) : 'action';
}

export function serializeToolResult<T>(result: ToolResult<T>): string {
  const rawJson = JSON.stringify(result);
  if (rawJson.length <= MAX_SERIALIZED_LENGTH) {
    return rawJson;
  }

  if (result.ok) {
    if (typeof result.data === 'object' && result.data !== null) {
      const dataObj = { ...(result.data as Record<string, unknown>) };
      const arrayKeys = Object.keys(dataObj).filter((k) =>
        Array.isArray(dataObj[k]),
      );

      if (arrayKeys.length > 0) {
        for (const key of arrayKeys) {
          const originalArray = dataObj[key] as unknown[];
          for (let k = originalArray.length - 1; k >= 0; k--) {
            const candidateData = {
              ...dataObj,
              [key]: originalArray.slice(0, k),
              _note: 'Details compacted to respect payload limit',
            };
            const candidate = {
              ...result,
              data: candidateData,
            };
            const candidateJson = JSON.stringify(candidate);
            if (candidateJson.length <= MAX_SERIALIZED_LENGTH) {
              return candidateJson;
            }
          }
          dataObj[key] = [];
        }
      }

      const noteOnlyCandidate = {
        ...result,
        data: {
          _note: 'Details compacted to respect payload limit',
        },
      };
      const noteOnlyJson = JSON.stringify(noteOnlyCandidate);
      if (noteOnlyJson.length <= MAX_SERIALIZED_LENGTH) {
        return noteOnlyJson;
      }
    }

    const safeSuccess: ToolSuccess<Record<string, unknown>> = {
      ok: true,
      tool: result.tool,
      actionId: boundedActionId(result.actionId),
      changed: result.changed,
      message:
        'Operation completed successfully. Details compacted to respect payload limit.',
      data: {
        _note: 'Details compacted to respect payload limit',
      },
      stateRevision: result.stateRevision,
      visibleEffect: 'Operation completed.',
    };
    const safeSuccessJson = JSON.stringify(safeSuccess);
    if (safeSuccessJson.length <= MAX_SERIALIZED_LENGTH) {
      return safeSuccessJson;
    }

    return JSON.stringify({
      ok: true,
      tool: result.tool,
      actionId: boundedActionId(result.actionId),
      changed: result.changed,
      message: 'Success',
      data: {},
      stateRevision: result.stateRevision,
      visibleEffect: '',
    });
  }

  if (result.error.recovery) {
    const withoutRecovery: ToolFailure = {
      ok: false,
      tool: result.tool,
      actionId: boundedActionId(result.actionId),
      error: {
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
        ...(result.error.fieldErrors
          ? { fieldErrors: result.error.fieldErrors }
          : {}),
      },
      stateRevision: result.stateRevision,
    };
    const withoutRecJson = JSON.stringify(withoutRecovery);
    if (withoutRecJson.length <= MAX_SERIALIZED_LENGTH) {
      return withoutRecJson;
    }
  }

  if (result.error.fieldErrors) {
    const withoutFieldErrors: ToolFailure = {
      ok: false,
      tool: result.tool,
      actionId: boundedActionId(result.actionId),
      error: {
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
        ...(result.error.recovery ? { recovery: result.error.recovery } : {}),
      },
      stateRevision: result.stateRevision,
    };
    const failJson = JSON.stringify(withoutFieldErrors);
    if (failJson.length <= MAX_SERIALIZED_LENGTH) {
      return failJson;
    }
  }

  const safeFailure: ToolFailure = {
    ok: false,
    tool: result.tool,
    actionId: boundedActionId(result.actionId),
    error: {
      code: result.error.code.length <= 32 ? result.error.code : 'ERROR',
      message:
        'Operation failed. Error details omitted to respect payload limit.',
      recoverable: result.error.recoverable,
    },
    stateRevision: result.stateRevision,
  };
  const safeFailJson = JSON.stringify(safeFailure);
  if (safeFailJson.length <= MAX_SERIALIZED_LENGTH) {
    return safeFailJson;
  }

  return JSON.stringify({
    ok: false,
    tool: result.tool,
    actionId: boundedActionId(result.actionId),
    error: {
      code: 'ERROR',
      message: 'Operation failed',
      recoverable: false,
    },
    stateRevision: result.stateRevision,
  });
}
