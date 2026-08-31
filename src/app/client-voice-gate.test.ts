import { describe, expect, it } from 'vitest';

import { resolveAssistantEnabled } from './client-voice-gate';

describe('CivicFlow client voice gate', () => {
  it('enables production voice only through the explicit client gate', () => {
    expect(
      resolveAssistantEnabled({
        DEV: false,
        VITE_CIVICFLOW_LIVE_AUDIT: '1',
        VITE_CIVICFLOW_VOICE_ENABLED: '0',
      }),
    ).toBe(false);
    expect(
      resolveAssistantEnabled({
        DEV: false,
        VITE_CIVICFLOW_VOICE_ENABLED: '1',
      }),
    ).toBe(true);
  });

  it('retains the development-only local audit compatibility path', () => {
    expect(
      resolveAssistantEnabled({
        DEV: true,
        VITE_CIVICFLOW_LIVE_AUDIT: '1',
        VITE_CIVICFLOW_VOICE_ENABLED: '0',
      }),
    ).toBe(true);
    expect(
      resolveAssistantEnabled({
        DEV: true,
        VITE_CIVICFLOW_LIVE_AUDIT: '0',
        VITE_CIVICFLOW_VOICE_ENABLED: '0',
      }),
    ).toBe(false);
  });
});
