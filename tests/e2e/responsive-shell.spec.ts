import { expect, test } from '@playwright/test';

test('the six-section shell remains usable at a narrow mobile width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'A WebMPC Benefit Portal synthetic demo',
    }),
  ).toBeVisible();
  await expect(page.getByText('20% complete')).toBeVisible();

  const labels = await page
    .getByRole('navigation', { name: 'Application sections' })
    .locator('.section-nav-copy > span')
    .allTextContents();
  expect(labels.map((label) => label.replace(/\s+/gu, ' ').trim())).toEqual([
    'About You',
    'Household',
    'Income',
    'Current Coverage',
    'Documents',
    'Review & Sign',
  ]);

  await expect(
    page.getByRole('button', { name: 'Open Agent Companion' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  for (const label of [
    'Household',
    'Income',
    'Current Coverage',
    'Documents',
    'Review & Sign',
  ]) {
    const next = page.getByRole('button', { name: `Next: ${label}` });
    await expect(next).toBeVisible();
    await next.click();
    await expect(
      page.getByRole('heading', { name: label, exact: true }),
    ).toBeVisible();
  }

  await expect(
    page.getByRole('button', { name: 'Next section unavailable' }),
  ).toBeDisabled();
});
