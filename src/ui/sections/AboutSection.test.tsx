import { fireEvent, render, screen } from '@testing-library/react';

import { App } from '../../app/App';

describe('About You section', () => {
  it('shows Maya and saves an edited applicant through the human form', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'About You' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveValue('Maya');

    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Cambridge' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      /application updated/i,
    );
  });

  it('renders a recoverable validation message for a blank required field', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      /first name.*required/i,
    );
  });
});
