import type { ProgressViewModel } from './progress-view-model';

interface ApplicationProgressTrackerProps {
  viewModel: ProgressViewModel;
}

export function ApplicationProgressTracker({
  viewModel,
}: ApplicationProgressTrackerProps) {
  return (
    <header
      className="progress-header"
      role="region"
      aria-label="Application progress"
      data-testid="application-progress-tracker"
    >
      <div className="progress-header-main">
        <div>
          <p className="eyebrow">Application workspace</p>
          <h1>CivicFlow synthetic demo</h1>
          <p className="progress-copy">
            Complete the sections for Maya Carter and her household.
          </p>
        </div>
        <div
          className="progress-meter"
          role="progressbar"
          aria-valuenow={viewModel.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${viewModel.percent}% complete`}
        >
          <div className="progress-meter-label">
            <span>Progress</span>
            <strong>{viewModel.percent}% complete</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${viewModel.percent}%` }} />
          </div>
        </div>
      </div>

      <div className="progress-stats-strip" aria-label="Progress details">
        <div className="progress-stat-pill">
          <span className="stat-pill-label">Sections</span>
          <strong>
            {viewModel.completedCount} of {viewModel.totalSections}
          </strong>
        </div>
        <div className="progress-stat-pill">
          <span className="stat-pill-label">Blockers</span>
          <strong
            className={
              viewModel.blockerCount > 0
                ? 'blockers-active'
                : 'blockers-complete'
            }
          >
            {viewModel.blockerCount}
          </strong>
        </div>
        <div className="progress-stat-pill">
          <span className="stat-pill-label">Active</span>
          <strong>{viewModel.activeSectionLabel}</strong>
        </div>
        <div className="progress-stat-pill">
          <span className="stat-pill-label">Next</span>
          <strong>{viewModel.nextSectionLabel}</strong>
        </div>
        <div className="progress-stat-pill save-state-pill">
          <span className="save-state-icon" aria-hidden="true">
            ◌
          </span>
          <span>{viewModel.saveStateLabel}</span>
        </div>
      </div>
    </header>
  );
}
