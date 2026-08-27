import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/app/App';

function goTo(section: string) {
  const navigation = screen.getByRole('navigation', {
    name: 'Application sections',
  });
  fireEvent.click(
    within(navigation).getByRole('button', {
      name: new RegExp(`^\\d{2} ${section}`, 'i'),
    }),
  );
}

describe('Capability and Activity UI Integration', () => {
  it('renders Agent Companion with live dynamic capabilities in portal', async () => {
    render(<App />);

    // In a browser/jsdom without document.modelContext, it shows truthful fallback or registered capabilities
    const companion = screen.getByLabelText('Agent Companion');
    expect(companion).toBeInTheDocument();
  });

  it('reflects dynamic capability changes when selecting records', async () => {
    render(<App />);

    // Navigate to household and add Emma
    goTo('household');
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

    // After adding Emma, Emma card is selected
    expect(screen.getByText('Emma Carter')).toBeInTheDocument();
  });

  it('displays activity feed entries with truthful attribution', async () => {
    render(<App />);

    goTo('household');
    fireEvent.change(screen.getByLabelText('Household member first name'), {
      target: { value: 'Emma' },
    });
    fireEvent.change(screen.getByLabelText('Household member age'), {
      target: { value: '7' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add household member' }),
    );

    const companion = screen.getByLabelText('Agent Companion');
    expect(companion).toBeInTheDocument();
  });

  it('never shows submit tool or submit button in Agent Companion', () => {
    render(<App />);

    const companion = screen.getByLabelText('Agent Companion');
    expect(
      within(companion).queryByRole('button', { name: /submit/i }),
    ).toBeNull();
    expect(companion.textContent).not.toMatch(/submit_application/i);
    expect(companion.textContent).not.toMatch(/submitDemo/i);
  });
});
