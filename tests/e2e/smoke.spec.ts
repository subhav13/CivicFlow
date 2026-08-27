import { expect, test } from '@playwright/test';

test('renders the CivicFlow synthetic demo shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'CivicFlow synthetic demo' }),
  ).toBeVisible();
});
