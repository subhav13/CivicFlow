import { useId, useState, type FormEvent } from 'react';

export interface AssistantComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  sendDisabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function AssistantComposer({
  onSend,
  disabled = false,
  sendDisabled = false,
  value,
  onValueChange,
}: AssistantComposerProps) {
  const inputId = useId();
  const [internalInputText, setInternalInputText] = useState('');
  const inputText = value ?? internalInputText;
  const setInputText = (nextValue: string) => {
    if (value === undefined) setInternalInputText(nextValue);
    onValueChange?.(nextValue);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || disabled || sendDisabled) return;
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
          disabled={disabled || sendDisabled || !inputText.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
