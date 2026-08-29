export interface TimelineMessage {
  id: string;
  role: 'user' | 'assistant' | 'guidance';
  text: string;
  interim?: boolean;
}

export interface ConversationTimelineProps {
  messages: readonly TimelineMessage[];
}

export function ConversationTimeline({ messages }: ConversationTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className="conversation-timeline conversation-timeline--empty">
        <p className="conversation-timeline-empty-text">
          No conversation yet. Type a question or start listening to get
          assistance.
        </p>
      </div>
    );
  }

  return (
    <div
      className="conversation-timeline"
      role="log"
      aria-label="Conversation history"
      aria-live="polite"
    >
      <ul className="conversation-message-list">
        {messages.map((msg) => {
          let roleClass = msg.interim
            ? 'conversation-message--assistant conversation-message--interim'
            : 'conversation-message--assistant';
          let roleLabel = 'Assistant';
          if (msg.role === 'user') {
            roleClass = msg.interim
              ? 'conversation-message--user conversation-message--interim'
              : 'conversation-message--user';
            roleLabel = 'You';
          } else if (msg.role === 'guidance') {
            roleClass = 'conversation-message--guidance';
            roleLabel = 'Section guidance';
          }

          return (
            <li key={msg.id} className={`conversation-message ${roleClass}`}>
              <div className="conversation-message-header">
                <span className="conversation-message-sender">{roleLabel}</span>
                {msg.interim ? (
                  <span className="conversation-message-interim-badge">
                    {msg.role === 'user' ? 'Listening...' : 'Speaking...'}
                  </span>
                ) : null}
              </div>
              <p className="conversation-message-text">{msg.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
