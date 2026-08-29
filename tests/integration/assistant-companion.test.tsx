import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AssistantController } from '../../src/assistant/assistant-controller';
import { AgentCompanion } from '../../src/ui/agent-companion/AgentCompanion';

function makeController() {
  const listeners = new Set<(event: never) => void>();
  return {
    connect: async () => {},
    retry: async () => {},
    disconnect: () => {},
    startMicrophone: async () => {},
    stopMicrophone: () => {},
    sendText: vi.fn(),
    confirmToolCall: async () => {},
    cancelToolCall: () => {},
    dispose: () => {},
    getState: () => ({ status: 'connected' as const }),
    subscribe: (listener: (event: never) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as AssistantController;
}

describe('Phase 4 AgentCompanion integration', () => {
  it('keeps the assistant panel inside the existing themed companion surface', () => {
    render(
      <AgentCompanion
        capabilities={[]}
        activity={[]}
        assistantController={makeController()}
        onReadCurrentSection={() => 'Visible section copy'}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    const panel = screen.getByRole('region', { name: /assistant panel/i });
    expect(panel).toHaveClass('assistant-panel');
    expect(
      screen.getByRole('button', { name: /read current section/i }),
    ).toBeInTheDocument();
  });

  it('keeps the visible current-section action local and text/voice on one controller', () => {
    const controller = makeController();
    render(
      <AgentCompanion
        capabilities={[]}
        activity={[]}
        assistantController={controller}
        onReadCurrentSection={() => 'Visible section copy'}
        isOpen={false}
        onClose={() => {}}
        onOpen={() => {}}
      />,
    );

    fireEvent.change(
      screen.getByRole('textbox', { name: /message the assistant/i }),
      { target: { value: 'Show my progress' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    fireEvent.click(
      screen.getByRole('button', { name: /read current section/i }),
    );

    expect(controller.sendText).toHaveBeenCalledWith('Show my progress');
    expect(screen.getByText('Visible section copy')).toBeInTheDocument();
  });
});
