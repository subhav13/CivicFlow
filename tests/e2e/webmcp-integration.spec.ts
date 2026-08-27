import { expect, test, type Page } from '@playwright/test';
import {
  executeBrowserTool,
  getBrowserTools,
  installBrowserModelContext,
  setBrowserExecutionDelay,
} from './helpers/webmcp-fixture';

function sectionButton(page: Page, label: string) {
  return page.getByRole('button', {
    name: new RegExp(`^\\d{2} ${label}`, 'i'),
  });
}

test.describe.serial('WebMCP real-browser golden journey (Packet 3.1)', () => {
  let page: Page;
  const networkRequests: string[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.on('request', (request) => {
      if (
        request.resourceType() === 'fetch' ||
        request.resourceType() === 'xhr' ||
        request.resourceType() === 'ping'
      ) {
        networkRequests.push(request.url());
      }
    });

    await installBrowserModelContext(page);
    await page.goto('/');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. the browser-visible model-context surface can be installed before app load and discovers the six static tools', async () => {
    await expect(
      page.getByRole('heading', { name: 'CivicFlow synthetic demo' }),
    ).toBeVisible();

    const tools = await getBrowserTools(page);
    const toolNames = tools.map((t) => t.name).sort();

    expect(toolNames).toEqual([
      'add_household_member',
      'add_income_source',
      'get_application_progress',
      'list_uploaded_documents',
      'navigate_to_section',
      'set_current_coverage',
    ]);

    // Capability panel reflects active WebMCP integration
    await expect(page.getByText('WebMCP Active')).toBeVisible();
    await expect(
      page.getByText('6 Site Tools currently available.'),
    ).toBeVisible();
  });

  test('2. the human seed renders before any model tool executes', async () => {
    await expect(
      page.getByRole('heading', { name: 'About You' }),
    ).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue('Maya');
    await expect(page.getByLabel('Last name')).toHaveValue('Carter');
    await expect(page.getByText('20% complete')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Next: Household' }),
    ).toBeVisible();
  });

  test('3. add_household_member executes through the browser surface and Emma appears in the visible household card', async () => {
    const result = await executeBrowserTool(page, 'add_household_member', {
      firstName: 'Emma',
      lastName: 'Carter',
      ageYears: 7,
      relationship: 'daughter',
      applyingForCoverage: true,
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.stateRevision).toBe(1);

    await sectionButton(page, 'Household').click();
    await expect(
      page.getByRole('heading', { name: 'Household', exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('list', { name: 'Household members' })
        .getByText('Emma Carter'),
    ).toBeVisible();
    await expect(page.getByText('Daughter · age 7')).toBeVisible();

    // Attribution recorded in Agent Companion activity stream
    await expect(page.getByText('Agent action').first()).toBeVisible();
  });

  test('4. add_income_source executes through the browser surface and Acme Dental appears with progress changing from 20% to 60%', async () => {
    const result = await executeBrowserTool(page, 'add_income_source', {
      ownerName: 'Maya Carter',
      employerName: 'Acme Dental',
      amount: 4950,
      frequency: 'monthly',
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.stateRevision).toBe(2);

    await sectionButton(page, 'Income').click();
    await expect(
      page.getByRole('heading', { name: 'Income', exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('list', { name: 'Income sources' })
        .getByText('Acme Dental'),
    ).toBeVisible();
    await expect(page.getByText('$4,950.00 monthly')).toBeVisible();
    await expect(page.getByText('60% complete')).toBeVisible();
  });

  test('5. selecting the income card makes update_income_source appear and deselecting it removes it', async () => {
    await sectionButton(page, 'Income').click();

    // Deselect initially auto-selected card -> contextual tool removed
    const deselectButton = page.getByRole('button', {
      name: 'Deselect income Acme Dental',
    });
    if (await deselectButton.isVisible()) {
      await deselectButton.click();
    }

    let tools = await getBrowserTools(page);
    expect(tools.map((t) => t.name)).not.toContain('update_income_source');

    // Selecting the income card makes update_income_source appear
    const selectCardButton = page.getByRole('button', {
      name: 'Select income Acme Dental',
    });
    await expect(selectCardButton).toBeVisible();
    await selectCardButton.click();

    await expect(
      page.getByRole('button', { name: 'Deselect income Acme Dental' }),
    ).toBeVisible();

    tools = await getBrowserTools(page);
    expect(tools.map((t) => t.name)).toContain('update_income_source');
    await expect(
      page
        .getByRole('list', { name: 'Available capabilities' })
        .locator('strong')
        .filter({ hasText: 'update_income_source' }),
    ).toBeVisible();

    // Deselecting it removes it again
    await page
      .getByRole('button', { name: 'Deselect income Acme Dental' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Select income Acme Dental' }),
    ).toBeVisible();

    tools = await getBrowserTools(page);
    expect(tools.map((t) => t.name)).not.toContain('update_income_source');
  });

  test('6. set_current_coverage atomically records none for Maya and Emma and both visible cards update', async () => {
    const result = await executeBrowserTool(page, 'set_current_coverage', {
      memberNames: ['Maya Carter', 'Emma Carter'],
      status: 'none',
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);

    await sectionButton(page, 'Current Coverage').click();
    await expect(
      page.getByRole('heading', { name: 'Current Coverage', exact: true }),
    ).toBeVisible();

    await expect(
      page.getByLabel('Coverage status for Maya Carter'),
    ).toHaveValue('none');
    await expect(
      page.getByLabel('Coverage status for Emma Carter'),
    ).toHaveValue('none');
    await expect(
      page.getByText('2 people have a recorded coverage status.'),
    ).toBeVisible();
  });

  test('7. navigating to Review & Sign makes review_application contextual and renders the same visible missing-item list', async () => {
    await sectionButton(page, 'Review & Sign').click();
    await expect(
      page.getByRole('heading', { name: 'Review & Sign', exact: true }),
    ).toBeVisible();

    const tools = await getBrowserTools(page);
    expect(tools.map((t) => t.name)).toContain('review_application');

    const result = await executeBrowserTool<{
      issues: Array<{ code: string; message: string }>;
    }>(page, 'review_application');

    expect(result.ok).toBe(true);
    const issueCodes = (result.data?.issues ?? []).map((i) => i.code);
    expect(issueCodes).toContain('PROOF_OF_INCOME_MISSING');
    expect(issueCodes).toContain('ATTESTATION_REQUIRED');

    const visibleIssuesList = page.getByRole('list', {
      name: 'Blocking review issues',
    });
    await expect(visibleIssuesList).toContainText(
      'Attach demo proof of income',
    );
    await expect(visibleIssuesList).toContainText(
      'Accept the demo attestation',
    );
  });

  test('8. the browser tool result is observed after the DOM-visible mutation, including at least one delayed handler/result assertion', async () => {
    // Navigate via tool call to Documents section
    const navResult = await executeBrowserTool(page, 'navigate_to_section', {
      section: 'documents',
    });
    expect(navResult.ok).toBe(true);
    await expect(
      page.getByRole('heading', { name: 'Documents', exact: true }),
    ).toBeVisible();

    // Verify progress tool handler returns synchronized payload with DOM progress
    const progressResult = await executeBrowserTool<{
      percent: number;
      completedSections: string[];
    }>(page, 'get_application_progress');
    expect(progressResult.ok).toBe(true);
    expect(progressResult.data?.percent).toBe(75);
    await expect(page.getByText('75% complete')).toBeVisible();

    // Set a non-zero execution delay on the fixture (at least 100 ms)
    await setBrowserExecutionDelay(page, 150);

    // Start a tool execution that changes the section without awaiting it immediately
    const delayedNavPromise = executeBrowserTool(page, 'navigate_to_section', {
      section: 'about',
    });

    // Assert the new section heading is visible before awaiting the result
    await expect(
      page.getByRole('heading', { name: 'About You', exact: true }),
    ).toBeVisible();

    // Await and validate the result envelope
    const delayedResult = await delayedNavPromise;
    expect(delayedResult.ok).toBe(true);
    expect(delayedResult.tool).toBe('navigate_to_section');
    // Restore the execution delay to 0
    await setBrowserExecutionDelay(page, 0);
    // Return to documents section for final workflow completion
    await executeBrowserTool(page, 'navigate_to_section', {
      section: 'documents',
    });
    await expect(
      page.getByRole('heading', { name: 'Documents', exact: true }),
    ).toBeVisible();
  });

  test('9. the browser surface has no tool whose name contains submit, and a submit request leaves revision/state unchanged', async () => {
    const tools = await getBrowserTools(page);
    for (const tool of tools) {
      expect(tool.name.toLowerCase()).not.toContain('submit');
      expect(tool.title.toLowerCase()).not.toContain('submit');
      expect(tool.description.toLowerCase()).not.toContain('submit');
    }

    const initialProgress = await executeBrowserTool<{ percent: number }>(
      page,
      'get_application_progress',
    );
    const initialRevision = initialProgress.stateRevision;

    // Attempting to invoke any submit-like tool name throws and rejects
    await expect(
      page.evaluate(async () => {
        return document.modelContext!.executeTool(
          {
            name: 'submit_demo',
            title: 'Submit Demo',
            description: 'Submit',
            inputSchema: {},
          },
          {},
        );
      }),
    ).rejects.toThrow(/Tool not registered/);

    const postProgress = await executeBrowserTool<{ percent: number }>(
      page,
      'get_application_progress',
    );
    expect(postProgress.stateRevision).toBe(initialRevision);
  });

  test('10. the normal visible attestation and human Submit Demo path still works locally with no fetch/XHR/beacon request, followed by reset', async () => {
    // Attach proof of income in Documents section
    await sectionButton(page, 'Documents').click();
    await page
      .getByRole('button', { name: 'Attach demo proof of income' })
      .click();
    await expect(
      page
        .getByLabel('Attached demo documents')
        .getByText('Acme Dental synthetic proof of income'),
    ).toBeVisible();

    // Navigate to Review & Sign
    await sectionButton(page, 'Review & Sign').click();
    await expect(page.getByText('Accept the demo attestation')).toBeVisible();

    // Accept attestation
    await page
      .getByLabel('I understand this is a fictional synthetic research demo.')
      .check();
    await expect(
      page.getByRole('list', { name: 'Blocking review issues' }),
    ).toHaveCount(0);

    // Human clicks Submit Demo
    const submitButton = page.getByRole('button', { name: 'Submit Demo' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(
      page.getByText(/Synthetic demo submitted locally/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Demo submitted locally' }),
    ).toBeDisabled();

    // Confirm no network requests occurred
    expect(networkRequests).toEqual([]);

    // Human clicks Reset demo
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Reset this synthetic demo?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Confirm reset' }).click();

    // Reset restores the initial Maya Carter seed
    await expect(page.getByText('20% complete')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'About You' }),
    ).toBeVisible();
    await expect(page.getByLabel('First name')).toHaveValue('Maya');
  });
});
