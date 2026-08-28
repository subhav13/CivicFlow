import { describe, expect, it } from 'vitest';

import {
  createDemoApplicationSeed,
  getApplicationProgress,
  getReviewIssues,
  type ApplicationState,
} from '../../domain';
import { getProgressViewModel } from './progress-view-model';

describe('progress-view-model (Packet 2.1)', () => {
  it('derives accurate view-model from seed fixture', () => {
    const seed = createDemoApplicationSeed();
    const progress = getApplicationProgress(seed);
    const issues = getReviewIssues(seed);

    const vm = getProgressViewModel(progress, 'about', issues.length, null);

    expect(vm.percent).toBe(20);
    expect(vm.completedCount).toBe(1);
    expect(vm.totalSections).toBe(6);
    expect(vm.completedSummary).toBe('1 of 6 sections complete');
    expect(vm.blockerCount).toBe(issues.length);
    expect(vm.blockerCount).toBe(4);
    expect(vm.activeSectionId).toBe('about');
    expect(vm.activeSectionLabel).toBe('About You');
    expect(vm.nextSectionId).toBe('household');
    expect(vm.nextSectionLabel).toBe('Household');
    expect(vm.saveStateLabel).toBe(
      'Demo data ready · Changes save in this browser',
    );
  });

  it('derives accurate view-model for partial progress fixture', () => {
    const seed = createDemoApplicationSeed();
    const partial: ApplicationState = {
      ...seed,
      householdConfirmed: true,
      householdMembers: [
        {
          id: 'person-emma',
          firstName: 'Emma',
          lastName: 'Carter',
          ageYears: 7,
          relationship: 'daughter',
          applyingForCoverage: true,
        },
      ],
      noIncomeConfirmed: true,
    };
    const progress = getApplicationProgress(partial);
    const issues = getReviewIssues(partial);

    const vm = getProgressViewModel(
      progress,
      'income',
      issues.length,
      'recovered',
    );

    expect(vm.percent).toBe(70);
    expect(vm.completedCount).toBe(4);
    expect(vm.totalSections).toBe(6);
    expect(vm.completedSummary).toBe('4 of 6 sections complete');
    expect(vm.blockerCount).toBe(issues.length);
    expect(vm.blockerCount).toBe(2);
    expect(vm.activeSectionId).toBe('income');
    expect(vm.activeSectionLabel).toBe('Income');
    expect(vm.nextSectionId).toBe('coverage');
    expect(vm.nextSectionLabel).toBe('Current Coverage');
    expect(vm.saveStateLabel).toBe('Started fresh after a browser save issue');
  });

  it('derives accurate view-model for complete fixture with safe final-state fallback', () => {
    const seed = createDemoApplicationSeed();
    const complete: ApplicationState = {
      ...seed,
      householdConfirmed: true,
      householdMembers: [],
      noIncomeConfirmed: true,
      coverageRecords: [{ personId: 'person-maya-carter', status: 'none' }],
      documents: [],
      attestation: {
        accepted: true,
        acceptedAt: '2026-08-28T00:00:00.000Z',
      },
    };
    const progress = getApplicationProgress(complete);
    const issues = getReviewIssues(complete);

    const vm = getProgressViewModel(progress, 'review', issues.length, null);

    expect(vm.percent).toBe(100);
    expect(vm.completedCount).toBe(6);
    expect(vm.totalSections).toBe(6);
    expect(vm.completedSummary).toBe('6 of 6 sections complete');
    expect(vm.blockerCount).toBe(0);
    expect(vm.activeSectionId).toBe('review');
    expect(vm.activeSectionLabel).toBe('Review & Sign');
    expect(vm.nextSectionId).toBeNull();
    expect(vm.nextSectionLabel).toBe('All sections complete');
    expect(vm.saveStateLabel).toBe(
      'Demo data ready · Changes save in this browser',
    );
  });

  it('derives accurate save-state labels for all persistence notice variants', () => {
    const seed = createDemoApplicationSeed();
    const progress = getApplicationProgress(seed);
    const issues = getReviewIssues(seed);

    const vmNull = getProgressViewModel(progress, 'about', issues.length, null);
    expect(vmNull.saveStateLabel).toBe(
      'Demo data ready · Changes save in this browser',
    );

    const vmRecovered = getProgressViewModel(
      progress,
      'about',
      issues.length,
      'recovered',
    );
    expect(vmRecovered.saveStateLabel).toBe(
      'Started fresh after a browser save issue',
    );

    const vmFailed = getProgressViewModel(
      progress,
      'about',
      issues.length,
      'save_failed',
    );
    expect(vmFailed.saveStateLabel).toBe(
      'Save unavailable · Changes may not survive reload',
    );
  });
  it('derives accurate save-state labels for all persistenceUiState status variants', () => {
    const seed = createDemoApplicationSeed();
    const progress = getApplicationProgress(seed);
    const issues = getReviewIssues(seed);

    const vmSeed = getProgressViewModel(
      progress,
      'about',
      issues.length,
      null,
      {
        status: 'seed',
        message: 'Demo data ready · Changes save in this browser',
      },
    );
    expect(vmSeed.saveStateLabel).toBe(
      'Demo data ready · Changes save in this browser',
    );

    const vmLoaded = getProgressViewModel(
      progress,
      'about',
      issues.length,
      null,
      {
        status: 'loaded',
        message: 'Loaded from this browser',
      },
    );
    expect(vmLoaded.saveStateLabel).toBe('Loaded from this browser');

    const vmSaved = getProgressViewModel(
      progress,
      'about',
      issues.length,
      null,
      {
        status: 'saved-this-session',
        savedAt: '12:00 PM',
        message: 'All changes saved · 12:00 PM',
      },
    );
    expect(vmSaved.saveStateLabel).toBe('All changes saved · 12:00 PM');

    const vmRestored = getProgressViewModel(
      progress,
      'about',
      issues.length,
      null,
      {
        status: 'restored',
        message: 'Started fresh after a browser save issue',
      },
    );
    expect(vmRestored.saveStateLabel).toBe(
      'Started fresh after a browser save issue',
    );

    const vmFailed = getProgressViewModel(
      progress,
      'about',
      issues.length,
      null,
      {
        status: 'failed',
        message: 'Save unavailable · Changes may not survive reload',
      },
    );
    expect(vmFailed.saveStateLabel).toBe(
      'Save unavailable · Changes may not survive reload',
    );
  });

  it('never outputs eligibility or government-service claims', () => {
    const seed = createDemoApplicationSeed();
    const progress = getApplicationProgress(seed);
    const issues = getReviewIssues(seed);

    const vm = getProgressViewModel(progress, 'about', issues.length, null);
    const serialized = JSON.stringify(vm).toLowerCase();

    expect(serialized).not.toContain('eligible');
    expect(serialized).not.toContain('eligibility');
    expect(serialized).not.toContain('government');
    expect(serialized).not.toContain('official');
    expect(serialized).not.toContain('medicaid');
    expect(serialized).not.toContain('masshealth');
  });
});
