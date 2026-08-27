import { fireEvent, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';
import { formatCentsAsDollars, parseDollarsToCents } from '../currency';

describe('Income section', () => {
  it('keeps currency at the UI boundary and adds a monthly Acme Dental source', () => {
    expect(parseDollarsToCents('4,950.00')).toBe(495000);
    expect(parseDollarsToCents('4,950.001')).toBeNull();
    expect(formatCentsAsDollars(495000)).toBe('$4,950.00');

    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bIncome\b/i }),
    );

    fireEvent.change(screen.getByLabelText(/employer or source/i), {
      target: { value: 'Acme Dental' },
    });
    fireEvent.change(screen.getByLabelText(/income amount in dollars/i), {
      target: { value: '4,950.00' },
    });
    fireEvent.change(screen.getByLabelText(/income frequency/i), {
      target: { value: 'monthly' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add income source' }));

    expect(screen.getByText('Acme Dental')).toBeInTheDocument();
    expect(screen.getByText('$4,950.00 monthly')).toBeInTheDocument();
  });

  it('shows a recoverable error for excess currency precision', () => {
    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bIncome\b/i }),
    );
    fireEvent.change(screen.getByLabelText(/employer or source/i), {
      target: { value: 'Example work' },
    });
    fireEvent.change(screen.getByLabelText(/income amount in dollars/i), {
      target: { value: '10.999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add income source' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/whole cents/i);
  });

  it('confirms no income from an empty branch', () => {
    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bIncome\b/i }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm no income' }));

    expect(
      screen.getByText('No income confirmed for this demo.'),
    ).toBeInTheDocument();
  });

  it('explains why no-income confirmation is unavailable with a recorded source', () => {
    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bIncome\b/i }),
    );

    fireEvent.change(screen.getByLabelText(/employer or source/i), {
      target: { value: 'Acme Dental' },
    });
    fireEvent.change(screen.getByLabelText(/income amount in dollars/i), {
      target: { value: '4,950.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add income source' }));

    expect(
      screen.getByRole('button', { name: 'Confirm no income' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('note', { name: /no-income confirmation/i }),
    ).toHaveTextContent(/recorded income source/i);
  });
});
