import type { ReactNode } from 'react';

import type { CommandReceipt } from '../../application/commands';

export function SectionHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="active-section-heading" tabIndex={-1}>
        {title}
      </h2>
      <p>{description}</p>
    </header>
  );
}

export function SectionPanel({
  children,
  title,
  tone = 'plain',
}: {
  children: ReactNode;
  title?: string;
  tone?: 'plain' | 'soft';
}) {
  return (
    <section className={`section-panel section-panel-${tone}`}>
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}

export function ActionFeedback({
  receipt,
}: {
  receipt: CommandReceipt | null;
}) {
  if (!receipt) return null;
  return (
    <div
      className={`action-feedback ${receipt.kind}`}
      role="status"
      aria-live="polite"
    >
      <strong>
        {receipt.kind === 'success' ? 'Saved' : 'Needs attention'}
      </strong>
      <span>{receipt.message}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function PrimaryButton({
  children,
  disabled,
  id,
  onClick,
  type = 'submit',
}: {
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      className="primary-button"
      disabled={disabled}
      id={id}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  disabled,
  id,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      className="secondary-button"
      disabled={disabled}
      id={id}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
