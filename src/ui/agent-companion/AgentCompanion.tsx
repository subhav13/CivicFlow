import { useEffect, useRef, useState } from 'react';

import type { ActivityEntry, CapabilitySummary } from '../../application/store';
import {
  getFriendlyOperationLabel,
  type OperationState,
} from '../../application/operation-feedback';
import type {
  AssistantController,
  AssistantControllerEvent,
} from '../../assistant/assistant-controller';
import type { ConfirmationDraft } from '../../assistant/tool-confirmation-view-model';
import { AssistantPanel, type AssistantPanelHandle } from './AssistantPanel';
import { browserSpeechOutput, type SpeechOutputService } from './speech-output';
import type { PendingToolConfirmation } from './ToolConfirmationCard';
import { ToolConfirmationModal } from './ToolConfirmationModal';

export interface AgentCompanionProps {
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
  assistantController?: AssistantController | null;
  assistantEnabled?: boolean;
  onReadCurrentSection?: () => string;
  speechOutput?: SpeechOutputService;
  activeOperation?: OperationState | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  guideOpen?: boolean;
  onDismissGuide?: () => void;
}

const COMPACT_COMPANION_QUERY = '(max-width: 70rem)';

function usesCompactCompanionLayout(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(COMPACT_COMPANION_QUERY).matches
  );
}
function ActivityItemView({
  entry,
  testId,
}: {
  entry: ActivityEntry;
  testId?: string;
}) {
  const isAgent = entry.source === 'webmcp';
  const sourceText = isAgent ? 'Agent action' : 'Human action';
  const hasRevision =
    entry.beforeRevision !== undefined && entry.afterRevision !== undefined;
  const hasEntities =
    entry.affectedEntities && entry.affectedEntities.length > 0;

  return (
    <li
      key={entry.id}
      className={`activity-entry activity-source-${entry.source ?? 'human'} activity-status-${entry.status ?? 'succeeded'}`}
      data-activity-id={entry.id}
      data-source={entry.source}
      data-status={entry.status}
      data-section={entry.section}
      data-testid={testId}
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
      <details className="activity-item-details">
        <summary>Activity details</summary>
        <div className="activity-item-details-body">
          <p>
            Action ID: <code>{entry.id}</code>
          </p>
          {hasEntities && (
            <ul
              className="activity-affected-entities"
              aria-label="Affected entities"
            >
              {entry.affectedEntities!.map((entity) => (
                <li key={entity.id} className="activity-affected-entity">
                  {entity.kind}: {entity.label} ({entity.id})
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </li>
  );
}

function CompanionContent({
  capabilities,
  activity = [],
  assistantController,
  assistantEnabled,
  onReadCurrentSection,
  speechOutput,
  activeOperation,
  renderConfirmation = false,
  deliveryFailure,
  onControllerEvent,
  isOpen,
  closeRef,
  onClose,
  panelRef,
  onListeningChange,
  onSpeakingChange,
}: {
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
  assistantController?: AssistantController | null;
  assistantEnabled?: boolean;
  onReadCurrentSection?: () => string;
  speechOutput?: SpeechOutputService;
  activeOperation?: OperationState | null;
  renderConfirmation?: boolean;
  deliveryFailure?: string | null;
  onControllerEvent?: (event: AssistantControllerEvent) => void;
  isOpen: boolean;
  closeRef?: React.RefObject<HTMLButtonElement | null>;
  onClose?: () => void;
  panelRef?: React.RefObject<AssistantPanelHandle | null>;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
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
          <h2 id="agent-companion-dialog-heading">Agent Companion</h2>
        </div>
        <div className="companion-heading-actions">
          <span className="companion-badge">
            {filteredCapabilities.length > 0 ? 'WebMCP Active' : 'Local'}
          </span>
          {isOpen && onClose ? (
            <button
              ref={closeRef}
              type="button"
              className="companion-close-button"
              onClick={onClose}
              aria-label="Close Agent Companion"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <AssistantPanel
        controller={assistantController}
        enabled={assistantEnabled}
        onReadCurrentSection={onReadCurrentSection}
        speechOutput={speechOutput}
        activeOperation={activeOperation}
        renderConfirmation={renderConfirmation}
        onControllerEvent={onControllerEvent}
        initialMode="unselected"
        ref={panelRef}
        onListeningChange={onListeningChange}
        onSpeakingChange={onSpeakingChange}
      />

      {deliveryFailure ? (
        <div className="assistant-delivery-notice" role="status">
          {deliveryFailure}
        </div>
      ) : null}

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

      <details className="companion-support-disclosure">
        <summary
          className="companion-support-summary"
          aria-label={`Activity & tools${latestActivity ? `. Latest action: ${latestActivity.summary}` : ''}`}
        >
          <span>Activity &amp; tools</span>
          {latestActivity ? (
            <span
              className="companion-support-latest"
              data-testid="assistant-latest-summary"
              aria-hidden="true"
            >
              {latestActivity.summary}
            </span>
          ) : null}
          <span className="companion-support-count">
            {activity.length > 0
              ? `${activity.length} action${activity.length === 1 ? '' : 's'}`
              : `${filteredCapabilities.length} tool${filteredCapabilities.length === 1 ? '' : 's'}`}
          </span>
        </summary>

        <div className="companion-support-content">
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

          <div className="companion-section">
            <h3 className="companion-section-title">Page Capabilities</h3>
            {filteredCapabilities.length === 0 ? (
              <div className="companion-empty">
                <span className="companion-empty-icon" aria-hidden="true">
                  ◇
                </span>
                <p>No Site Tools are enabled yet.</p>
                <small>
                  This workspace is fully usable by hand. WebMCP capabilities
                  appear here dynamically when registered by the page.
                </small>
              </div>
            ) : (
              <ul
                className="capability-list"
                aria-label="Available capabilities"
              >
                {filteredCapabilities.map((capability) => {
                  const friendlyLabel = getFriendlyOperationLabel(
                    capability.id,
                  );
                  return (
                    <li key={capability.id} className="capability-item">
                      <div className="capability-item-main">
                        <strong>{friendlyLabel}</strong>
                        <span>{capability.summary}</span>
                      </div>
                      <details className="capability-details">
                        <summary>Technical details</summary>
                        <div className="capability-details-body">
                          <strong>
                            <code>{capability.id}</code>
                          </strong>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <details className="companion-help-details">
            <summary>How the portal works</summary>
            <div className="companion-help-body">
              <p>
                CivicFlow: A WebMPC Public Benefit Portal is a fictional
                research demo that uses synthetic data only.
              </p>
              <p>
                Human actions and optional WebMCP Site Tools update the same
                visible page state. Review every proposed change before it is
                applied.
              </p>
            </div>
          </details>
        </div>
      </details>
    </>
  );
}

export function AgentCompanion({
  capabilities,
  activity = [],
  assistantController,
  assistantEnabled,
  onReadCurrentSection,
  speechOutput,
  activeOperation,
  isOpen,
  onClose,
  onOpen,
  guideOpen = false,
  onDismissGuide,
}: AgentCompanionProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<AssistantPanelHandle>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const wasOpen = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const [pendingConfirmation, setPendingConfirmation] = useState<
    (PendingToolConfirmation & { draft: ConfirmationDraft }) | null
  >(null);
  const [confirmationStatus, setConfirmationStatus] = useState<
    'confirming' | 'applying' | 'failed'
  >('confirming');
  const [confirmationFailure, setConfirmationFailure] = useState<string>();
  const [deliveryFailure, setDeliveryFailure] = useState<string | null>(null);
  const [focusHeadingAfterSuccess, setFocusHeadingAfterSuccess] =
    useState(false);
  const pendingConfirmationRef = useRef(pendingConfirmation);
  pendingConfirmationRef.current = pendingConfirmation;
  const agentActivity = activity
    .filter((entry) => entry.source === 'webmcp')
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const newestFirst = (right.entry.occurredAt ?? '').localeCompare(
        left.entry.occurredAt ?? '',
      );
      return newestFirst || left.index - right.index;
    })
    .slice(0, 20)
    .map(({ entry }) => entry);

  useEffect(() => {
    if (isOpen) setIsActivityOpen(false);
  }, [isOpen]);

  const handleAssistantControllerEvent = (event: AssistantControllerEvent) => {
    switch (event.type) {
      case 'confirmation_required': {
        const nextConfirmation = {
          callId: event.callId,
          toolName: event.toolName,
          message: event.message,
          draft: event.draft,
        };
        pendingConfirmationRef.current = nextConfirmation;
        setPendingConfirmation(nextConfirmation);
        setConfirmationStatus('confirming');
        setConfirmationFailure(undefined);
        setDeliveryFailure(null);
        break;
      }
      case 'applying':
        if (pendingConfirmationRef.current?.callId === event.callId) {
          (speechOutput ?? browserSpeechOutput).cancel();
          setConfirmationStatus('applying');
        }
        break;
      case 'revision_requested':
        if (pendingConfirmationRef.current?.callId === event.callId) {
          pendingConfirmationRef.current = null;
          setPendingConfirmation(null);
          setConfirmationStatus('confirming');
          setConfirmationFailure(undefined);
          (speechOutput ?? browserSpeechOutput).cancel();
          if (usesCompactCompanionLayout()) onOpenRef.current();
        }
        break;
      case 'succeeded':
        if (pendingConfirmationRef.current?.callId === event.callId) {
          pendingConfirmationRef.current = null;
          setPendingConfirmation(null);
          setConfirmationStatus('confirming');
          setConfirmationFailure(undefined);
          setFocusHeadingAfterSuccess(true);
          onCloseRef.current();
        }
        break;
      case 'failed':
        if (pendingConfirmationRef.current?.callId === event.callId) {
          setConfirmationStatus('failed');
          setConfirmationFailure(event.message);
        }
        break;
      case 'delivery_failed':
        setDeliveryFailure(event.message);
        break;
      case 'state':
        if (event.state.status !== 'connected') {
          pendingConfirmationRef.current = null;
          setPendingConfirmation(null);
          setIsListening(false);
        }
        break;
      case 'error':
        pendingConfirmationRef.current = null;
        setPendingConfirmation(null);
        setDeliveryFailure(null);
        setIsListening(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const appFrame = document.querySelector<HTMLElement>('.app-frame');
    if (!pendingConfirmation || !appFrame) return;
    const alreadyInert = appFrame.hasAttribute('inert');
    appFrame.setAttribute('inert', '');
    return () => {
      if (!alreadyInert) appFrame.removeAttribute('inert');
    };
  }, [pendingConfirmation]);

  useEffect(() => {
    if (!focusHeadingAfterSuccess || isOpen) return;
    let cancelled = false;
    let attempts = 0;
    let frameId: number | undefined;

    const focusCurrentHeading = () => {
      if (cancelled) return;
      const heading = document.getElementById('active-section-heading');
      if (heading instanceof HTMLElement) {
        heading.focus();
        setFocusHeadingAfterSuccess(false);
        return;
      }

      if (attempts >= 3) {
        setFocusHeadingAfterSuccess(false);
        return;
      }
      attempts += 1;
      if (typeof window.requestAnimationFrame === 'function') {
        frameId = window.requestAnimationFrame(focusCurrentHeading);
      } else {
        queueMicrotask(focusCurrentHeading);
      }
    };

    queueMicrotask(focusCurrentHeading);
    return () => {
      cancelled = true;
      if (
        frameId !== undefined &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [focusHeadingAfterSuccess, isOpen, activeOperation]);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      closeRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      if (!focusHeadingAfterSuccess) {
        triggerRef.current?.focus();
      }
    }
  }, [focusHeadingAfterSuccess, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pendingConfirmationRef.current) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div className="assistant-companion-host">
        {guideOpen ? (
          <div
            className="assistant-coachmark"
            data-testid="assistant-coachmark"
            aria-label="Assistant tip"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                onDismissGuide?.();
              }
            }}
          >
            <div>
              <strong>Need a hand?</strong>
              <p>Ask the portal a question or start a voice conversation.</p>
            </div>
            <div className="assistant-coachmark-actions">
              <button
                type="button"
                className="assistant-coachmark-primary"
                onClick={() => {
                  onDismissGuide?.();
                  onOpen();
                }}
              >
                Try the assistant
              </button>
              <button
                type="button"
                className="assistant-coachmark-dismiss"
                aria-label="Dismiss assistant tip"
                onClick={onDismissGuide}
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        <button
          ref={triggerRef}
          className={`assistant-launcher${isSpeaking ? ' assistant-launcher--speaking' : ''}`}
          data-testid="assistant-launcher"
          data-speaking={isSpeaking}
          type="button"
          onClick={() => {
            if (isOpen) {
              onClose();
              return;
            }
            onDismissGuide?.();
            setIsActivityOpen(false);
            onOpen();
          }}
          aria-expanded={isOpen}
          aria-controls="agent-companion-dialog"
          aria-label={
            isSpeaking
              ? `${isOpen ? 'Minimize' : 'Open'} Agent Companion, speaking`
              : isOpen
                ? 'Minimize Agent Companion'
                : 'Open Agent Companion'
          }
        >
          <span
            className={`assistant-launcher-orb${isSpeaking ? ' assistant-launcher-orb--speaking' : ''}`}
            aria-hidden="true"
          >
            <span
              className="assistant-launcher-wave"
              data-testid="assistant-launcher-wave"
            >
              <span />
              <span />
              <span />
            </span>
            <span className="assistant-launcher-glyph">✦</span>
          </span>
        </button>

        <div className="agent-activity-disclosure">
          <button
            type="button"
            className="agent-activity-disclosure-trigger"
            aria-expanded={isActivityOpen}
            aria-controls="agent-activity-disclosure-panel"
            onClick={() => {
              if (isActivityOpen) {
                setIsActivityOpen(false);
                return;
              }
              onClose();
              setIsActivityOpen(true);
            }}
          >
            View agent activity
          </button>
          {isActivityOpen ? (
            <section
              id="agent-activity-disclosure-panel"
              className="agent-activity-disclosure-panel"
              aria-label="Agent activity"
            >
              <div className="agent-activity-disclosure-heading">
                <h2>Agent activity</h2>
                <button
                  type="button"
                  aria-label="Close agent activity"
                  onClick={() => setIsActivityOpen(false)}
                >
                  ×
                </button>
              </div>
              {agentActivity.length > 0 ? (
                <ul className="activity-list" aria-label="Agent actions">
                  {agentActivity.map((entry) => (
                    <ActivityItemView
                      key={entry.id}
                      entry={entry}
                      testId="agent-activity-entry"
                    />
                  ))}
                </ul>
              ) : (
                <p className="agent-activity-empty">
                  No agent activity recorded yet.
                </p>
              )}
            </section>
          ) : null}
        </div>

        <aside
          className={`companion-panel assistant-surface${isOpen ? ' companion-panel--open' : ''}`}
          id="agent-companion-dialog"
          role={isOpen ? 'dialog' : 'complementary'}
          aria-label={isOpen ? undefined : 'Agent Companion'}
          aria-labelledby={
            isOpen ? 'agent-companion-dialog-heading' : undefined
          }
        >
          <CompanionContent
            capabilities={capabilities}
            activity={activity}
            assistantController={assistantController}
            assistantEnabled={assistantEnabled}
            onReadCurrentSection={onReadCurrentSection}
            speechOutput={speechOutput}
            activeOperation={activeOperation}
            renderConfirmation={false}
            deliveryFailure={deliveryFailure}
            onControllerEvent={handleAssistantControllerEvent}
            isOpen={isOpen}
            closeRef={closeRef}
            onClose={onClose}
            panelRef={panelRef}
            onListeningChange={setIsListening}
            onSpeakingChange={setIsSpeaking}
          />
        </aside>
        {!isOpen && isListening ? (
          <button
            type="button"
            className="assistant-minimized-stop"
            data-testid="assistant-minimized-stop"
            aria-label="Stop listening"
            onClick={(event) => {
              event.stopPropagation();
              panelRef.current?.stopListening();
            }}
          >
            <span aria-hidden="true">⏹</span>
          </button>
        ) : null}
      </div>

      {pendingConfirmation ? (
        <ToolConfirmationModal
          confirmation={pendingConfirmation}
          status={confirmationStatus}
          failureMessage={confirmationFailure}
          onConfirm={() => {
            void assistantController?.confirmToolCall(
              pendingConfirmation.callId,
            );
          }}
          onCancel={() => {
            if (confirmationStatus === 'applying') return;
            assistantController?.cancelToolCall(pendingConfirmation.callId);
            setPendingConfirmation(null);
            setConfirmationStatus('confirming');
            setConfirmationFailure(undefined);
          }}
          onNeedCorrection={() => {
            if (confirmationStatus !== 'confirming') return;
            const accepted =
              assistantController?.requestRevision(
                pendingConfirmation.callId,
              ) ?? false;
            if (!accepted) {
              setConfirmationStatus('failed');
              setConfirmationFailure(
                'This change is already being applied. Please wait for it to finish before requesting another correction.',
              );
            }
          }}
        />
      ) : null}
    </>
  );
}
