import { expect, test } from '@playwright/test';

test.describe('Compact assistant onboarding', () => {
  test('coachmark is lightweight, opens the assistant, and is session dismissible', async ({
    page,
  }) => {
    await page.goto('/');

    const coachmark = page.getByTestId('assistant-coachmark');
    await expect(coachmark).toBeVisible();
    await expect(coachmark).toHaveAttribute('aria-label', 'Assistant tip');
    await expect(coachmark).toContainText(/need a hand/i);
    await expect(page.locator('[data-testid="first-run-guide"]')).toHaveCount(
      0,
    );

    // Form beneath remains fully usable (non-modal)
    const aboutInput = page.getByLabel('First name');
    await expect(aboutInput).toBeVisible();
    await expect(aboutInput).toBeEnabled();

    await coachmark.getByRole('button', { name: 'Try the assistant' }).click();

    await expect(
      page.getByRole('dialog', { name: /agent companion/i }),
    ).toBeVisible();
    await expect(page.getByTestId('assistant-coachmark')).toHaveCount(0);

    // Navigating between sections keeps guide dismissed for session
    await page.getByRole('button', { name: 'Close Agent Companion' }).click();
    const nextBtn = page.getByRole('button', { name: /Next: Household/i });
    await nextBtn.click();
    await expect(
      page.getByRole('heading', { name: 'Household', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('assistant-coachmark')).toHaveCount(0);
  });
});
