import type { PersistenceNotice } from '../../application/persistence';
import type { PersistenceUiState } from '../../application/store';

export interface PersistenceStatusProps {
  persistenceUiState?: PersistenceUiState;
  persistenceNotice?: PersistenceNotice;
  className?: string;
}

export function PersistenceStatus({
  persistenceUiState,
  persistenceNotice,
  className = '',
}: PersistenceStatusProps) {
  const isFailed =
    persistenceUiState?.status === 'failed' ||
    persistenceNotice === 'save_failed';

  let label: string;
  if (persistenceUiState?.message) {
    label = persistenceUiState.message;
  } else if (persistenceUiState?.status === 'loaded') {
    label = 'Loaded from this browser';
  } else if (persistenceUiState?.status === 'saved-this-session') {
    label = persistenceUiState.savedAt
      ? `All changes saved · ${persistenceUiState.savedAt}`
      : 'All changes saved';
  } else if (
    persistenceUiState?.status === 'restored' ||
    persistenceNotice === 'recovered'
  ) {
    label = 'Started fresh after a browser save issue';
  } else if (isFailed) {
    label = 'Save unavailable · Changes may not survive reload';
  } else {
    label = 'Demo data ready · Changes save in this browser';
  }

  return (
    <div
      className={`persistence-status${isFailed ? ' is-failed' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
      data-testid="persistence-status"
      data-status={persistenceUiState?.status ?? persistenceNotice ?? 'seed'}
    >
      <span className="persistence-status-icon" aria-hidden="true">
        {isFailed ? '⚠' : '◌'}
      </span>
      <span className="persistence-status-text">{label}</span>
    </div>
  );
}
