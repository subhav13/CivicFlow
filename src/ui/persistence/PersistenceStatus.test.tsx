import { render, screen } from '@testing-library/react';
import { PersistenceStatus } from './PersistenceStatus';

describe('PersistenceStatus component', () => {
  it('renders loaded status when restored from valid browser storage without claiming current-session timestamp', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'loaded',
          message: 'Loaded from this browser',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loaded from this browser',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(/am|pm|:\d{2}/i);
  });

  it('renders saved-this-session status with exact timestamp when real save occurred', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'saved-this-session',
          savedAt: '12:00 PM',
          message: 'All changes saved · 12:00 PM',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'All changes saved · 12:00 PM',
    );
  });

  it('renders persistent non-sensitive failure warning on write failure', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'failed',
          message: 'Save unavailable · Changes may not survive reload',
        }}
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Save unavailable · Changes may not survive reload',
    );
    expect(status).toHaveClass('is-failed');
    // Ensure no sensitive profile fields or raw JSON
    expect(status).not.toHaveTextContent(/maya|carter|income|ssn/i);
  });

  it('renders untouched seed status on initial session', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'seed',
          message: 'Demo data ready · Changes save in this browser',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Demo data ready · Changes save in this browser',
    );
  });

  it('renders untouched seed fallback status when no message is provided', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'seed',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Demo data ready · Changes save in this browser',
    );
  });

  it('renders corrupt storage recovery status when fallback from corrupted storage occurred', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'restored',
          message: 'Started fresh after a browser save issue',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Started fresh after a browser save issue',
    );
  });

  it('renders corrupt storage recovery status when fallback from corrupted storage occurred without message', () => {
    render(
      <PersistenceStatus
        persistenceUiState={{
          status: 'restored',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Started fresh after a browser save issue',
    );
  });

  it('renders corrupt storage recovery status when persistenceNotice is recovered', () => {
    render(<PersistenceStatus persistenceNotice="recovered" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Started fresh after a browser save issue',
    );
  });
});
