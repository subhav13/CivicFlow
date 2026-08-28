import { useEffect, useRef, useState } from 'react';
import type { ApplicationProgress, SectionId } from '../../domain';
import { SECTION_META } from '../layout/section-meta';

export interface SectionStepperProps {
  activeSection: SectionId;
  progress: ApplicationProgress;
  onNavigate: (section: SectionId) => void;
  saveStateLabel?: string;
  className?: string;
}

export function SectionStepper({
  activeSection,
  progress,
  onNavigate,
  saveStateLabel,
  className = '',
}: SectionStepperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeIndex = SECTION_META.findIndex((s) => s.id === activeSection);
  const currentStepNumber = activeIndex >= 0 ? activeIndex + 1 : 1;
  const totalSteps = SECTION_META.length;
  const activeMeta = SECTION_META[activeIndex] ?? SECTION_META[0];
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Close menu on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Scroll active item into view when navigation occurs
  useEffect(() => {
    if (
      activeItemRef.current &&
      typeof activeItemRef.current.scrollIntoView === 'function'
    ) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      activeItemRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeSection]);

  return (
    <nav
      className={`section-rail section-stepper ${className}`.trim()}
      aria-label="Application sections"
    >
      <div className="stepper-compact-bar" aria-label="Step progress summary">
        <div className="stepper-compact-info">
          <span className="stepper-step-badge">
            Step {currentStepNumber} of {totalSteps}
          </span>
          <span className="stepper-active-label">{activeMeta.label}</span>
          <span className="stepper-percent">{progress.percent}%</span>
        </div>
        <button
          type="button"
          className="stepper-toggle-button"
          aria-expanded={isOpen}
          aria-controls="all-sections-menu"
          aria-label={isOpen ? 'Hide all sections' : 'All 6 sections'}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span>{isOpen ? 'Close sections' : 'All 6 sections'}</span>
          <span className="stepper-toggle-arrow" aria-hidden="true">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>
      </div>

      <div
        id="all-sections-menu"
        className={`section-rail-content${isOpen ? ' is-open' : ''}`}
      >
        <p className="rail-label">Your application</p>
        <ol aria-label="All sections">
          {SECTION_META.map((section) => {
            const complete = Boolean(
              progress.sections.find((s) => s.id === section.id)?.complete,
            );
            const isActive = activeSection === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  ref={isActive ? activeItemRef : undefined}
                  className={`section-nav-button${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => {
                    onNavigate(section.id);
                    setIsOpen(false);
                  }}
                >
                  <span className="section-number">{section.eyebrow}</span>
                  <span className="section-nav-copy">
                    <span>{section.label}</span>
                    <small>{complete ? 'Complete' : 'Needs attention'}</small>
                  </span>
                  <span
                    className={`section-state${complete ? ' is-complete' : ''}`}
                    aria-hidden="true"
                  >
                    {complete ? '✓' : '·'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {saveStateLabel ? (
          <div className="rail-footer">
            <span className="rail-footer-icon" aria-hidden="true">
              ◌
            </span>
            <span>{saveStateLabel}</span>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
