import { expect, test } from '@playwright/test';

test.describe('Reduced Motion Usability', () => {
  test.use({ reducedMotion: 'reduce' });

  test('maintains immediate state and full interactivity under prefers-reduced-motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const appFrame = page.locator('.app-frame');
    await expect(appFrame).toBeVisible();
    await expect(appFrame).toHaveClass(/is-entered/);

    // Progress meter shows immediate state without movement
    await expect(page.getByText('20% complete')).toBeVisible();

    // Verify all 6 sections are fully discoverable and navigable
    const sectionNav = page.getByRole('navigation', {
      name: 'Application sections',
    });
    const buttons = sectionNav.getByRole('button');
    expect(
      await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true);
    // Track scrollIntoView behavior under reduced-motion
    await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>;
      win.__lastScrollBehavior = undefined;
      const origScrollIntoView = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (
        ...args: [options?: boolean | ScrollIntoViewOptions]
      ) {
        const [options] = args;
        if (typeof options === 'object' && options?.behavior) {
          win.__lastScrollBehavior = options.behavior;
        }
        return origScrollIntoView.apply(this, args);
      };
    });

    // Navigate to Household
    await buttons.nth(1).click();
    await expect(
      page.getByRole('heading', { name: 'Household', exact: true }),
    ).toBeVisible();

    // Verify SectionStepper scrolled active element with behavior 'auto' (non-smooth)
    const scrollBehavior = await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>;
      return win.__lastScrollBehavior;
    });
    expect(scrollBehavior).toBe('auto');
    // Navigate to Review
    await buttons.nth(5).click();
    await expect(
      page.getByRole('heading', { name: 'Review & Sign', exact: true }),
    ).toBeVisible();
  });

  test('preserves 375px mobile responsiveness under prefers-reduced-motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        name: 'CivicFlow: A WebMPC Public Benefit Portal synthetic demo',
      }),
    ).toBeVisible();

    const tracker = page.getByTestId('application-progress-tracker');
    await expect(tracker).toBeVisible();

    // Check no horizontal overflow
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
