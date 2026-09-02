import { useEffect, useState, type ReactNode } from 'react';
import type { ApplicationProgress, SectionId } from '../../domain';
import type {
  ActivityEntry,
  CapabilitySummary,
  RecentEffect,
} from '../../application/store';
import type { OperationState } from '../../application/operation-feedback';
import { AgentCompanion } from '../agent-companion/AgentCompanion';
import type { SpeechOutputService } from '../agent-companion/speech-output';
import type { AssistantController } from '../../assistant/assistant-controller';
import { SECTION_META } from './section-meta';
import { SectionStepper } from '../navigation/SectionStepper';
import {
  getProgressViewModel,
  type ProgressViewModel,
} from '../progress/progress-view-model';
import { ApplicationProgressTracker } from '../progress/ApplicationProgressTracker';
import { OperationStatus } from '../feedback/OperationStatus';
import { AgentChangeToast } from '../feedback/AgentChangeToast';
interface ApplicationShellProps {
  activeSection: SectionId;
  capabilities: readonly CapabilitySummary[];
  activity?: readonly ActivityEntry[];
  assistantController?: AssistantController | null;
  assistantEnabled?: boolean;
  onReadCurrentSection?: () => string;
  speechOutput?: SpeechOutputService;
  companionOpen: boolean;
  currentSection: ReactNode;
  onCloseCompanion: () => void;
  onNavigate: (section: SectionId) => void;
  onOpenCompanion: () => void;
  progress: ApplicationProgress;
  progressViewModel?: ProgressViewModel;
  activeOperation?: OperationState | null;
  recentEffect?: RecentEffect | null;
  onDismissOperation?: (actionId?: string) => void;
  guideOpen?: boolean;
  onDismissGuide?: () => void;
}
export function ApplicationShell({
  activeSection,
  capabilities,
  activity,
  assistantController,
  assistantEnabled,
  onReadCurrentSection,
  speechOutput,
  companionOpen,
  currentSection,
  onCloseCompanion,
  onNavigate,
  onOpenCompanion,
  progress,
  progressViewModel,
  activeOperation,
  recentEffect,
  onDismissOperation,
  guideOpen,
  onDismissGuide,
}: ApplicationShellProps) {
  const vm =
    progressViewModel ?? getProgressViewModel(progress, activeSection, 0, null);
  const activeIndex = SECTION_META.findIndex(
    (section) => section.id === activeSection,
  );
  const prevSection =
    activeIndex > 0 ? SECTION_META[activeIndex - 1] : undefined;
  const nextSection =
    activeIndex >= 0 && activeIndex < SECTION_META.length - 1
      ? SECTION_META[activeIndex + 1]
      : undefined;
  const [isEntered, setIsEntered] = useState(false);
  useEffect(() => {
    setIsEntered(true);
  }, []);

  return (
    <div className={`app-frame${isEntered ? ' is-entered' : ''}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            WB
          </div>
          <div>
            <p className="brand-name">A WebMPC Benefit Portal</p>
            <p className="brand-subtitle">Benefits workspace</p>
          </div>
        </div>
        <div className="demo-status" aria-label="Demo status">
          <span className="status-dot" aria-hidden="true" />
          <span>Local synthetic demo</span>
        </div>
      </header>

      <div className="disclosure" role="note">
        <span className="disclosure-icon" aria-hidden="true">
          ✦
        </span>
        <span>
          <strong>Fictional research demo.</strong> Use synthetic data only;
          this is not a government service.
        </span>
      </div>

      <ApplicationProgressTracker
        viewModel={vm}
        activeOperation={activeOperation}
      />
      <OperationStatus
        operation={activeOperation ?? null}
        onDismiss={onDismissOperation}
      />
      <AgentChangeToast
        operation={activeOperation}
        activeSection={activeSection}
        onDismiss={onDismissOperation}
      />
      <div className="workspace-grid">
        <SectionStepper
          activeSection={activeSection}
          progress={progress}
          onNavigate={onNavigate}
          saveStateLabel={vm.saveStateLabel}
        />

        <main
          className="application-main"
          aria-labelledby="active-section-heading"
          data-section={activeSection}
          data-recent-effect={
            recentEffect?.section === activeSection
              ? recentEffect.kind
              : undefined
          }
          data-recent-action-id={
            recentEffect?.section === activeSection
              ? recentEffect.actionId
              : undefined
          }
        >
          {currentSection}
          <div className="section-footer">
            <button
              aria-label={
                prevSection
                  ? `Back: ${prevSection.label}`
                  : 'Back: Previous section unavailable'
              }
              className="back-section-button"
              disabled={!prevSection}
              onClick={() => {
                if (prevSection) onNavigate(prevSection.id);
              }}
              type="button"
            >
              {prevSection ? `← Back: ${prevSection.label}` : '← Back'}
            </button>
            <button
              aria-label={
                nextSection
                  ? `Next: ${nextSection.label}`
                  : 'Next section unavailable'
              }
              className="next-section-button"
              disabled={!nextSection}
              onClick={() => {
                if (nextSection) onNavigate(nextSection.id);
              }}
              type="button"
            >
              {nextSection ? `Next: ${nextSection.label} →` : 'Next section'}
            </button>
            {!nextSection ? (
              <small>Review &amp; Sign is the final section.</small>
            ) : null}
          </div>
        </main>
      </div>
      <AgentCompanion
        capabilities={capabilities}
        activity={activity}
        assistantController={assistantController}
        assistantEnabled={assistantEnabled}
        onReadCurrentSection={onReadCurrentSection}
        speechOutput={speechOutput}
        activeOperation={activeOperation}
        isOpen={companionOpen}
        onClose={onCloseCompanion}
        onOpen={onOpenCompanion}
        guideOpen={guideOpen}
        onDismissGuide={onDismissGuide}
      />
    </div>
  );
}
