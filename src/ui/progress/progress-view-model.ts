import type { ApplicationProgress, SectionId } from '../../domain';
import type { PersistenceNotice } from '../../application/persistence';
import type { PersistenceUiState } from '../../application/store';
import { SECTION_META } from '../layout/section-meta';
export interface ProgressViewModel {
  percent: number;
  completedCount: number;
  totalSections: number;
  completedSummary: string;
  blockerCount: number;
  blockerSummary: string;
  activeSectionId: SectionId;
  activeSectionLabel: string;
  nextSectionId: SectionId | null;
  nextSectionLabel: string;
  saveStateLabel: string;
}

export function getProgressViewModel(
  progress: ApplicationProgress,
  activeSection: SectionId,
  reviewIssueCount: number,
  persistenceNotice: PersistenceNotice = null,
  persistenceUiState?: PersistenceUiState,
): ProgressViewModel {
  const totalSections = 6;
  const completedCount = progress.completedSections.length;
  const activeMeta = SECTION_META.find((s) => s.id === activeSection);
  const activeSectionLabel = activeMeta ? activeMeta.label : activeSection;

  let nextSectionLabel: string;
  if (progress.nextSection) {
    const nextMeta = SECTION_META.find((s) => s.id === progress.nextSection);
    nextSectionLabel = nextMeta ? nextMeta.label : progress.nextSection;
  } else {
    nextSectionLabel = 'All sections complete';
  }
  let saveStateLabel: string;
  if (persistenceUiState?.message) {
    saveStateLabel = persistenceUiState.message;
  } else if (persistenceUiState?.status === 'loaded') {
    saveStateLabel = 'Loaded from this browser';
  } else if (persistenceUiState?.status === 'saved-this-session') {
    saveStateLabel = persistenceUiState.savedAt
      ? `All changes saved · ${persistenceUiState.savedAt}`
      : 'All changes saved';
  } else if (persistenceUiState?.status === 'restored') {
    saveStateLabel = 'Started fresh after a browser save issue';
  } else if (persistenceUiState?.status === 'failed') {
    saveStateLabel = 'Save unavailable · Changes may not survive reload';
  } else {
    switch (persistenceNotice) {
      case 'recovered':
        saveStateLabel = 'Started fresh after a browser save issue';
        break;
      case 'save_failed':
        saveStateLabel = 'Save unavailable · Changes may not survive reload';
        break;
      case null:
      default:
        saveStateLabel = 'Demo data ready · Changes save in this browser';
        break;
    }
  }
  const blockerSummary =
    reviewIssueCount === 0
      ? 'No blockers remaining'
      : reviewIssueCount === 1
        ? '1 blocker remaining'
        : `${reviewIssueCount} blockers remaining`;

  return {
    percent: progress.percent,
    completedCount,
    totalSections,
    completedSummary: `${completedCount} of ${totalSections} sections complete`,
    blockerCount: reviewIssueCount,
    blockerSummary,
    activeSectionId: activeSection,
    activeSectionLabel,
    nextSectionId: progress.nextSection,
    nextSectionLabel,
    saveStateLabel,
  };
}
