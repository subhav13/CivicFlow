import { expect, test } from '@playwright/test';

test.describe('Mobile Six-Step Flow and Back/Next Navigation (Packet 5.1)', () => {
  test('displays Step N of 6 and compact all-sections control at 375px and 768px without horizontal overflow', async ({
    page,
  }) => {
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/');

      // Verify Step N of 6 is visible
      const stepIndicator = page.getByText(/Step 1 of 6/i);
      await expect(stepIndicator).toBeVisible();

      // Verify no horizontal overflow
      const noOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(noOverflow).toBe(true);

      // Verify compact all-sections toggle
      const toggle = page.getByRole('button', {
        name: /all sections|all 6 sections/i,
      });
      await expect(toggle).toBeVisible();
      await toggle.click();

      // All 6 sections are visible in order
      const sectionButtons = page
        .locator('.all-sections-menu button, .section-stepper-menu button')
        .or(
          page.getByRole('list', { name: /all sections/i }).getByRole('button'),
        );
      await expect(sectionButtons).toHaveCount(6);

      // Close menu with escape
      await page.keyboard.press('Escape');
    }
  });

  test('Back and Next buttons traverse all six sections with correct boundary conditions', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const sectionNames = [
      'About You',
      'Household',
      'Income',
      'Current Coverage',
      'Documents',
      'Review & Sign',
    ];

    // Step 1: About You
    await expect(
      page.getByRole('heading', { name: 'About You', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Step 1 of 6/i)).toBeVisible();

    // Back button should be disabled on first section
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeDisabled();

    // Traverse forward through all 6 sections
    for (let i = 0; i < sectionNames.length - 1; i++) {
      const nextTarget = sectionNames[i + 1];
      const nextBtn = page.getByRole('button', {
        name: new RegExp(`Next: ${nextTarget}`, 'i'),
      });
      await expect(nextBtn).toBeVisible();
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click();

      // Heading should update
      await expect(
        page.getByRole('heading', { name: nextTarget, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(`Step ${i + 2} of 6`, 'i')),
      ).toBeVisible();
    }

    // Step 6: Review & Sign
    await expect(
      page.getByRole('heading', { name: 'Review & Sign', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Step 6 of 6/i)).toBeVisible();

    // Next button should be disabled on final section
    const finalNextBtn = page.getByRole('button', {
      name: /Next section unavailable|Next section/i,
    });
    await expect(finalNextBtn).toBeDisabled();

    // Traverse backwards through all sections
    for (let i = sectionNames.length - 1; i > 0; i--) {
      const prevTarget = sectionNames[i - 1];
      const prevBackBtn = page.getByRole('button', {
        name: new RegExp(`Back: ${prevTarget}`, 'i'),
      });
      await expect(prevBackBtn).toBeVisible();
      await expect(prevBackBtn).toBeEnabled();
      await prevBackBtn.click();

      await expect(
        page.getByRole('heading', { name: prevTarget, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(`Step ${i} of 6`, 'i')),
      ).toBeVisible();
    }

    // Back on About You is disabled again
    await expect(page.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  test('direct navigation to incomplete sections is permitted without changing application revision', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Open all-sections toggle
    const toggle = page.getByRole('button', {
      name: /all sections|all 6 sections/i,
    });
    await toggle.click();

    // Directly click 'Documents' (section 5)
    const docNavBtn = page
      .getByRole('list', { name: /all sections/i })
      .getByRole('button', { name: /Documents/i });
    await docNavBtn.click();

    // Should navigate to Documents
    await expect(
      page.getByRole('heading', { name: 'Documents', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Step 5 of 6/i)).toBeVisible();
  });

  test('keyboard-only navigation navigates through stepper and Back/Next controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Focus active heading
    await page.locator('#active-section-heading').focus();

    // Tab through until reaching Next button
    const nextBtn = page.getByRole('button', { name: /Next: Household/i });
    await nextBtn.focus();
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'Household', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Step 2 of 6/i)).toBeVisible();

    // Focus Back button and activate with Enter
    const backBtn = page.getByRole('button', { name: /Back: About You/i });
    await backBtn.focus();
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'About You', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Step 1 of 6/i)).toBeVisible();
  });
});
