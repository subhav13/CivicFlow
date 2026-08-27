import type { ReactNode } from 'react';

import type { ApplicationProgress, SectionId } from '../../domain';
import type { CapabilitySummary } from '../../application/store';
import { AgentCompanion } from '../agent-companion/AgentCompanion';
import { SECTION_META } from './section-meta';

interface ApplicationShellProps {
  activeSection: SectionId;
  capabilities: readonly CapabilitySummary[];
  companionOpen: boolean;
  currentSection: ReactNode;
  onCloseCompanion: () => void;
  onNavigate: (section: SectionId) => void;
  onOpenCompanion: () => void;
  progress: ApplicationProgress;
}

export function ApplicationShell({
  activeSection,
  capabilities,
  companionOpen,
  currentSection,
  onCloseCompanion,
  onNavigate,
  onOpenCompanion,
  progress,
}: ApplicationShellProps) {
  const activeIndex = SECTION_META.findIndex(
    (section) => section.id === activeSection,
  );
  const nextSection =
    activeIndex >= 0 ? SECTION_META[activeIndex + 1] : undefined;

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            CF
          </div>
          <div>
            <p className="brand-name">CivicFlow</p>
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

      <div className="progress-header">
        <div>
          <p className="eyebrow">Application workspace</p>
          <h1>CivicFlow synthetic demo</h1>
          <p className="progress-copy">
            Complete the sections for Maya Carter and her household.
          </p>
        </div>
        <div
          className="progress-meter"
          aria-label={`${progress.percent}% complete`}
        >
          <div className="progress-meter-label">
            <span>Progress</span>
            <strong>{progress.percent}% complete</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </div>

      <div className="workspace-grid">
        <nav className="section-rail" aria-label="Application sections">
          <p className="rail-label">Your application</p>
          <ol>
            {SECTION_META.map((section) => {
              const sectionProgress = progress.sections.find(
                (item) => item.id === section.id,
              );
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`section-nav-button${isActive ? ' is-active' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => onNavigate(section.id)}
                  >
                    <span className="section-number">{section.eyebrow}</span>
                    <span className="section-nav-copy">
                      <span>{section.label}</span>
                      <small>
                        {sectionProgress?.complete
                          ? 'Complete'
                          : 'Needs attention'}
                      </small>
                    </span>
                    <span
                      className={`section-state${sectionProgress?.complete ? ' is-complete' : ''}`}
                      aria-hidden="true"
                    >
                      {sectionProgress?.complete ? '✓' : '·'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="rail-footer">
            <span className="rail-footer-icon" aria-hidden="true">
              ◌
            </span>
            <span>Saved in this browser</span>
          </div>
        </nav>

        <main
          className="application-main"
          aria-labelledby="active-section-heading"
        >
          {currentSection}
          <div className="section-footer">
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

        <AgentCompanion
          capabilities={capabilities}
          isOpen={companionOpen}
          onClose={onCloseCompanion}
          onOpen={onOpenCompanion}
        />
      </div>
    </div>
  );
}
