import { useEffect, useRef } from 'react';

import type { CapabilitySummary } from '../../application/store';

interface AgentCompanionProps {
  capabilities: readonly CapabilitySummary[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

function CompanionContent({
  capabilities,
}: {
  capabilities: readonly CapabilitySummary[];
}) {
  return (
    <>
      <div className="companion-heading">
        <div>
          <p className="eyebrow">Optional helper</p>
          <h2>Agent Companion</h2>
        </div>
        <span className="companion-badge">Local</span>
      </div>
      {capabilities.length === 0 ? (
        <div className="companion-empty">
          <span className="companion-empty-icon" aria-hidden="true">
            ◇
          </span>
          <p>No Site Tools are enabled yet.</p>
          <small>
            This Phase 1 preview is fully usable by hand. Future capabilities
            will appear here only when the page registers them.
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
    </>
  );
}

export function AgentCompanion({
  capabilities,
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
        <CompanionContent capabilities={capabilities} />
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
            <CompanionContent capabilities={capabilities} />
          </section>
        </div>
      ) : null}
    </>
  );
}
