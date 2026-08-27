import { useEffect, useRef, useState } from 'react';

import { setAttestation, submitDemo } from '../../application/commands';
import { getReviewIssues, type ReviewIssue } from '../../domain';
import {
  ActionFeedback,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SectionPanel,
} from '../components/SectionPrimitives';
import type { BaseSectionProps } from '../types';

interface ReviewSectionProps extends BaseSectionProps {
  onIssueNavigate: (issue: ReviewIssue) => void;
  onReset: () => void;
}

export function ReviewSection({
  application,
  dispatch,
  disabled,
  onIssueNavigate,
  onReset,
}: ReviewSectionProps) {
  const [receipt, setReceipt] = useState<ReturnType<
    BaseSectionProps['dispatch']
  > | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const hadResetDialog = useRef(false);
  const issues = getReviewIssues(application);
  const submitted = application.submission.status === 'submitted_demo';

  useEffect(() => {
    if (showResetConfirm) {
      hadResetDialog.current = true;
      document.getElementById('confirm-reset-button')?.focus();
    } else if (hadResetDialog.current) {
      hadResetDialog.current = false;
      document.getElementById('reset-demo-button')?.focus();
    }
  }, [showResetConfirm]);

  useEffect(() => {
    if (!showResetConfirm) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowResetConfirm(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm]);

  function changeAttestation(accepted: boolean) {
    const nextReceipt = dispatch(
      (state, context) => setAttestation(state, { accepted }, context),
      {
        activity: {
          id: 'human-attestation',
          summary: 'Updated demo attestation',
        },
      },
    );
    setReceipt(nextReceipt);
  }

  function handleSubmit() {
    const nextReceipt = dispatch(
      (state, context) => submitDemo(state, context),
      {
        activity: {
          id: 'human-submit-demo',
          summary: 'Submitted local synthetic demo',
        },
      },
    );
    setReceipt(nextReceipt);
  }

  function handleReset() {
    onReset();
    setShowResetConfirm(false);
    setReceipt(null);
  }

  return (
    <div className="section-content">
      <SectionHeader
        description="Review the local synthetic application, resolve blockers, and submit only through the visible human control."
        eyebrow="Final check"
        title="Review & Sign"
      />

      <SectionPanel title="Blocking review issues" tone="soft">
        {issues.length > 0 ? (
          <ol className="review-issue-list" aria-label="Blocking review issues">
            {issues.map((issue) => (
              <li className="review-issue" key={issue.code}>
                <span className="issue-marker" aria-hidden="true">
                  !
                </span>
                <div>
                  <span className="review-issue-message">{issue.message}</span>
                  {issue.entityLabel ? (
                    <small>{issue.entityLabel}</small>
                  ) : null}
                </div>
                <button
                  aria-label={`Review ${issue.section}: ${issue.message}`}
                  className="issue-link"
                  onClick={() => onIssueNavigate(issue)}
                  type="button"
                >
                  Review
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="review-ready" role="status">
            <strong>Everything required is ready.</strong>
            <span>
              Confirm the attestation below to enable the local demo submission.
            </span>
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="Attestation and local submission">
        <label className="attestation-row" htmlFor="demo-attestation">
          <input
            checked={application.attestation.accepted}
            disabled={disabled}
            id="demo-attestation"
            onChange={(event) => changeAttestation(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>
              I understand this is a fictional synthetic research demo.
            </strong>
            <small>
              No government service, eligibility decision, or external
              submission is involved.
            </small>
          </span>
        </label>
        <div className="form-actions form-actions-wide">
          <PrimaryButton
            disabled={submitted}
            onClick={handleSubmit}
            type="button"
          >
            {submitted ? 'Demo submitted locally' : 'Submit Demo'}
          </PrimaryButton>
          {submitted ? (
            <SecondaryButton
              id="reset-demo-button"
              onClick={() => setShowResetConfirm(true)}
            >
              Reset demo
            </SecondaryButton>
          ) : null}
        </div>
        {submitted ? (
          <p className="submitted-banner" role="status">
            Synthetic demo submitted locally. No network request was made.
          </p>
        ) : null}
        <ActionFeedback receipt={receipt} />
      </SectionPanel>

      {showResetConfirm ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-labelledby="reset-dialog-title"
            aria-modal="true"
            className="reset-dialog"
            role="dialog"
          >
            <h3 id="reset-dialog-title">Reset this synthetic demo?</h3>
            <p>
              This clears the local application and restores the Maya Carter
              seed.
            </p>
            <div className="form-actions">
              <PrimaryButton
                id="confirm-reset-button"
                onClick={handleReset}
                type="button"
              >
                Confirm reset
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowResetConfirm(false)}>
                Keep editing
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
