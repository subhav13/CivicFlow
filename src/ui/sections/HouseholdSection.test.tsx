import { fireEvent, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';

describe('Household section', () => {
  it('adds, selects, edits, and confirms a synthetic household member', () => {
    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bHousehold\b/i }),
    );

    fireEvent.change(screen.getByLabelText('Household member first name'), {
      target: { value: 'Emma' },
    });
    fireEvent.change(screen.getByLabelText('Household member last name'), {
      target: { value: 'Carter' },
    });
    fireEvent.change(screen.getByLabelText('Household member age'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Household member relationship'), {
      target: { value: 'daughter' },
    });
    fireEvent.click(screen.getByLabelText(/member applying for coverage/i));
    fireEvent.click(
      screen.getByRole('button', { name: 'Add household member' }),
    );

    expect(screen.getByText('Emma Carter')).toBeInTheDocument();
    const selectButton = screen.getByRole('button', {
      name: 'Select Emma Carter',
    });
    expect(selectButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(selectButton);
    expect(selectButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByLabelText('Selected member first name'), {
      target: { value: 'Emma-Rose' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Update selected household member' }),
    );
    expect(screen.getByText('Emma-Rose Carter')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'No other household members' }),
    );
    expect(screen.getByText('Household confirmed.')).toBeInTheDocument();
  });
});
