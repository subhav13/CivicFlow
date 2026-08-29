import { useEffect, useRef, useState } from 'react';

import { resetDemo, type CommandContext } from '../application/commands';
import type { CommandTransition, DispatchOptions } from '../application/store';
import type { OperationDescriptor } from '../application/operation-feedback';
import {
  getApplicantAndHouseholdPeople,
  getApplicationProgress,
  getReviewIssues,
  type ReviewIssueCode,
  type ReviewIssue,
  type SectionId,
} from '../domain';
import { getProgressViewModel } from '../ui/progress/progress-view-model';
import { AboutSection } from '../ui/sections/AboutSection';
import { CoverageSection } from '../ui/sections/CoverageSection';
import { DocumentsSection } from '../ui/sections/DocumentsSection';
import { HouseholdSection } from '../ui/sections/HouseholdSection';
import { IncomeSection } from '../ui/sections/IncomeSection';
import { ReviewSection } from '../ui/sections/ReviewSection';
import { RecoveryBanner } from '../ui/feedback/RecoveryBanner';
import { ApplicationShell } from '../ui/layout/ApplicationShell';
import type { AssistantController } from '../assistant/assistant-controller';
import { createAssistantRuntime } from '../assistant/assistant-runtime';
import type { SpeechOutputService } from '../ui/agent-companion/speech-output';
import { useCivicFlowStore } from '../ui/use-civic-flow-store';
import { useWebMcpRegistry } from '../webmcp';
const REVIEW_FOCUS_TARGETS: Partial<Record<ReviewIssueCode, string>> = {
  ABOUT_INCOMPLETE: 'about-first-name',
  HOUSEHOLD_UNCONFIRMED: 'member-first-name',
  INCOME_MISSING: 'income-employer',
  COVERAGE_UNCONFIRMED: 'coverage-status-person-maya-carter',
  PROOF_OF_INCOME_MISSING: 'documents-proof-of-income',
  ATTESTATION_REQUIRED: 'demo-attestation',
};

export interface AppProps {
  assistantController?: AssistantController | null;
  assistantEnabled?: boolean;
  onReadCurrentSection?: () => string;
  speechOutput?: SpeechOutputService;
}

