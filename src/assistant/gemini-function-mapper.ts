import type { RegisteredToolRef } from '../webmcp/model-context-port';
import type { ProviderFunctionTool } from './types';

export function mapRegisteredTool(
  tool: RegisteredToolRef,
): ProviderFunctionTool {
  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };
}

export function mapRegisteredTools(
  tools: readonly RegisteredToolRef[],
): ProviderFunctionTool[] {
  return tools.map(mapRegisteredTool);
}
