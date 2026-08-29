import { useId, useState, type FormEvent } from 'react';

export interface AssistantComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function AssistantComposer({
  onSend,
  disabled = false,
}: AssistantComposerProps) {
  const inputId = useId();
  const [inputText, setInputText] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInputText('');
  };

  return (
    <form className="assistant-composer" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        Message the assistant
      </label>
      <div className="assistant-composer-input-row">
        <input
          id={inputId}
          aria-label="Message the assistant"
          className="assistant-composer-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question or request guidance..."
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="submit"
          className="assistant-send-button"
          disabled={disabled || !inputText.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
