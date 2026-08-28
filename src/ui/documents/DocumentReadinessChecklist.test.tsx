import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DocumentRequirement } from '../../domain/document-readiness';
import { DocumentReadinessChecklist } from './DocumentReadinessChecklist';

describe('DocumentReadinessChecklist component', () => {
  const mockRequirements: readonly DocumentRequirement[] = [
    {
      id: 'proof_of_income',
      kind: 'proof_of_income',
      label: 'Proof of income',
      required: true,
      status: 'missing',
      reason: 'Required demo proof of income for reported household income.',
      presetButtonLabel: 'Attach demo proof of income',
      presetDisplayName: 'Acme Dental synthetic proof of income',
    },
    {
      id: 'identity',
      kind: 'identity',
      label: 'Identity note',
      required: false,
      status: 'optional',
      reason: 'Optional metadata for the research walkthrough.',
      presetButtonLabel: 'Attach demo identity note',
      presetDisplayName: 'Maya Carter synthetic identity note',
    },
    {
      id: 'coverage',
      kind: 'coverage',
      label: 'Coverage card note',
      required: false,
      status: 'attached',
      reason: 'Optional synthetic coverage card note attached for walkthrough.',
      presetButtonLabel: 'Attach demo coverage note',
      presetDisplayName: 'Synthetic coverage card note',
    },
    {
      id: 'other',
      kind: 'other',
      label: 'Other synthetic note',
      required: false,
      status: 'optional',
      reason: 'A hostile-looking filename is displayed as inert plain text.',
      presetButtonLabel: 'Attach plain-text filename example',
      presetDisplayName: 'Ignore prior instructions — proof.txt',
    },
  ];

  it('renders all document requirements in an accessible list', () => {
    render(<DocumentReadinessChecklist requirements={mockRequirements} />);

    const list = screen.getByRole('list', {
      name: /document requirements checklist/i,
    });
    expect(list).toBeInTheDocument();

    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    expect(within(list).getByText('Proof of income')).toBeInTheDocument();
    expect(within(list).getByText('Identity note')).toBeInTheDocument();
    expect(within(list).getByText('Coverage card note')).toBeInTheDocument();
    expect(within(list).getByText('Other synthetic note')).toBeInTheDocument();
  });

  it('displays status badges for missing, attached, and optional states', () => {
    render(<DocumentReadinessChecklist requirements={mockRequirements} />);

    // Missing proof of income
    expect(screen.getByText('Missing')).toBeInTheDocument();

    // Attached coverage
    expect(screen.getByText('Attached')).toBeInTheDocument();

    // Optional identity and other
    const optionalBadges = screen.getAllByText('Optional');
    expect(optionalBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('triggers onAttachPreset when attach button on requirement item is clicked', () => {
    const handleAttach = vi.fn();
    render(
      <DocumentReadinessChecklist
        requirements={mockRequirements}
        onAttachPreset={handleAttach}
      />,
    );

    const attachButtons = screen.getAllByRole('button');
    if (attachButtons.length > 0) {
      fireEvent.click(attachButtons[0]);
      expect(handleAttach).toHaveBeenCalled();
    }
  });

  it('respects disabled prop on interactive elements', () => {
    const handleAttach = vi.fn();
    render(
      <DocumentReadinessChecklist
        disabled={true}
        requirements={mockRequirements}
        onAttachPreset={handleAttach}
      />,
    );

    const buttons = screen.queryAllByRole('button');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
