import { expect, test, type Page } from '@playwright/test';

function sectionButton(page: Page, label: string) {
  return page.getByRole('button', {
    name: new RegExp(`^\\d{2} ${label}`, 'i'),
  });
}

test('a human can complete the synthetic golden path and reset it locally', async ({
  page,
}) => {
  const networkRequests: string[] = [];
  page.on('request', (request) => {
    if (
      request.resourceType() === 'fetch' ||
      request.resourceType() === 'xhr'
    ) {
      networkRequests.push(request.url());
    }
  });

  await page.goto('/');
  await sectionButton(page, 'Household').click();
  await page.getByLabel('Household member first name').fill('Emma');
  await page.getByLabel('Household member last name').fill('Carter');
  await page.getByLabel('Household member age').fill('7');
  await page.getByRole('button', { name: 'Add household member' }).click();

  await sectionButton(page, 'Income').click();
  await page.getByLabel('Employer or source').fill('Acme Dental');
  await page.getByLabel('Income amount in dollars').fill('4,950.00');
  await page.getByRole('button', { name: 'Add income source' }).click();
  await expect(page.getByText('60% complete')).toBeVisible();

  await sectionButton(page, 'Current Coverage').click();
  await page.getByLabel('Coverage status for Maya Carter').selectOption('none');
  await page.getByLabel('Coverage status for Emma Carter').selectOption('none');
  await page.getByRole('button', { name: 'Save coverage status' }).click();

  await sectionButton(page, 'Documents').click();
  await page
    .getByRole('button', { name: 'Attach demo proof of income' })
    .click();

  await sectionButton(page, 'Review & Sign').click();
  await expect(
    page.getByRole('list', { name: 'Blocking review issues' }),
  ).toContainText('Accept the demo attestation');
  await page
    .getByLabel('I understand this is a fictional synthetic research demo.')
    .check();
  await expect(
    page.getByRole('list', { name: 'Blocking review issues' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit Demo' }).click();
  await expect(
    page.getByText(/Synthetic demo submitted locally/),
  ).toBeVisible();
  expect(networkRequests).toEqual([]);

  await sectionButton(page, 'Income').click();
  await expect(page.getByLabel('Employer or source')).toBeDisabled();

  await sectionButton(page, 'Review & Sign').click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Reset this synthetic demo?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirm reset' }).click();
  await expect(page.getByText('20% complete')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About You' })).toBeVisible();
});
