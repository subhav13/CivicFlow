import { fireEvent, render, screen, within } from '@testing-library/react';

import { App } from '../../app/App';

describe('CivicFlow application shell', () => {
  it('renders the six sections in order with the seeded 20 percent progress', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /civicflow synthetic demo/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      /fictional research demo.*synthetic data only/i,
    );
    expect(screen.getByText('20% complete')).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', {
      name: /application sections/i,
    });
    expect(
      within(navigation)
        .getAllByRole('button')
        .filter((button) => button.classList.contains('section-nav-button'))
        .map((button) =>
          button.querySelector('.section-nav-copy > span')?.textContent?.trim(),
        ),
    ).toEqual([
      'About You',
      'Household',
      'Income',
      'Current Coverage',
      'Documents',
      'Review & Sign',
    ]);
  });

  it('keeps the companion truthful and exposes a mobile drawer affordance', () => {
    render(<App />);

    expect(
      screen.getByRole('complementary', { name: /agent companion/i }),
    ).toHaveTextContent(/no site tools are enabled yet/i);

    fireEvent.click(
      screen.getByRole('button', { name: /open agent companion/i }),
    );
    expect(
      screen.getByRole('dialog', { name: /agent companion/i }),
    ).toHaveTextContent(/no site tools are enabled yet/i);
    expect(
      screen.getByRole('button', { name: 'Close Agent Companion' }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: /agent companion/i }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: /open agent companion/i }),
    ).toHaveFocus();
  });

  it('traverses each section with its visible next control', () => {
    render(<App />);

    const labels = [
      'About You',
      'Household',
      'Income',
      'Current Coverage',
      'Documents',
      'Review & Sign',
    ];

    for (const label of labels.slice(1)) {
      fireEvent.click(
        screen.getByRole('button', { name: new RegExp(`^Next: ${label}`) }),
      );
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }

    expect(
      screen.getByRole('button', { name: 'Next section unavailable' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Review & Sign is the final section.'),
    ).toBeInTheDocument();
  });

  it('renders detailed progress tracker with N of 6, blockers, active step, and next target', () => {
    render(<App />);

    const tracker = screen.getByTestId('application-progress-tracker');
    expect(tracker).toBeInTheDocument();
    expect(within(tracker).getByText('1 of 6')).toBeInTheDocument();
    expect(within(tracker).getByText('4')).toBeInTheDocument(); // 4 blockers in seed
    expect(within(tracker).getByText('About You')).toBeInTheDocument();
    expect(within(tracker).getByText('Household')).toBeInTheDocument();
    expect(
      within(tracker).getByText(
        'Demo data ready · Changes save in this browser',
      ),
    ).toBeInTheDocument();
  });
});