export function App({
  assistantController = null,
  assistantEnabled = false,
  onReadCurrentSection,
  speechOutput,
}: AppProps = {}) {
  const { snapshot, store } = useCivicFlowStore();
  const [runtime] = useState(() =>
    assistantEnabled && assistantController === null
      ? createAssistantRuntime({ store })
      : null,
  );
  useWebMcpRegistry(store, runtime?.port, runtime?.registryManager);

  const runtimeDisposeToken = useRef<{ cancelled: boolean } | null>(null);
  useEffect(() => {
    if (runtimeDisposeToken.current) {
      runtimeDisposeToken.current.cancelled = true;
    }
    const token = { cancelled: false };
    runtimeDisposeToken.current = token;

    return () => {
      // React StrictMode replays effects during development. Defer disposal
      // until the replay has a chance to re-run this effect and cancel it.
      queueMicrotask(() => {
        if (token.cancelled) return;
        runtime?.dispose();
        if (runtimeDisposeToken.current === token) {
          runtimeDisposeToken.current = null;
        }
      });
    };
  }, [runtime]);

  const activeController = assistantController ?? runtime?.controller ?? null;
  const progress = getApplicationProgress(snapshot.application);
  const reviewIssues = getReviewIssues(snapshot.application);
  const progressViewModel = getProgressViewModel(
    progress,
    snapshot.ui.activeSection,
    reviewIssues.length,
    snapshot.persistenceNotice,
    snapshot.persistenceUiState,
  );
  const [companionOpen, setCompanionOpen] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [reviewFocusTarget, setReviewFocusTarget] = useState<string | null>(
    null,
  );
  const previousSection = useRef<SectionId | null>(null);

  useEffect(() => {
    const sectionChanged =
      previousSection.current !== null &&
      previousSection.current !== snapshot.ui.activeSection;
    const highlightedIssue = snapshot.ui.reviewHighlights[0] as
      ReviewIssueCode | undefined;
    const targetId =
      reviewFocusTarget ??
      (highlightedIssue ? REVIEW_FOCUS_TARGETS[highlightedIssue] : undefined);
    const target = targetId ? document.getElementById(targetId) : null;
    if (target instanceof HTMLElement) {
      target.focus();
    } else if (sectionChanged) {
      document.getElementById('active-section-heading')?.focus();
    }
    previousSection.current = snapshot.ui.activeSection;
  }, [
    reviewFocusTarget,
    snapshot.ui.activeSection,
    snapshot.ui.reviewHighlights,
  ]);

  function navigateToIssue(issue: ReviewIssue) {
    const targetPerson =
      issue.code === 'COVERAGE_UNCONFIRMED' && issue.entityLabel
        ? getApplicantAndHouseholdPeople(snapshot.application).find(
            (person) =>
              `${person.firstName} ${person.lastName}` === issue.entityLabel,
          )
        : undefined;
    setReviewFocusTarget(
      targetPerson
        ? `coverage-status-${targetPerson.id}`
        : (REVIEW_FOCUS_TARGETS[issue.code] ?? null),
    );
    store.setReviewHighlights([issue.code]);
    store.navigateToSection(issue.section);
  }

  function navigateToSection(section: SectionId) {
    setReviewFocusTarget(null);
    store.setReviewHighlights([]);
    store.navigateToSection(section);
  }
  function navigateToRecovery(section: SectionId, focusTargetId?: string) {
    if (focusTargetId) {
      setReviewFocusTarget(focusTargetId);
    }
    store.navigateToSection(section);
  }

  function resetApplication() {
    store.reset((state, context) => resetDemo(state, context));
  }

  const handleHumanDispatch = (
    transition: CommandTransition,
    options?: DispatchOptions,
  ) => {
    if (
      options?.operation !== undefined ||
      !options?.activity ||
      options?.source === 'webmcp'
    ) {
      return store.dispatch(transition, options);
    }

    const currentSnapshot = store.getState();
    const beforeRevision = currentSnapshot.application.revision;
    const actionId = `${options.activity.id}-r${beforeRevision}`;
    const section =
      options.activity.section ?? currentSnapshot.ui.activeSection;
    const startedAt = new Date().toISOString();

    const operation: OperationDescriptor = {
      actionId,
      source: 'human',
      label: options.activity.summary,
      section,
      startedAt,
      beforeRevision,
    };

    const wrappedTransition: CommandTransition = (state, context) => {
      let first = true;
      const wrappedContext: CommandContext = {
        ...context,
        newId: () => {
          if (first) {
            first = false;
            return actionId;
          }
          return context.newId();
        },
      };
      return transition(state, wrappedContext);
    };

    return store.dispatch(wrappedTransition, {
      ...options,
      operation,
    });
  };
  const activeLabel =
    snapshot.ui.activeSection === 'about'
      ? 'About You'
      : snapshot.ui.activeSection === 'household'
        ? 'Household'
        : snapshot.ui.activeSection === 'income'
          ? 'Income'
          : snapshot.ui.activeSection === 'coverage'
            ? 'Current Coverage'
            : snapshot.ui.activeSection === 'documents'
              ? 'Documents'
              : 'Review & Sign';

  const selectedHouseholdId =
    snapshot.ui.selection?.kind === 'household'
      ? snapshot.ui.selection.id
      : null;
  const selectedIncomeId =
    snapshot.ui.selection?.kind === 'income' ? snapshot.ui.selection.id : null;

  const currentSection =
    snapshot.ui.activeSection === 'about' ? (
      <AboutSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={handleHumanDispatch}
        onNavigate={navigateToSection}
      />
    ) : snapshot.ui.activeSection === 'household' ? (
      <HouseholdSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={handleHumanDispatch}
        onNavigate={navigateToSection}
        onSelect={(id) =>
          id === null
            ? store.clearSelection()
            : store.selectRecord({ kind: 'household', id })
        }
        selectedId={selectedHouseholdId}
        recentEffect={snapshot.ui.recentEffect}
      />
    ) : snapshot.ui.activeSection === 'income' ? (
      <IncomeSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={handleHumanDispatch}
        onNavigate={navigateToSection}
        onSelect={(id) =>
          id === null
            ? store.clearSelection()
            : store.selectRecord({ kind: 'income', id })
        }
        selectedId={selectedIncomeId}
        recentEffect={snapshot.ui.recentEffect}
      />
    ) : snapshot.ui.activeSection === 'coverage' ? (
      <CoverageSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={handleHumanDispatch}
        onNavigate={navigateToSection}
      />
    ) : snapshot.ui.activeSection === 'documents' ? (
      <DocumentsSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={handleHumanDispatch}
        onNavigate={navigateToSection}
      />
    ) : snapshot.ui.activeSection === 'review' ? (
      <ReviewSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={handleHumanDispatch}
        onIssueNavigate={navigateToIssue}
        onNavigate={navigateToSection}
        onReset={resetApplication}
      />
    ) : (
      <section
        className="section-placeholder"
        aria-labelledby="active-section-heading"
      >
        <p className="eyebrow">
          {progress.nextSection === 'about' ? 'Start here' : 'Current section'}
        </p>
        <h2 id="active-section-heading" tabIndex={-1}>
          {activeLabel}
        </h2>
        <p>Human portal sections will appear here.</p>
      </section>
    );

  const sectionContent = (
    <>
      <RecoveryBanner
        operation={snapshot.ui.activeOperation}
        onNavigate={navigateToRecovery}
        onDismiss={(actionId) => store.clearCompletedOperation(actionId)}
      />
      {currentSection}
    </>
  );

  const handleReadCurrentSection = () => {
    if (onReadCurrentSection) {
      return onReadCurrentSection();
    }
    if (typeof document !== 'undefined') {
      const mainEl = document.querySelector('.application-main');
      if (mainEl && typeof (mainEl as HTMLElement).innerText === 'string') {
        const text = (mainEl as HTMLElement).innerText.trim();
        return text || 'No section content available.';
      }
    }
    return 'No section content available.';
  };

  return (
    <ApplicationShell
      activeSection={snapshot.ui.activeSection}
      capabilities={snapshot.ui.capabilities}
      activity={snapshot.ui.activity}
      assistantController={activeController}
      assistantEnabled={assistantEnabled}
      onReadCurrentSection={handleReadCurrentSection}
      speechOutput={speechOutput}
      companionOpen={companionOpen}
      guideOpen={!guideDismissed}
      onDismissGuide={() => setGuideDismissed(true)}
      currentSection={sectionContent}
      onCloseCompanion={() => setCompanionOpen(false)}
      onNavigate={navigateToSection}
      onOpenCompanion={() => setCompanionOpen(true)}
      progress={progress}
      progressViewModel={progressViewModel}
      activeOperation={snapshot.ui.activeOperation}
      recentEffect={snapshot.ui.recentEffect}
      onDismissOperation={(actionId) => store.clearCompletedOperation(actionId)}
    />
  );
}
