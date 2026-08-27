import { fireEvent, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';

function goToSection(label: string) {
  fireEvent.click(
    within(
      screen.getByRole('navigation', { name: /application sections/i }),
    ).getByRole('button', { name: new RegExp(label, 'i') }),
  );
}

describe('Review & Sign section', () => {
  it('renders stable selector issues and navigates an issue link to its section', () => {
    render(<App />);
    goToSection('Review & Sign');

    const issueList = screen.getByRole('list', {
      name: /blocking review issues/i,
    });
    expect(
      within(issueList)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'Review household: Confirm the recorded household members.',
      'Review income: Add an income source or confirm no income.',
      'Review coverage: Record coverage status for every person applying for coverage.',
      'Review review: Accept the demo attestation before submission.',
    ]);

    fireEvent.click(
      within(issueList).getByRole('button', {
        name: /confirm the recorded household members/i,
      }),
    );
    expect(screen.getByLabelText('Household member first name')).toHaveFocus();
  });

  it('focuses the applying person who is still missing coverage', () => {
    render(<App />);

    goToSection('Household');
    fireEvent.change(screen.getByLabelText('Household member first name'), {
      target: { value: 'Emma' },
    });
    fireEvent.change(screen.getByLabelText('Household member last name'), {
      target: { value: 'Carter' },
    });
    fireEvent.change(screen.getByLabelText('Household member age'), {
      target: { value: '7' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add household member' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Emma Carter' }));
    fireEvent.click(screen.getByLabelText('Applying for coverage'));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Update selected household member',
      }),
    );

    goToSection('Current Coverage');
    fireEvent.change(screen.getByLabelText('Coverage status for Maya Carter'), {
      target: { value: 'none' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save coverage status' }),
    );

    goToSection('Household');
    fireEvent.click(
      screen.getByRole('button', { name: 'Deselect Emma Carter' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select Emma Carter' }));
    fireEvent.click(screen.getByLabelText('Applying for coverage'));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Update selected household member',
      }),
    );

    goToSection('Review & Sign');
    const coverageIssue = screen.getByRole('button', {
      name: /record coverage status for every person/i,
    });
    fireEvent.click(coverageIssue);

    expect(
      screen.getByLabelText('Coverage status for Emma Carter'),
    ).toHaveFocus();
  });
});
