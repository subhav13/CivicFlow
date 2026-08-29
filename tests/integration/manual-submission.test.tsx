import { fireEvent, render, screen, within } from '@testing-library/react';

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

function addEmma() {
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
  fireEvent.click(screen.getByRole('button', { name: 'Add household member' }));
}

function addIncome() {
  goTo('income');
  fireEvent.change(screen.getByLabelText(/employer or source/i), {
    target: { value: 'Acme Dental' },
  });
  fireEvent.change(screen.getByLabelText(/income amount in dollars/i), {
    target: { value: '4,950.00' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add income source' }));
}

function recordNoCoverage() {
  goTo('current coverage');
  fireEvent.change(screen.getByLabelText('Coverage status for Maya Carter'), {
    target: { value: 'none' },
  });
  fireEvent.change(screen.getByLabelText('Coverage status for Emma Carter'), {
    target: { value: 'none' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save coverage status' }));
}

describe('manual synthetic submission', () => {
  it('completes the golden path locally, locks edits, and resets only after confirmation', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const beaconSpy = vi.fn(() => false);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: beaconSpy,
    });

    render(<App />);
    addEmma();
    addIncome();
    expect(screen.getByText('60% complete')).toBeInTheDocument();
    recordNoCoverage();

    goTo('review & sign');
    expect(
      screen.getByRole('list', { name: /blocking review issues/i }),
    ).toHaveTextContent(/attach demo proof of income/i);

    goTo('documents');
    fireEvent.click(
      screen.getByRole('button', { name: 'Attach demo proof of income' }),
    );

    goTo('review & sign');
    expect(
      screen.getByRole('list', { name: /blocking review issues/i }),
    ).toHaveTextContent(/attestation/i);
    fireEvent.click(
      screen.getByLabelText(
        /i understand this is a fictional synthetic research demo/i,
      ),
    );
    expect(
      screen.queryByRole('list', { name: /blocking review issues/i }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Demo' }));

    expect(
      screen.getByText(/synthetic demo submitted locally/i),
    ).toBeInTheDocument();
    const submittedButton = screen.getByRole('button', {
      name: 'Demo submitted locally',
    });
    expect(submittedButton).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();

    goTo('income');
    expect(screen.getByLabelText(/employer or source/i)).toBeDisabled();

    goTo('review & sign');
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(
      screen.getByRole('dialog', { name: /reset this synthetic demo/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm reset' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: /reset this synthetic demo/i }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset demo' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reset' }));

    expect(screen.getByText('20% complete')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'About You' }),
    ).toBeInTheDocument();
  }, 15_000);
});
