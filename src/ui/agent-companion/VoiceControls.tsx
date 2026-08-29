export interface VoiceControlsProps {
  isListening: boolean;
  disabled?: boolean;
  speechAloud: boolean;
  hasAssistantResponse: boolean;
  onToggleListening: () => void;
  onReadCurrentSection: () => void;
  onToggleSpeechAloud: (enabled: boolean) => void;
  onRepeatSpeech: () => void;
  onSpeakSlower: () => void;
}

export function VoiceControls({
  isListening,
  disabled = false,
  speechAloud,
  hasAssistantResponse,
  onToggleListening,
  onReadCurrentSection,
  onToggleSpeechAloud,
  onRepeatSpeech,
  onSpeakSlower,
}: VoiceControlsProps) {
  return (
    <div className="assistant-voice-controls">
      <div className="assistant-voice-buttons">
        <button
          type="button"
          className={`assistant-voice-button ${isListening ? 'assistant-voice-button--listening' : ''}`}
          onClick={onToggleListening}
          disabled={disabled}
          aria-pressed={isListening}
        >
          <span className="assistant-voice-icon" aria-hidden="true">
            {isListening ? '⏹' : '🎤'}
          </span>
          {isListening ? 'Stop listening' : 'Start listening'}
        </button>

        <button
          type="button"
          className="assistant-read-section-button"
          onClick={onReadCurrentSection}
        >
          <span className="assistant-voice-icon" aria-hidden="true">
            📖
          </span>
          Read current section
        </button>
      </div>

      <div className="assistant-speech-options">
        <label className="assistant-speech-checkbox-label">
          <input
            type="checkbox"
            checked={speechAloud}
            onChange={(e) => onToggleSpeechAloud(e.target.checked)}
            className="assistant-speech-checkbox"
          />
          Read assistant responses aloud
        </label>

        {speechAloud && hasAssistantResponse ? (
          <div className="assistant-speech-actions">
            <button
              type="button"
              className="assistant-speech-action-button"
              onClick={onRepeatSpeech}
            >
              Repeat last response
            </button>
            <button
              type="button"
              className="assistant-speech-action-button"
              onClick={onSpeakSlower}
            >
              Speak slower
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
