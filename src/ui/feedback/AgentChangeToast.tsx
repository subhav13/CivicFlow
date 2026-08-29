import type { OperationState } from '../../application/operation-feedback';
import { getFriendlyOperationLabel } from '../../application/operation-feedback';
import { SECTION_META } from '../layout/section-meta';

export interface AgentChangeToastProps {
  operation: OperationState | null | undefined;
  activeSection: string;
  onDismiss?: (actionId?: string) => void;
}

export function AgentChangeToast({
  operation,
  activeSection,
  onDismiss,
}: AgentChangeToastProps) {
  if (
    !operation ||
    operation.source !== 'webmcp' ||
    (operation.phase !== 'succeeded' && operation.phase !== 'failed') ||
    operation.section === activeSection
  ) {
    return null;
  }
  const isFailed = operation.phase === 'failed';
  const sectionMeta = SECTION_META.find((s) => s.id === operation.section);
  const sectionLabel = sectionMeta ? sectionMeta.label : operation.section;
  const friendlyLabel = getFriendlyOperationLabel(
    operation.label,
    operation.toolName,
  );

  const messageText = isFailed
    ? `Failed in ${sectionLabel}: ${friendlyLabel}`
    : `Updated ${sectionLabel}: ${friendlyLabel}`;

  return (
    <aside
      className={`agent-change-toast ${isFailed ? 'is-failed' : 'is-succeeded'}`}
      role="status"
      aria-live="polite"
      aria-label={
        isFailed
          ? 'Agent action failed in another section'
          : 'Agent update in another section'
      }
      data-testid="agent-change-toast"
      data-action-id={operation.actionId}
      data-section={operation.section}
    >
      <div className="agent-change-toast-content">
        <span className="agent-change-toast-badge">Site Tool</span>
        <span className="agent-change-toast-message">{messageText}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="agent-change-toast-dismiss"
          onClick={() => onDismiss(operation.actionId)}
          aria-label={
            isFailed ? 'Dismiss failed agent action' : 'Dismiss agent update'
          }
        >
          Dismiss
        </button>
      )}
    </aside>
  );
}
