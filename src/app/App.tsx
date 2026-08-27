import { useEffect, useRef, useState } from 'react';

import { resetDemo } from '../application/commands';
import {
  getApplicantAndHouseholdPeople,
  getApplicationProgress,
  type ReviewIssueCode,
  type ReviewIssue,
  type SectionId,
} from '../domain';
import { AboutSection } from '../ui/sections/AboutSection';
import { CoverageSection } from '../ui/sections/CoverageSection';
import { DocumentsSection } from '../ui/sections/DocumentsSection';
import { HouseholdSection } from '../ui/sections/HouseholdSection';
import { IncomeSection } from '../ui/sections/IncomeSection';
import { ReviewSection } from '../ui/sections/ReviewSection';
import { ApplicationShell } from '../ui/layout/ApplicationShell';
import { useCivicFlowStore } from '../ui/use-civic-flow-store';

const REVIEW_FOCUS_TARGETS: Partial<Record<ReviewIssueCode, string>> = {
  ABOUT_INCOMPLETE: 'about-first-name',
  HOUSEHOLD_UNCONFIRMED: 'member-first-name',
  INCOME_MISSING: 'income-employer',
  COVERAGE_UNCONFIRMED: 'coverage-status-person-maya-carter',
  PROOF_OF_INCOME_MISSING: 'documents-proof-of-income',
  ATTESTATION_REQUIRED: 'demo-attestation',
};

export function App() {
  const { snapshot, store } = useCivicFlowStore();
  const progress = getApplicationProgress(snapshot.application);
  const [companionOpen, setCompanionOpen] = useState(false);
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

  function resetApplication() {
    store.reset((state, context) => resetDemo(state, context));
  }

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
        dispatch={store.dispatch}
        onNavigate={navigateToSection}
      />
    ) : snapshot.ui.activeSection === 'household' ? (
      <HouseholdSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={store.dispatch}
        onNavigate={navigateToSection}
        onSelect={(id) =>
          id === null
            ? store.clearSelection()
            : store.selectRecord({ kind: 'household', id })
        }
        selectedId={selectedHouseholdId}
      />
    ) : snapshot.ui.activeSection === 'income' ? (
      <IncomeSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={store.dispatch}
        onNavigate={navigateToSection}
        onSelect={(id) =>
          id === null
            ? store.clearSelection()
            : store.selectRecord({ kind: 'income', id })
        }
        selectedId={selectedIncomeId}
      />
    ) : snapshot.ui.activeSection === 'coverage' ? (
      <CoverageSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={store.dispatch}
        onNavigate={navigateToSection}
      />
    ) : snapshot.ui.activeSection === 'documents' ? (
      <DocumentsSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={store.dispatch}
        onNavigate={navigateToSection}
      />
    ) : snapshot.ui.activeSection === 'review' ? (
      <ReviewSection
        application={snapshot.application}
        disabled={snapshot.application.submission.status === 'submitted_demo'}
        dispatch={store.dispatch}
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

  return (
    <ApplicationShell
      activeSection={snapshot.ui.activeSection}
      capabilities={snapshot.ui.capabilities}
      companionOpen={companionOpen}
      currentSection={currentSection}
      onCloseCompanion={() => setCompanionOpen(false)}
      onNavigate={navigateToSection}
      onOpenCompanion={() => setCompanionOpen(true)}
      progress={progress}
    />
  );
}
