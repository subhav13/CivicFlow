import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import type { ConfirmationDraft } from '../../assistant/tool-confirmation-view-model';
import type { PendingToolConfirmation } from './ToolConfirmationCard';

export interface ToolConfirmationModalProps {
  confirmation: PendingToolConfirmation & { draft: ConfirmationDraft };
  status: 'confirming' | 'applying' | 'failed';
  failureMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onNeedCorrection: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function ToolConfirmationModal({
  confirmation,
  status,
  failureMessage,
  onConfirm,
  onCancel,
  onNeedCorrection,
}: ToolConfirmationModalProps) {
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    primaryActionRef.current?.focus();
  }, [confirmation.callId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (status === 'applying') return;
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
  }, [onCancel, status]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="tool-confirmation-modal-backdrop" role="presentation">
      <section
        ref={modalRef}
        className="tool-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-confirmation-modal-heading"
        aria-describedby="tool-confirmation-modal-message"
        data-testid="tool-confirmation-modal"
      >
        <div className="tool-confirmation-modal-header">
          <div>
            <p className="eyebrow">Review proposed change</p>
            <h2 id="tool-confirmation-modal-heading">
              {confirmation.draft.title}
            </h2>
          </div>
          <span className="tool-confirmation-modal-badge" aria-hidden="true">
            Draft preview
          </span>
        </div>

        <p
          id="tool-confirmation-modal-message"
          className="tool-confirmation-modal-message"
        >
          {confirmation.message}
        </p>
        <p className="tool-confirmation-modal-instructions">
          This is the review screen for the proposed change. Say “I confirm
          these details, add it” or choose Confirm and apply. To change
          something, say “It&apos;s not correct” or choose Need correction.
        </p>

        <dl className="tool-confirmation-modal-fields">
          {confirmation.draft.fields.map((field) => (
            <div className="tool-confirmation-modal-field" key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>

        {status === 'applying' ? (
          <p className="tool-confirmation-modal-status" role="status">
            Applying this change…
          </p>
        ) : null}
        {status === 'failed' && failureMessage ? (
          <p className="tool-confirmation-modal-error" role="alert">
            {failureMessage}
          </p>
        ) : null}

        <div className="tool-confirmation-modal-actions">
          <button
            ref={primaryActionRef}
            type="button"
            className="tool-confirm-button"
            onClick={onConfirm}
            disabled={status !== 'confirming'}
          >
            Confirm and apply
          </button>
          <button
            type="button"
            className="tool-correction-button"
            onClick={onNeedCorrection}
            disabled={status !== 'confirming'}
          >
            Need correction
          </button>
          <button
            type="button"
            className="tool-cancel-button"
            onClick={onCancel}
            disabled={status === 'applying'}
          >
            Cancel
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
