import { useEffect, useRef } from 'react';

import type { ActivityEntry, CapabilitySummary } from '../../application/store';

interface AgentCompanionProps {
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

function CompanionContent({
  capabilities,
  activity = [],
}: {
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
}) {
  const latestActivity = activity[0]?.summary || '';
  const statusSummary =
    capabilities.length === 0
      ? 'No Site Tools currently enabled.'
      : `${capabilities.length} Site Tools currently available.`;

  return (
    <>
      <div className="companion-heading">
        <div>
          <p className="eyebrow">Optional helper</p>
          <h2>Agent Companion</h2>
        </div>
        <span className="companion-badge">
          {capabilities.length > 0 ? 'WebMCP Active' : 'Local'}
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
        {latestActivity ? `Latest action: ${latestActivity}` : ''}
      </div>

      <div className="companion-section">
        <h3
          style={{
            fontSize: '0.82rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#496b66',
            marginTop: '0.75rem',
            marginBottom: '0.25rem',
          }}
        >
          Page Capabilities
        </h3>
        {capabilities.length === 0 ? (
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
            {capabilities.map((capability) => (
              <li key={capability.id}>
                <strong>{capability.id}</strong>
                <span>{capability.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activity.length > 0 ? (
        <div
          className="companion-activity-section"
          style={{ marginTop: '1.25rem' }}
        >
          <h3
            style={{
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#496b66',
              marginBottom: '0.5rem',
            }}
          >
            Recent Actions
          </h3>
          <ul
            style={{
              display: 'grid',
              gap: '0.5rem',
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
            aria-label="Recent actions"
          >
            {activity.slice(0, 20).map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: 'grid',
                  gap: '0.2rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '0.5rem',
                  background: entry.source === 'webmcp' ? '#e1f0ec' : '#f0f5f4',
                  fontSize: '0.74rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: entry.source === 'webmcp' ? '#1b5e54' : '#4a6360',
                    }}
                  >
                    {entry.source === 'webmcp'
                      ? 'Agent action'
                      : 'Human action'}
                  </span>
                  {entry.occurredAt ? (
                    <time
                      style={{ fontSize: '0.65rem', color: '#7a8f8c' }}
                      dateTime={entry.occurredAt}
                    >
                      {new Date(entry.occurredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </time>
                  ) : null}
                </div>
                <span style={{ color: '#2f4b47' }}>{entry.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
