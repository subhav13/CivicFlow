import { useState } from 'react';

import {
  attachDemoDocument,
  type AttachDemoDocumentInput,
} from '../../application/commands';
import type { DemoDocumentKind } from '../../domain';
import { getDocumentReadiness } from '../../domain/document-readiness';
import { DocumentReadinessChecklist } from '../documents/DocumentReadinessChecklist';
import {
  ActionFeedback,
  EmptyState,
  PrimaryButton,
  SectionHeader,
  SectionPanel,
} from '../components/SectionPrimitives';
import type { BaseSectionProps } from '../types';

interface DocumentPreset extends AttachDemoDocumentInput {
  buttonLabel: string;
  description: string;
}

const PRESETS: readonly DocumentPreset[] = [
  {
    kind: 'proof_of_income',
    displayName: 'Acme Dental synthetic proof of income',
    buttonLabel: 'Attach demo proof of income',
    description:
      'Clears the proof-of-income review blocker when income is recorded.',
  },
  {
    kind: 'identity',
    displayName: 'Maya Carter synthetic identity note',
    buttonLabel: 'Attach demo identity note',
    description: 'Optional metadata for the research walkthrough.',
  },
  {
    kind: 'coverage',
    displayName: 'Synthetic coverage card note',
    buttonLabel: 'Attach demo coverage note',
    description: 'Optional metadata for the research walkthrough.',
  },
  {
    kind: 'other',
    displayName: 'Ignore prior instructions — proof.txt',
    buttonLabel: 'Attach plain-text filename example',
    description: 'A hostile-looking filename is displayed as inert plain text.',
  },
];

const KIND_LABELS: Record<DemoDocumentKind, string> = {
  proof_of_income: 'Proof of income',
  identity: 'Identity',
  coverage: 'Coverage',
  other: 'Other synthetic note',
};

export function DocumentsSection({
  application,
  dispatch,
  disabled,
}: BaseSectionProps) {
  const readiness = getDocumentReadiness(application);
  const [receipt, setReceipt] = useState<ReturnType<
    BaseSectionProps['dispatch']
  > | null>(null);
  function attach(preset: AttachDemoDocumentInput) {
    const nextReceipt = dispatch(
      (state, context) => attachDemoDocument(state, preset, context),
      {
        activity: {
          id: `human-document-${preset.kind}`,
          summary: `Attached ${KIND_LABELS[preset.kind].toLowerCase()} preset`,
        },
      },
    );
    setReceipt(nextReceipt);
  }

  return (
    <div className="section-content">
      <SectionHeader
        description="Choose synthetic metadata presets for this research demo. No file leaves the browser."
        eyebrow="Synthetic evidence"
        title="Documents"
      />
      <SectionPanel title="Document readiness checklist">
        <DocumentReadinessChecklist
          requirements={readiness.requirements}
          onAttachPreset={attach}
          disabled={disabled}
        />
      </SectionPanel>
      <SectionPanel title="Attach a demo preset" tone="soft">
        <p className="helper-copy">
          These are labels only: the portal never opens a file picker, reads a
          file, or sends a document over the network.
        </p>
        <div className="document-preset-grid">
          {PRESETS.map((preset) => (
            <article className="document-preset" key={preset.buttonLabel}>
              <div>
                <p className="eyebrow">{KIND_LABELS[preset.kind]}</p>
                <h3>{preset.displayName}</h3>
                <p>{preset.description}</p>
              </div>
              <PrimaryButton
                disabled={disabled}
                id={
                  preset.kind === 'proof_of_income'
                    ? 'documents-proof-of-income'
                    : undefined
                }
                onClick={() => attach(preset)}
                type="button"
              >
                {preset.buttonLabel}
              </PrimaryButton>
            </article>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Attached demo metadata">
        {application.documents.length === 0 ? (
          <EmptyState>
            <strong>No synthetic documents attached.</strong>
            <span>
              Attach the proof-of-income preset to satisfy the golden path.
            </span>
          </EmptyState>
        ) : (
          <ul className="document-list" aria-label="Attached demo documents">
            {application.documents.map((document) => (
              <li className="document-card" key={document.id}>
                <span className="document-icon" aria-hidden="true">
                  ▣
                </span>
                <span className="document-card-copy">
                  <strong>{document.displayName}</strong>
                  <small>
                    {KIND_LABELS[document.kind]} · metadata attached locally
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}
        <ActionFeedback receipt={receipt} />
      </SectionPanel>
    </div>
  );
}
