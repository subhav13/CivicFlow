import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToolConfirmationModal } from './ToolConfirmationModal';

describe('ToolConfirmationModal', () => {
  it('uses concise button-only confirmation without a dangling description', () => {
    const onConfirm = vi.fn();
    render(
      <ToolConfirmationModal
        confirmation={{
          callId: 'income-1',
          toolName: 'add_income_source',
          message: 'Confirm adding Acme income.',
          draft: {
            title: 'Add income source',
            fields: [{ label: 'Employer', value: 'Acme Dental' }],
          },
        }}
        status="confirming"
        onConfirm={onConfirm}
        onCancel={() => {}}
        onNeedCorrection={() => {}}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add income source' });
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(dialog).not.toHaveTextContent('Confirm adding Acme income.');
    expect(dialog).not.toHaveTextContent('I confirm these details, add it');
    expect(screen.getByRole('button', { name: 'Save change' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Confirm and apply' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save change' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
