import { expect, test, type Page } from '@playwright/test';

import {
  executeBrowserTool,
  installBrowserModelContext,
  setBrowserExecutionDelay,
} from './helpers/webmcp-fixture';

function sectionButton(page: Page, label: string) {
  return page.getByRole('button', {
    name: new RegExp(`^\\d{2} ${label}`, 'i'),
  });
}
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

  test('delayed Site Tool mutation shows operation feedback in the same tab and retains sanitized activity after reload', async ({
    page,
  }) => {
    await installBrowserModelContext(page);
    await page.goto('/');
    await setBrowserExecutionDelay(page, 250);
    const applyingStatePromise = page.evaluate(() => {
      return new Promise<{
        phase: string | null;
        text: string | null;
        source: string | null;
      }>((resolve) => {
        const check = () => {
          const el = document.querySelector('[data-testid="operation-status"]');
          if (el && el.getAttribute('data-phase') === 'applying') {
            resolve({
              phase: el.getAttribute('data-phase'),
              text: el.textContent,
              source: el.getAttribute('data-source'),
            });
            return true;
          }
          return false;
        };
        if (check()) return;
        const observer = new MutationObserver(() => {
          if (check()) {
            observer.disconnect();
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-phase', 'data-source'],
        });
      });
    });

    const execution = executeBrowserTool(page, 'add_household_member', {
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });
    const observedApplying = await applyingStatePromise;
    expect(observedApplying.phase).toBe('applying');
    expect(observedApplying.source).toBe('webmcp');
    expect(observedApplying.text).toContain('Applying Add household member');
    const operationStatus = page.locator('[data-testid="operation-status"]');
    const result = await execution;
    expect(result.ok).toBe(true);
    await expect(operationStatus).toBeVisible();
    await expect(operationStatus).toHaveAttribute('data-phase', 'succeeded');
    const actionId = await operationStatus.getAttribute('data-action-id');
    expect(actionId).toBeTruthy();
    await expect(
      page.locator(`[data-activity-id="${actionId}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`article[data-recent-action-id="${actionId}"]`),
    ).toBeVisible();

    const retained = await page.evaluate(() =>
      window.sessionStorage.getItem('civicflow.activity.v1'),
    );
    expect(retained).toContain('Emma Carter');
    expect(retained).not.toContain('ageYears');
    expect(retained).not.toContain('applyingForCoverage');

    await page.reload();
    await expect(
      page.locator(`[data-activity-id="${actionId}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`[data-activity-id="${actionId}"]`),
    ).toContainText('Added household member Emma Carter');

    await sectionButton(page, 'Income').click();
    await page.getByRole('button', { name: 'Confirm no income' }).click();

    await sectionButton(page, 'Current Coverage').click();
    await page
      .getByLabel('Coverage status for Maya Carter')
      .selectOption('none');
    await page
      .getByLabel('Coverage status for Emma Carter')
      .selectOption('none');
    await page.getByRole('button', { name: 'Save coverage status' }).click();

    await sectionButton(page, 'Review & Sign').click();
    await page
      .getByLabel('I understand this is a fictional synthetic research demo.')
      .check();
    await page.getByRole('button', { name: 'Submit Demo' }).click();
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await page.getByRole('button', { name: 'Confirm reset' }).click();
    await expect(
      page.locator(`[data-activity-id="${actionId}"]`),
    ).not.toBeVisible();
    expect(
      await page.evaluate(() =>
        window.sessionStorage.getItem('civicflow.activity.v1'),
      ),
    ).toBeNull();
  });
});
