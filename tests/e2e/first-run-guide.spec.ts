import { expect, test } from '@playwright/test';

test.describe('First-Run Guide and Prompt Copying (Packet 5.3)', () => {
  test('guide is visible on first load, non-modal, displays 3 prompts, copies on click, and is session dismissible', async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');

    // First-run guide is present and non-modal
    const guide = page.locator('[data-testid="first-run-guide"]');
    await expect(guide).toBeVisible();
    await expect(guide).toHaveAttribute('role', 'region');

    // Synthetic disclosure
    await expect(guide.getByText(/fictional synthetic demo/i)).toBeVisible();

    // 3 prompt cards are present
    const copyButtons = guide.getByRole('button', { name: /copy prompt/i });
    await expect(copyButtons).toHaveCount(3);
    // Verify prompt previews use generic synthetic placeholders with no concrete names or dollar amounts
    const promptPreviews = guide.locator('.prompt-preview');
    await expect(promptPreviews).toHaveCount(3);
    const promptTexts = await promptPreviews.allInnerTexts();
    for (const text of promptTexts) {
      expect(text).not.toMatch(/Maya|Carter|Jordan|Emma/i);
      expect(text).not.toMatch(/Acme/i);
      expect(text).not.toMatch(/\$\d+/);
    }

    // Form beneath remains fully usable (non-modal)
    const aboutInput = page.getByLabel('First name');
    await expect(aboutInput).toBeVisible();
    await expect(aboutInput).toBeEnabled();

    // Click copy on first prompt
    await copyButtons.first().click();

    // Feedback is shown
    await expect(guide.getByText(/copied/i)).toBeVisible();

    // Dismiss the guide
    const dismissBtn = guide.getByRole('button', {
      name: /dismiss first-run guide|got it|close guide/i,
    });
    await dismissBtn.click();

    // Guide is no longer visible
    await expect(guide).not.toBeVisible();

    // Navigating between sections keeps guide dismissed for session
    const nextBtn = page.getByRole('button', { name: /Next: Household/i });
    await nextBtn.click();
    await expect(
      page.getByRole('heading', { name: 'Household', exact: true }),
    ).toBeVisible();
    await expect(guide).not.toBeVisible();
  });
});
