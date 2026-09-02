import { useState } from 'react';

export interface PromptCard {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly promptText: string;
}

export const FIRST_RUN_PROMPTS: readonly PromptCard[] = [
  {
    id: 'add-household-member',
    title: 'Add a household member',
    description:
      'Instruct the agent to add a dependent child to the household.',
    promptText:
      'Add [first name] [last name], age [age], [relationship] to [primary applicant], applying for coverage.',
  },
  {
    id: 'add-income',
    title: 'Add income',
    description:
      'Instruct the agent to record employment earnings for a household member.',
    promptText:
      'Add employment income from [employer] for [applicant name] with [amount] monthly earnings.',
  },
  {
    id: 'review-missing-items',
    title: 'Review missing items',
    description:
      'Instruct the agent to inspect the application and highlight blockers.',
    promptText:
      'Review my application, identify any missing items or blockers, and show me what needs attention.',
  },
] as const;

export interface FirstRunGuideProps {
  isOpen: boolean;
  onDismiss: () => void;
  className?: string;
}

export function FirstRunGuide({
  isOpen,
  onDismiss,
  className = '',
}: FirstRunGuideProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (id: string, text: string) => {
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId((curr) => (curr === id ? null : curr));
        }, 2000);
      }
    } catch {
      // Graceful fallback for rejected or unavailable clipboard permissions
    }
  };

  return (
    <section
      className={`first-run-guide ${className}`.trim()}
      role="region"
      aria-label="First-run guide"
      data-testid="first-run-guide"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onDismiss();
        }
      }}
    >
      <div className="first-run-header">
        <div className="first-run-title-group">
          <span className="first-run-badge">Guide</span>
          <h3>How A WebMPC Benefit Portal Works with AI Agents</h3>
          <p className="first-run-copy">
            A WebMPC Benefit Portal is a fictional synthetic demo. AI Site Tools
            (WebMCP) and human users operate the exact same visible page state
            in real time. Copy any sample prompt below into your AI agent:
          </p>
        </div>
        <button
          type="button"
          className="first-run-dismiss-btn"
          aria-label="Dismiss first-run guide"
          onClick={onDismiss}
        >
          ✕ Dismiss
        </button>
      </div>

      <div className="first-run-prompts-grid">
        {FIRST_RUN_PROMPTS.map((prompt) => {
          const isCopied = copiedId === prompt.id;
          return (
            <div key={prompt.id} className="first-run-prompt-card">
              <div className="prompt-card-header">
                <h4>{prompt.title}</h4>
                <span className="prompt-meta-badge">Synthetic</span>
              </div>
              <p className="prompt-description">{prompt.description}</p>
              <div className="prompt-preview-wrap">
                <code className="prompt-preview">{prompt.promptText}</code>
              </div>
              <button
                type="button"
                className={`copy-prompt-button${isCopied ? ' is-copied' : ''}`}
                aria-label={`Copy prompt: ${prompt.title}`}
                onClick={() => handleCopy(prompt.id, prompt.promptText)}
              >
                <span className="copy-icon" aria-hidden="true">
                  {isCopied ? '✓' : '📋'}
                </span>
                <span>{isCopied ? 'Copied to clipboard' : 'Copy prompt'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
