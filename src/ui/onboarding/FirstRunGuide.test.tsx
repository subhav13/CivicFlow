import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FIRST_RUN_PROMPTS, FirstRunGuide } from './FirstRunGuide';

describe('FirstRunGuide component (Packet 5.3)', () => {
  it('renders non-modal guide with synthetic disclosure and exactly three copyable prompts', () => {
    const handleDismiss = vi.fn();
    render(<FirstRunGuide isOpen={true} onDismiss={handleDismiss} />);

    // Fictional synthetic disclosure
    expect(screen.getByText(/fictional synthetic demo/i)).toBeInTheDocument();
    expect(
      screen.getByText(/operate the exact same visible page state/i),
    ).toBeInTheDocument();

    // Exactly three prompts
    expect(FIRST_RUN_PROMPTS).toHaveLength(3);
    expect(screen.getByText('Add a household member')).toBeInTheDocument();
    expect(screen.getByText('Add income')).toBeInTheDocument();
    expect(screen.getByText('Review missing items')).toBeInTheDocument();

    // Prompts do not contain concrete names, employers, dollar amounts, or PII
    for (const prompt of FIRST_RUN_PROMPTS) {
      expect(prompt.promptText).not.toContain('SSN');
      expect(prompt.promptText).not.toContain('password');
      expect(prompt.promptText).not.toContain('token');
      expect(prompt.promptText).not.toMatch(/Maya|Carter|Jordan|Emma/);
      expect(prompt.promptText).not.toMatch(/Acme/);
      expect(prompt.promptText).not.toMatch(/\$\d+/);
      expect(prompt.description).not.toMatch(/Maya|Carter|Jordan|Emma/);
    }

    // Prompts use bracketed placeholders for variable demo data
    expect(FIRST_RUN_PROMPTS[0].promptText).toMatch(/\[.+\]/);
    expect(FIRST_RUN_PROMPTS[1].promptText).toMatch(/\[.+\]/);
  });

  it('copies static prompt text to clipboard on explicit click and provides feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const handleDismiss = vi.fn();
    render(<FirstRunGuide isOpen={true} onDismiss={handleDismiss} />);

    const copyButtons = screen.getAllByRole('button', { name: /copy prompt/i });
    expect(copyButtons).toHaveLength(3);

    fireEvent.click(copyButtons[0]);
    expect(writeTextMock).toHaveBeenCalledWith(FIRST_RUN_PROMPTS[0].promptText);

    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });
  });

  it('handles rejected clipboard gracefully without throwing or breaking', async () => {
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new Error('Permission denied'));
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const handleDismiss = vi.fn();
    render(<FirstRunGuide isOpen={true} onDismiss={handleDismiss} />);

    const copyButtons = screen.getAllByRole('button', { name: /copy prompt/i });
    expect(() => fireEvent.click(copyButtons[1])).not.toThrow();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn();
    render(<FirstRunGuide isOpen={true} onDismiss={handleDismiss} />);

    const dismissBtn = screen.getByRole('button', {
      name: /dismiss first-run guide|got it|close guide/i,
    });
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when isOpen is false', () => {
    const handleDismiss = vi.fn();
    const { container } = render(
      <FirstRunGuide isOpen={false} onDismiss={handleDismiss} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
