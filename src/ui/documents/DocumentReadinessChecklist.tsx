import type { AttachDemoDocumentInput } from '../../application/commands';
import type { DocumentRequirement } from '../../domain/document-readiness';

export interface DocumentReadinessChecklistProps {
  readonly requirements: readonly DocumentRequirement[];
  readonly onAttachPreset?: (preset: AttachDemoDocumentInput) => void;
  readonly disabled?: boolean;
}

export function DocumentReadinessChecklist({
  requirements,
  onAttachPreset,
  disabled = false,
}: DocumentReadinessChecklistProps) {
  return (
    <div className="document-readiness-checklist">
      <ul
        className="readiness-list"
        aria-label="Document requirements checklist"
      >
        {requirements.map((req) => {
          const isMissing = req.status === 'missing';
          const isAttached = req.status === 'attached';
          const badgeText = isAttached
            ? 'Attached'
            : isMissing
              ? 'Missing'
              : 'Optional';

          const badgeClass = isAttached
            ? 'readiness-badge-attached'
            : isMissing
              ? 'readiness-badge-missing'
              : 'readiness-badge-optional';

          return (
            <li
              key={req.id}
              className={`readiness-item readiness-item-${req.status}`}
            >
              <div className="readiness-item-main">
                <div className="readiness-item-header">
                  <span className="readiness-item-label">{req.label}</span>
                  <span
                    className={`readiness-badge ${badgeClass}`}
                    aria-label={`Status: ${badgeText}`}
                  >
                    {badgeText}
                  </span>
                </div>
                <p className="readiness-item-reason">{req.reason}</p>
              </div>

              {isMissing && req.presetButtonLabel && onAttachPreset ? (
                <div className="readiness-item-action">
                  <button
                    type="button"
                    className="secondary-button readiness-attach-btn"
                    aria-label={`Attach ${req.label.toLowerCase()}`}
                    disabled={disabled}
                    onClick={() =>
                      onAttachPreset({
                        kind: req.kind,
                        displayName: req.presetDisplayName ?? req.label,
                      })
                    }
                  >
                    {req.presetButtonLabel}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
