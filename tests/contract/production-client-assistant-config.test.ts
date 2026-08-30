import { describe, expect, it } from 'vitest';
import { loadEnv } from 'vite';

import { resolveAssistantEnabled } from '../../src/app/client-voice-gate';

describe('production client assistant configuration', () => {
  it('keeps the public assistant enabled in a clean production build', () => {
    const env = loadEnv('production', process.cwd(), 'VITE_');

    expect(env.VITE_CIVICFLOW_VOICE_ENABLED).toBe('1');
    expect(
      resolveAssistantEnabled({
        DEV: false,
        VITE_CIVICFLOW_LIVE_AUDIT: env.VITE_CIVICFLOW_LIVE_AUDIT,
        VITE_CIVICFLOW_VOICE_ENABLED: env.VITE_CIVICFLOW_VOICE_ENABLED,
      }),
    ).toBe(true);
  });
});
