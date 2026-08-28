import { expect, test, type Page } from '@playwright/test';

function sectionButton(page: Page, label: string) {
  return page.getByRole('button', {
    name: new RegExp(`^\\d{2} ${label}`, 'i'),
  });
}

test.describe('Document Readiness E2E', () => {
  test('displays document readiness checklist and updates status truthfully on preset attach', async ({
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

    // 1. Initially on zero income, navigate to Documents
    await sectionButton(page, 'Documents').click();

    // Verify no file input exists anywhere in the DOM
    expect(await page.locator('input[type="file"]').count()).toBe(0);

    // Verify checklist is visible
    const checklist = page.getByRole('list', {
      name: /document requirements checklist/i,
    });
    await expect(checklist).toBeVisible();

    // With zero income, proof of income is optional / not missing
    await expect(
      checklist.getByText('Proof of income', { exact: true }),
    ).toBeVisible();

    // 2. Add income in Income section
    await sectionButton(page, 'Income').click();
    await page.getByLabel('Employer or source').fill('Acme Dental');
    await page.getByLabel('Income amount in dollars').fill('3,500.00');
    await page.getByRole('button', { name: 'Add income source' }).click();

    // 3. Return to Documents: Proof of income must now be required and missing
    await sectionButton(page, 'Documents').click();
    await expect(checklist).toBeVisible();
    await expect(checklist.getByText('Missing')).toBeVisible();

    // 4. Attach proof of income preset via inline checklist action
    await checklist
      .getByRole('button', { name: /Attach proof of income/i })
      .click();
    // 5. Proof of income must now be Attached
    await expect(
      checklist.getByText('Attached', { exact: true }),
    ).toBeVisible();
    // Verify network invariant: no fetch/xhr requests occurred
    expect(networkRequests).toEqual([]);
  });
});
