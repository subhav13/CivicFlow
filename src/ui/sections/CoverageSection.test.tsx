import { fireEvent, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';

function addEmma() {
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
  fireEvent.click(screen.getByRole('button', { name: 'Add household member' }));
}

describe('Current Coverage section', () => {
  it('records explicit none coverage for every applying person and clears details', () => {
    render(<App />);
    addEmma();
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bCurrent Coverage\b/i }),
    );

    const mayaStatus = screen.getByLabelText('Coverage status for Maya Carter');
    const emmaStatus = screen.getByLabelText('Coverage status for Emma Carter');
    fireEvent.change(mayaStatus, { target: { value: 'none' } });
    fireEvent.change(emmaStatus, { target: { value: 'none' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save coverage status' }),
    );

    expect(
      screen.getByText('2 people have a recorded coverage status.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Provider for Maya Carter'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Provider for Emma Carter'),
    ).not.toBeInTheDocument();
  });

  it('requires a status for each person before saving', () => {
    render(<App />);
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: /application sections/i }),
      ).getByRole('button', { name: /\bCurrent Coverage\b/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Save coverage status' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/each person/i);
  });
});
