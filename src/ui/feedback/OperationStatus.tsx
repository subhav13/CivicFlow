import { useEffect } from 'react';
import {
  getFriendlyOperationLabel,
  type OperationState,
} from '../../application/operation-feedback';

export interface OperationStatusProps {
  operation: OperationState | null;
  onDismiss?: (actionId?: string) => void;
  autoDismissMs?: number;
}

export function OperationStatus({
  operation,
  onDismiss,
  autoDismissMs = 4000,
}: OperationStatusProps) {
  useEffect(() => {
    if (!operation || operation.phase !== 'succeeded' || autoDismissMs <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      onDismiss?.(operation.actionId);
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [operation, onDismiss, autoDismissMs]);

  if (!operation) {
    return null;
  }

  const isBusy =
    operation.phase === 'validating' || operation.phase === 'applying';
  const sourceLabel = operation.source === 'webmcp' ? 'Site Tool' : 'Human';
  const friendlyLabel = getFriendlyOperationLabel(
    operation.label,
    operation.toolName,
  );

  let statusMessage: string;
  if (operation.phase === 'validating') {
    statusMessage = `Validating ${friendlyLabel}...`;
  } else if (operation.phase === 'applying') {
    statusMessage = `Applying ${friendlyLabel}...`;
  } else if (operation.phase === 'succeeded') {
    statusMessage = `${friendlyLabel} succeeded.`;
  } else {
    statusMessage = operation.recovery?.message ?? `${friendlyLabel} failed.`;
  }

  return (
    <aside
      className={`operation-status operation-status-${operation.phase}`}
      role="region"
      aria-label="Operation status"
      aria-live="polite"
      aria-busy={isBusy ? 'true' : 'false'}
      data-testid="operation-status"
      data-action-id={operation.actionId}
      data-source={operation.source}
      data-phase={operation.phase}
      data-section={operation.section}
    >
      <div className="operation-status-content">
        <span className="operation-source-badge">{sourceLabel}</span>
        <span className="operation-phase-indicator" aria-hidden="true">
          {isBusy ? '◌' : operation.phase === 'succeeded' ? '✓' : '!'}
        </span>
        <span className="operation-status-text">
          <strong>{sourceLabel}:</strong> {statusMessage}
        </span>
        {operation.afterRevision !== undefined && (
          <span
            className="operation-revision"
            aria-label={`Revision ${operation.afterRevision}`}
          >
            (r{operation.afterRevision})
          </span>
        )}
      </div>
      {operation.toolName && (
        <details className="operation-technical-details">
          <summary>Technical details</summary>
          <div className="operation-technical-content">
            <span>
              Tool: <code>{operation.toolName}</code>
            </span>
            {operation.actionId && (
              <span>
                Action ID: <code>{operation.actionId}</code>
              </span>
            )}
          </div>
        </details>
      )}
      {operation.phase === 'failed' && onDismiss && (
        <button
          type="button"
          className="operation-dismiss-button"
          onClick={() => onDismiss(operation.actionId)}
          aria-label="Dismiss failure notice"
        >
          Dismiss
        </button>
      )}
    </aside>
  );
}
