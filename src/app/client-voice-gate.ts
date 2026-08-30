export interface CivicFlowClientEnvironment {
  DEV: boolean;
  VITE_CIVICFLOW_LIVE_AUDIT?: string;
  VITE_CIVICFLOW_VOICE_ENABLED?: string;
}

export function resolveAssistantEnabled(
  env: CivicFlowClientEnvironment,
): boolean {
  const localAuditEnabled = env.DEV && env.VITE_CIVICFLOW_LIVE_AUDIT === '1';
  const publicVoiceEnabled = env.VITE_CIVICFLOW_VOICE_ENABLED === '1';
  return localAuditEnabled || publicVoiceEnabled;
}
