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
});
