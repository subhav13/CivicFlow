import { fireEvent, render, screen, within } from '@testing-library/react';
import { SectionStepper } from './SectionStepper';
import type { ApplicationProgress } from '../../domain';

const mockProgress: ApplicationProgress = {
  stateRevision: 0,
  percent: 20,
  completedSections: ['about'],
  nextSection: 'household',
  sections: [
    { id: 'about', complete: true, weight: 1 },
    { id: 'household', complete: false, weight: 1 },
    { id: 'income', complete: false, weight: 1 },
    { id: 'coverage', complete: false, weight: 1 },
    { id: 'documents', complete: false, weight: 1 },
    { id: 'review', complete: false, weight: 1 },
  ],
};

describe('SectionStepper', () => {
  it('renders Step N of 6 summary, active section label, and percent', () => {
    const handleNavigate = vi.fn();
    render(
      <SectionStepper
        activeSection="about"
        progress={mockProgress}
        onNavigate={handleNavigate}
      />,
    );

    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
    expect(
      screen.getByText('About You', { selector: '.stepper-active-label' }),
    ).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('toggles all-sections list exposing all six sections in order with completion state', () => {
    const handleNavigate = vi.fn();
    render(
      <SectionStepper
        activeSection="household"
        progress={mockProgress}
        onNavigate={handleNavigate}
      />,
    );

    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', {
      name: /all sections|all 6 sections/i,
    });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    const list = screen.getByRole('list', { name: /all sections/i });
    const items = within(list).getAllByRole('button');
    expect(items).toHaveLength(6);

    const labels = items.map((item) =>
      item.querySelector('.section-nav-copy > span')?.textContent?.trim(),
    );
    expect(labels).toEqual([
      'About You',
      'Household',
      'Income',
      'Current Coverage',
      'Documents',
      'Review & Sign',
    ]);

    expect(items[0]).toHaveTextContent(/complete/i);
    expect(items[1]).toHaveTextContent(/needs attention/i);

    fireEvent.click(items[2]); // click Income
    expect(handleNavigate).toHaveBeenCalledWith('income');
  });

  it('marks active section with aria-current="step"', () => {
    const handleNavigate = vi.fn();
    render(
      <SectionStepper
        activeSection="income"
        progress={mockProgress}
        onNavigate={handleNavigate}
      />,
    );

    expect(screen.getByText(/step 3 of 6/i)).toBeInTheDocument();
    const activeButtons = screen.getAllByRole('button', { current: 'step' });
    expect(activeButtons.length).toBeGreaterThanOrEqual(1);
    expect(activeButtons[0]).toHaveTextContent('Income');
  });

  it('closes all-sections list on Escape key', () => {
    const handleNavigate = vi.fn();
    render(
      <SectionStepper
        activeSection="about"
        progress={mockProgress}
        onNavigate={handleNavigate}
      />,
    );

    const toggleButton = screen.getByRole('button', {
      name: /all sections|all 6 sections/i,
    });
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('scrolls active section item into view with behavior "auto" when prefers-reduced-motion is active', () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const handleNavigate = vi.fn();
    render(
      <SectionStepper
        activeSection="household"
        progress={mockProgress}
        onNavigate={handleNavigate}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    });
  });

  it('scrolls active section item into view with behavior "smooth" when prefers-reduced-motion is not active', () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const handleNavigate = vi.fn();
    render(
      <SectionStepper
        activeSection="income"
        progress={mockProgress}
        onNavigate={handleNavigate}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  });
});
