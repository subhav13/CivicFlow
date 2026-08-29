import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';

import { App } from '../../app/App';
import {
  validateApplicationState,
  createDemoApplicationSeed,
} from '../../domain';
import type { BaseSectionProps } from '../types';
import { CoverageSection } from './CoverageSection';

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

  it('refreshes an externally changed person while preserving an unrelated unsaved draft', () => {
    const initial = createDemoApplicationSeed();
    const withEmma = validateApplicationState({
      ...initial,
      revision: 1,
      householdConfirmed: true,
      householdMembers: [
        {
          id: 'person-emma-carter',
          firstName: 'Emma',
          lastName: 'Carter',
          ageYears: 7,
          relationship: 'daughter',
          applyingForCoverage: true,
        },
      ],
    });
    const externallyUpdated = validateApplicationState({
      ...withEmma,
      revision: 2,
      coverageRecords: [{ personId: 'person-emma-carter', status: 'none' }],
    });
    const dispatch = vi.fn<NonNullable<BaseSectionProps['dispatch']>>();
    const props = {
      application: withEmma,
      dispatch,
      disabled: false,
      onNavigate: vi.fn(),
    } satisfies BaseSectionProps;
    const { rerender } = render(<CoverageSection {...props} />);

    fireEvent.change(screen.getByLabelText('Coverage status for Maya Carter'), {
      target: { value: 'covered' },
    });
    fireEvent.change(screen.getByLabelText('Provider for Maya Carter'), {
      target: { value: 'Maya Health' },
    });

    rerender(<CoverageSection {...props} application={externallyUpdated} />);

    expect(
      screen.getByLabelText('Coverage status for Maya Carter'),
    ).toHaveValue('covered');
    expect(screen.getByLabelText('Provider for Maya Carter')).toHaveValue(
      'Maya Health',
    );
    expect(
      screen.getByLabelText('Coverage status for Emma Carter'),
    ).toHaveValue('none');
  });

  it('clears a person error when an authoritative coverage update arrives', () => {
    const initial = createDemoApplicationSeed();
    const withEmma = validateApplicationState({
      ...initial,
      revision: 1,
      householdConfirmed: true,
      householdMembers: [
        {
          id: 'person-emma-carter',
          firstName: 'Emma',
          lastName: 'Carter',
          ageYears: 7,
          relationship: 'daughter',
          applyingForCoverage: true,
        },
      ],
    });
    const externallyUpdated = validateApplicationState({
      ...withEmma,
      revision: 2,
      coverageRecords: [{ personId: 'person-emma-carter', status: 'none' }],
    });
    const dispatch = vi.fn<NonNullable<BaseSectionProps['dispatch']>>();
    const props = {
      application: withEmma,
      dispatch,
      disabled: false,
      onNavigate: vi.fn(),
    } satisfies BaseSectionProps;
    const { rerender } = render(<CoverageSection {...props} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Save coverage status' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Emma Carter/);

    rerender(<CoverageSection {...props} application={externallyUpdated} />);

    expect(screen.getByRole('alert')).not.toHaveTextContent(/Emma Carter/);
  });
});
