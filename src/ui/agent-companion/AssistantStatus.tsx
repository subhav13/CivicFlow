import type { SessionState } from '../../assistant/session-state';

export interface AssistantStatusProps {
  status: SessionState['status'];
  enabled: boolean;
  errorMessage?: string;
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  isConfirming?: boolean;
  isApplying?: boolean;
}

export function AssistantStatus({
  status,
  enabled,
  errorMessage,
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  isConfirming = false,
  isApplying = false,
}: AssistantStatusProps) {
  if (!enabled) {
    return (
      <div className="assistant-status assistant-status--unavailable">
        <span className="status-dot status-dot--inactive" aria-hidden="true" />
        <span>Text-only mode. Secure assistant session is unavailable.</span>
      </div>
    );
  }

  let statusText = 'Disconnected';
  let dotClass = 'status-dot--inactive';

  switch (status) {
    case 'connected':
      if (isConfirming) {
        statusText = 'Confirming...';
        dotClass = 'status-dot--pending';
      } else if (isApplying) {
        statusText = 'Applying...';
        dotClass = 'status-dot--pending';
      } else if (isSpeaking) {
        statusText = 'Speaking...';
        dotClass = 'status-dot--active';
      } else if (isThinking) {
        statusText = 'Thinking...';
        dotClass = 'status-dot--pending';
      } else if (isListening) {
        statusText = 'Listening...';
        dotClass = 'status-dot--active';
      } else {
        statusText = 'Connected';
        dotClass = 'status-dot--active';
      }
      break;
    case 'connecting':
      statusText = 'Connecting to assistant...';
      dotClass = 'status-dot--pending';
      break;
    case 'error':
      statusText = errorMessage
        ? `Assistant error: ${errorMessage}`
        : 'Assistant error';
      dotClass = 'status-dot--error';
      break;
    case 'idle':
    default:
      statusText = 'Disconnected';
      dotClass = 'status-dot--inactive';
      break;
  }

  return (
    <div className="assistant-status" role="status">
      <span className={`status-dot ${dotClass}`} aria-hidden="true" />
      <span>{statusText}</span>
    </div>
  );
}
