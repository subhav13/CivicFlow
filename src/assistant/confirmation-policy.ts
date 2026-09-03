import type { RegisteredToolRef } from '../webmcp/model-context-port';

export type ToolIntent = 'read' | 'navigation' | 'mutation' | 'forbidden';

export type ToolIntentDecision =
  | { kind: 'allow'; intent: 'read' | 'navigation' }
  | { kind: 'confirm'; intent: 'mutation'; message: string }
  | { kind: 'deny'; intent: 'forbidden'; message: string };

const FORBIDDEN_PATTERN = /(submit|attest|submission|attestation)/i;

const KNOWN_READ_ONLY_NAMES: Record<string, true> = {
  get_application_progress: true,
  get_next_actions: true,
  list_uploaded_documents: true,
};

const KNOWN_NAVIGATION_NAMES: Record<string, true> = {
  navigate_to_section: true,
};

function isForbidden(tool: RegisteredToolRef): boolean {
  const targets = [tool.name, tool.title, tool.description].filter(Boolean);
  return targets.some((text) => FORBIDDEN_PATTERN.test(text));
}

function isReadOnly(tool: RegisteredToolRef): boolean {
  if (tool.annotations?.readOnlyHint) {
    return true;
  }
  return Boolean(KNOWN_READ_ONLY_NAMES[tool.name]);
}

export function classifyToolIntent(
  tool: RegisteredToolRef,
): ToolIntentDecision {
  if (isForbidden(tool)) {
    return {
      kind: 'deny',
      intent: 'forbidden',
      message: 'Submission and attestation actions are strictly forbidden.',
    };
  }

  if (KNOWN_NAVIGATION_NAMES[tool.name]) {
    return {
      kind: 'allow',
      intent: 'navigation',
    };
  }

  if (isReadOnly(tool)) {
    return {
      kind: 'allow',
      intent: 'read',
    };
  }

  const label = tool.title?.trim() || tool.name.replaceAll('_', ' ');
  return {
    kind: 'confirm',
    intent: 'mutation',
    message: `Please confirm you want to perform: ${label}`,
  };
}
