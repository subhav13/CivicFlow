import { expect, test } from '@playwright/test';

test.describe('Phase 4 unified assistant companion', () => {
  test('shows the themed text-only fallback when no secure session is enabled', async ({
    page,
  }) => {
    await page.goto('/');

    const panel = page.getByRole('region', { name: /assistant panel/i });
    await expect(panel).toBeVisible();
    await expect(
      panel.getByText(
        /text-only mode|secure assistant session is unavailable/i,
      ),
    ).toBeVisible();
    await expect(
      panel.getByRole('textbox', { name: /message the assistant/i }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: /start listening/i }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: /read current section/i }),
    ).toBeEnabled();
    await expect(panel).toHaveClass(/assistant-panel/);
  });

  test('keeps the mobile drawer usable at the existing narrow theme breakpoint', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Open Agent Companion' }).click();
    const dialog = page.getByRole('dialog', { name: 'Agent Companion' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('region', { name: /assistant panel/i }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(
      dialog.getByRole('button', { name: /read current section/i }),
    ).toBeEnabled();
  });
});
