import { useEffect, useRef } from 'react';

import type { ActivityEntry, CapabilitySummary } from '../../application/store';

interface AgentCompanionProps {
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

function ActivityItemView({ entry }: { entry: ActivityEntry }) {
  const isAgent = entry.source === 'webmcp';
  const sourceText = isAgent ? 'Agent action' : 'Human action';
  const hasRevision =
    entry.beforeRevision !== undefined && entry.afterRevision !== undefined;

  return (
    <li
      key={entry.id}
      className={`activity-entry activity-source-${entry.source ?? 'human'} activity-status-${entry.status ?? 'succeeded'}`}
      data-activity-id={entry.id}
      data-source={entry.source}
      data-status={entry.status}
      data-section={entry.section}
    >
      <div className="activity-entry-header">
        <span className="activity-source-label">{sourceText}</span>
        {entry.status && (
          <span className={`activity-status-badge is-${entry.status}`}>
            {entry.status}
          </span>
        )}
        {entry.section && (
          <span className="activity-section-tag">{entry.section}</span>
        )}
        {hasRevision && (
          <span className="activity-revision-tag">
            r{entry.beforeRevision} → r{entry.afterRevision}
          </span>
        )}
        {entry.occurredAt && (
          <time className="activity-time" dateTime={entry.occurredAt}>
            {new Date(entry.occurredAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </time>
        )}
      </div>
      <span className="activity-summary">{entry.summary}</span>
    </li>
  );
}

function CompanionContent({
  capabilities,
  activity = [],
}: {
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
}) {
  const latestActivity = activity[0];
  const statusSummary =
    capabilities.length === 0
      ? 'No Site Tools currently enabled.'
      : `${capabilities.length} Site Tools currently available.`;

  const filteredCapabilities = capabilities.filter(
    (cap) =>
      !cap.id.includes('submit') &&
      !cap.summary.toLowerCase().includes('submit'),
  );

  return (
    <>
      <div className="companion-heading">
        <div>
          <p className="eyebrow">Optional helper</p>
          <h2>Agent Companion</h2>
        </div>
        <span className="companion-badge">
          {filteredCapabilities.length > 0 ? 'WebMCP Active' : 'Local'}
        </span>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {statusSummary}{' '}
        {latestActivity ? `Latest action: ${latestActivity.summary}` : ''}
      </div>

      {/* 1. Latest Activity Section — rendered before capabilities */}
      <div className="companion-section companion-activity-section">
        <h3 className="companion-section-title">Latest Activity</h3>
        {latestActivity ? (
          <div className="latest-activity-wrapper">
            <ul
              className="activity-list latest-activity-single"
              aria-label="Latest action"
            >
              <ActivityItemView entry={latestActivity} />
            </ul>

            {activity.length > 1 && (
              <details className="companion-activity-details">
                <summary className="activity-disclosure-summary">
                  All Activity ({activity.length})
                </summary>
                <ul
                  className="activity-list activity-history-list"
                  aria-label="Prior actions"
                >
                  {activity.slice(1, 20).map((entry) => (
                    <ActivityItemView key={entry.id} entry={entry} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : (
          <div className="companion-empty">
            <span className="companion-empty-icon" aria-hidden="true">
              ◇
            </span>
            <p>No actions recorded yet.</p>
            <small>
              Human and agent actions will appear here in real time.
            </small>
          </div>
        )}
      </div>

      {/* 2. Page Capabilities Section — rendered after activity */}
      <div className="companion-section">
        <h3 className="companion-section-title">Page Capabilities</h3>
        {filteredCapabilities.length === 0 ? (
          <div className="companion-empty">
            <span className="companion-empty-icon" aria-hidden="true">
              ◇
            </span>
            <p>No Site Tools are enabled yet.</p>
            <small>
              This workspace is fully usable by hand. WebMCP capabilities appear
              here dynamically when registered by the page.
            </small>
          </div>
        ) : (
          <ul className="capability-list" aria-label="Available capabilities">
            {filteredCapabilities.map((capability) => (
              <li key={capability.id}>
                <strong>{capability.id}</strong>
                <span>{capability.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function AgentCompanion({
  capabilities,
  activity = [],
  isOpen,
  onClose,
  onOpen,
}: AgentCompanionProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      closeRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <aside className="companion-panel" aria-label="Agent Companion">
        <CompanionContent capabilities={capabilities} activity={activity} />
        <button
          ref={triggerRef}
          className="companion-mobile-trigger"
          type="button"
          onClick={onOpen}
          aria-expanded={isOpen}
          aria-controls="agent-companion-dialog"
        >
          Open Agent Companion
        </button>
      </aside>

      {isOpen ? (
        <div className="companion-dialog-backdrop" role="presentation">
          <section
            className="companion-dialog"
            id="agent-companion-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-companion-dialog-heading"
          >
            <div className="companion-dialog-header">
              <h2 id="agent-companion-dialog-heading">Agent Companion</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close Agent Companion"
              >
                ×
              </button>
            </div>
            <CompanionContent capabilities={capabilities} activity={activity} />
          </section>
        </div>
      ) : null}
    </>
  );
}
