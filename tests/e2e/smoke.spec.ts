import { expect, test } from '@playwright/test';

test('renders the CivicFlow: A WebMPC Public Benefit Portal synthetic demo shell', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'CivicFlow: A WebMPC Public Benefit Portal synthetic demo',
    }),
  ).toBeVisible();
});
