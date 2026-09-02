import { expect, test } from '@playwright/test';

test('renders the A WebMPC Benefit Portal synthetic demo shell', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'A WebMPC Benefit Portal synthetic demo',
    }),
  ).toBeVisible();
});
