import type { OperationState } from '../../application/operation-feedback';
import type { SectionId } from '../../domain';

export interface RecoveryBannerProps {
  operation: OperationState | null;
  onNavigate?: (section: SectionId, focusTargetId?: string) => void;
  onDismiss?: (actionId?: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  about: 'About You',
  household: 'Household',
  income: 'Income',
  coverage: 'Current Coverage',
  documents: 'Documents',
  review: 'Review & Sign',
};

export function RecoveryBanner({
  operation,
  onNavigate,
  onDismiss,
}: RecoveryBannerProps) {
  if (!operation || operation.phase !== 'failed' || !operation.recovery) {
    return null;
  }

  const { recovery, actionId, beforeRevision } = operation;
  const sectionId = recovery.section as SectionId;
  const sectionLabel = SECTION_LABELS[recovery.section] ?? recovery.section;

  return (
    <aside
      className="recovery-banner"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="recovery-banner"
      data-action-id={actionId}
      data-revision={beforeRevision}
      data-section={recovery.section}
    >
      <div className="recovery-banner-body">
        <div className="recovery-banner-header">
          <span className="recovery-banner-icon" aria-hidden="true">
            ⚠
          </span>
          <span className="recovery-banner-badge">{sectionLabel}</span>
          <strong className="recovery-banner-title">Action Required</strong>
          <span
            className="recovery-banner-meta"
            aria-label={`Action ${actionId} at revision ${beforeRevision}`}
          >
            (r{beforeRevision})
          </span>
        </div>
        <p className="recovery-banner-message">{recovery.message}</p>
        {recovery.requiredFields && recovery.requiredFields.length > 0 && (
          <div className="recovery-banner-fields">
            <span className="recovery-fields-label">Required details:</span>
            <ul className="recovery-fields-list">
              {recovery.requiredFields.map((field) => (
                <li key={field} className="recovery-field-item">
                  <code>{field}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="recovery-banner-actions">
        {onNavigate && (
          <button
            type="button"
            className="recovery-banner-nav-btn"
            onClick={() => onNavigate(sectionId, recovery.focusTargetId)}
            data-testid="recovery-banner-navigate"
          >
            Go to {sectionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="recovery-banner-dismiss-btn"
            onClick={() => onDismiss(actionId)}
            aria-label="Dismiss recovery notice"
            data-testid="recovery-banner-dismiss"
          >
            Dismiss
          </button>
        )}
      </div>
    </aside>
  );
}
