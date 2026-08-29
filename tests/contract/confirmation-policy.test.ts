import { describe, expect, it } from 'vitest';

import type { RegisteredToolRef } from '../../src/webmcp/model-context-port';

function makeTool(
  name: string,
  options: Partial<RegisteredToolRef> = {},
): RegisteredToolRef {
  return {
    name,
    title: name.replaceAll('_', ' '),
    description: `Description for ${name}`,
    inputSchema: { type: 'object', additionalProperties: false },
    ...options,
  };
}

describe('Confirmation policy Contract (Phase 2 Packet 2.3)', () => {
  it('allows read-only tools without mutation confirmation', async () => {
    const { classifyToolIntent } = await import(
      /* @vite-ignore */
      '../../src/assistant/confirmation-policy'
    );

    expect(
      classifyToolIntent(
        makeTool('get_application_progress', {
          annotations: { readOnlyHint: true },
        }),
      ),
    ).toMatchObject({ intent: 'read', kind: 'allow' });
  });

  it('allows navigation without mutation confirmation', async () => {
    const { classifyToolIntent } = await import(
      /* @vite-ignore */
      '../../src/assistant/confirmation-policy'
    );

    expect(classifyToolIntent(makeTool('navigate_to_section'))).toMatchObject({
      intent: 'navigation',
      kind: 'allow',
    });
  });

  it('requires explicit confirmation for an application mutation', async () => {
    const { classifyToolIntent } = await import(
      /* @vite-ignore */
      '../../src/assistant/confirmation-policy'
    );

    expect(classifyToolIntent(makeTool('add_household_member'))).toMatchObject({
      intent: 'mutation',
      kind: 'confirm',
    });
    expect(classifyToolIntent(makeTool('get_remove_member'))).toMatchObject({
      intent: 'mutation',
      kind: 'confirm',
    });
  });

  it('forbids submission-like tool names even when future registrations are malformed', async () => {
    const { classifyToolIntent } = await import(
      /* @vite-ignore */
      '../../src/assistant/confirmation-policy'
    );

    expect(
      classifyToolIntent(
        makeTool('future_action', {
          title: 'Submit application',
          description: 'Attest and submit the application',
        }),
      ),
    ).toMatchObject({ intent: 'forbidden', kind: 'deny' });
    expect(classifyToolIntent(makeTool('submitApplication'))).toMatchObject({
      intent: 'forbidden',
      kind: 'deny',
    });
    expect(classifyToolIntent(makeTool('attestApplication'))).toMatchObject({
      intent: 'forbidden',
      kind: 'deny',
    });
  });

  it('returns a plain-language confirmation request without exposing raw arguments', async () => {
    const { classifyToolIntent } = await import(
      /* @vite-ignore */
      '../../src/assistant/confirmation-policy'
    );

    const decision = classifyToolIntent(makeTool('set_current_coverage'));

    expect(decision).toMatchObject({ intent: 'mutation', kind: 'confirm' });
    expect('message' in decision ? decision.message : '').toMatch(
      /confirm|set current coverage/i,
    );
    expect(JSON.stringify(decision)).not.toContain('arguments');
  });
});
