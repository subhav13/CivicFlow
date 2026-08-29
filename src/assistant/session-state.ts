export type SessionState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'error'; message: string; recoverable: boolean };

export type SessionStateEvent =
  | { type: 'connect' }
  | { type: 'connected' }
  | { type: 'disconnect' }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'retry' };

export function createInitialSessionState(): SessionState {
  return { status: 'idle' };
}

export function transitionSessionState(
  state: SessionState,
  event: SessionStateEvent,
): SessionState {
  void state;
  switch (event.type) {
    case 'connect':
    case 'retry':
      return { status: 'connecting' };
    case 'connected':
      return { status: 'connected' };
    case 'disconnect':
      return { status: 'idle' };
    case 'error':
      return {
        status: 'error',
        message: event.message,
        recoverable: event.recoverable,
      };
  }
}
