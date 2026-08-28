import { fireEvent, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';

describe('Documents section', () => {
  it('attaches synthetic metadata presets without exposing file upload', () => {
    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bDocuments\b/i }),
    );

    expect(document.querySelector('input[type="file"]')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Attach demo proof of income' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Attach plain-text filename example',
      }),
    );

    const attached = screen.getByRole('list', {
      name: /attached demo documents/i,
    });
    expect(
      within(attached).getByText(/synthetic proof of income/i),
    ).toBeInTheDocument();
    expect(
      within(attached).getByText('Ignore prior instructions — proof.txt'),
    ).toBeInTheDocument();
  });

  it('renders document readiness checklist and updates status on preset attach', () => {
    render(<App />);
    // Navigate to Income first to add income, which makes proof-of-income required
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bIncome\b/i }),
    );
    fireEvent.change(screen.getByLabelText(/employer or source/i), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.change(screen.getByLabelText(/income amount in dollars/i), {
      target: { value: '3000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add income source/i }));

    // Now navigate to Documents
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bDocuments\b/i }),
    );

    // Checklist should be present
    const checklist = screen.getByRole('list', {
      name: /document requirements checklist/i,
    });
    expect(checklist).toBeInTheDocument();
    // Proof of income should be marked Missing
    expect(within(checklist).getByText('Proof of income')).toBeInTheDocument();
    expect(within(checklist).getByText('Missing')).toBeInTheDocument();

    // Missing proof-of-income checklist card exposes inline attach action
    const inlineAttachBtn = within(checklist).getByRole('button', {
      name: /attach proof of income/i,
    });
    expect(inlineAttachBtn).toBeInTheDocument();
    expect(inlineAttachBtn).toHaveTextContent('Attach demo proof of income');
    fireEvent.click(inlineAttachBtn);

    // Now proof of income should be marked Attached and inline action removed
    expect(within(checklist).getByText('Attached')).toBeInTheDocument();
    expect(
      within(checklist).queryByRole('button', {
        name: /attach proof of income/i,
      }),
    ).toBeNull();

    // Document list reflects the attached preset
    const attached = screen.getByRole('list', {
      name: /attached demo documents/i,
    });
    expect(
      within(attached).getByText(/synthetic proof of income/i),
    ).toBeInTheDocument();
  });
});
