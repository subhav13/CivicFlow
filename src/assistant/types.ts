import type { RegisteredToolRef } from '../webmcp/model-context-port';
import type { ConfirmationDraft } from './tool-confirmation-view-model';

export interface CurrentToolSurface {
  snapshot(signal?: AbortSignal): Promise<RegisteredToolRef[]>;
  execute(
    name: string,
    argumentsJson: string,
    signal?: AbortSignal,
  ): Promise<string>;
  subscribe(listener: () => void): () => void;
}

export interface ProviderFunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  callId: string;
  name: string;
  argumentsJson: string;
}

export type ToolBridgeResponse =
  | { kind: 'result'; callId: string; result: string }
  | {
      kind: 'confirmation_required';
      callId: string;
      toolName: string;
      message: string;
      draft: ConfirmationDraft;
    }
  | {
      kind: 'invalid_arguments';
      code: 'INVALID_ARGUMENTS';
      callId: string;
      toolName: string;
      message: string;
      providedFields: readonly string[];
      missingFields: readonly string[];
      invalidFields: readonly string[];
    }
  | { kind: 'error'; callId: string; message: string };
