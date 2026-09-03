import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface CompanionPinDialogProps {
  errorMessage?: string;
  busy?: boolean;
  onEnable: (accessPin: string) => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function CompanionPinDialog({
  errorMessage,
  busy = false,
  onEnable,
  onCancel,
}: CompanionPinDialogProps) {
  const headingId = useId();
  const inputId = useId();
  const errorId = useId();
  const progressId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const [accessPin, setAccessPin] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!modal.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [busy, onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="tool-confirmation-modal-backdrop" role="presentation">
      <section
        ref={modalRef}
        className="tool-confirmation-modal companion-pin-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby={headingId}
        aria-describedby={
          [busy ? progressId : undefined, errorMessage ? errorId : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        }
        data-testid="companion-pin-dialog"
      >
        <div className="tool-confirmation-modal-header">
          <div>
            <p className="eyebrow">Live voice assistant</p>
            <h2 id={headingId}>Enable Live Voice Assistant</h2>
          </div>
        </div>
        <form
          className="companion-pin-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            onEnable(accessPin);
            setAccessPin('');
          }}
        >
          <div className="companion-pin-dialog-field">
            <label htmlFor={inputId}>Companion access code</label>
            <input
              ref={inputRef}
              id={inputId}
              type="password"
              name="companion-access-code"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={accessPin}
              disabled={busy}
              onChange={(event) => setAccessPin(event.target.value)}
            />
          </div>
          {busy ? (
            <p
              id={progressId}
              className="companion-pin-dialog-progress"
              role="status"
              aria-live="polite"
              aria-label="Checking access code and establishing secure connection"
            >
              <span
                className="companion-pin-dialog-spinner"
                role="progressbar"
                aria-label="Checking access code and establishing secure connection"
                aria-valuetext="Checking access code and establishing secure connection"
              />
              <span>
                Checking access code and establishing secure connection…
              </span>
            </p>
          ) : null}
          {errorMessage ? (
            <p
              id={errorId}
              className="tool-confirmation-modal-error"
              role="alert"
            >
              <span
                className="companion-pin-dialog-status-icon"
                aria-hidden="true"
              >
                !
              </span>
              <span>{errorMessage}</span>
            </p>
          ) : null}
          <div className="tool-confirmation-modal-actions">
            <button
              type="submit"
              className="tool-confirm-button"
              disabled={busy}
            >
              Enable Live
            </button>
            <button
              type="button"
              className="tool-cancel-button"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
