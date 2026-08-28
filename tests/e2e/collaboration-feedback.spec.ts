import { expect, test } from '@playwright/test';

test.describe('Collaboration Feedback and Startup Motion', () => {
  test('shell applies one-time entry motion class on load', async ({
    page,
  }) => {
    await page.goto('/');

    const appFrame = page.locator('.app-frame');
    await expect(appFrame).toBeVisible();
    await expect(appFrame).toHaveClass(/is-entered/);
  });

  test('human mutation renders operation feedback, card highlight, and companion timeline', async ({
    page,
  }) => {
    await page.goto('/');

    // Navigate to household
    await page
      .getByRole('navigation', { name: 'Application sections' })
      .getByRole('button', { name: /02 household/i })
      .click();

    await page.getByLabel('Household member first name').fill('Emma');
    await page.getByLabel('Household member last name').fill('Carter');
    await page.getByLabel('Household member age').fill('7');
    await page.getByRole('button', { name: 'Add household member' }).click();

    // Verify operation status
    const operationStatus = page.locator('[data-testid="operation-status"]');
    await expect(operationStatus).toBeVisible();
    await expect(operationStatus).toHaveAttribute('data-source', 'human');
    await expect(operationStatus).toHaveAttribute('data-phase', 'succeeded');
    await expect(operationStatus).toContainText('Added household member');

    // Verify card highlight
    const emmaCard = page.locator('article[data-entity-id]').filter({
      hasText: 'Emma Carter',
    });
    await expect(emmaCard).toBeVisible();
    await expect(emmaCard).toHaveAttribute('data-recent-effect', 'created');
    await expect(emmaCard).toHaveClass(/is-recent-effect/);

    // Verify progress tracker updated
    const tracker = page.getByTestId('application-progress-tracker');
    await expect(tracker).toContainText('40% complete');
    await expect(tracker).toContainText('2 of 6');
  });
});
