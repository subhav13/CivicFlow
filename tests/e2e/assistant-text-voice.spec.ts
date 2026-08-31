import { expect, test, type Page } from '@playwright/test';

async function expectViewportAnchoredAfterScroll(page: Page) {
  const host = page.locator('.assistant-companion-host');
  await expect(host).toBeVisible();
  const before = await host.boundingBox();
  expect(before).not.toBeNull();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const after = await host.boundingBox();
  const viewport = page.viewportSize();
  expect(after).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(after!.x).toBeCloseTo(before!.x, 0);
  expect(after!.y).toBeCloseTo(before!.y, 0);
  expect(after!.x + after!.width).toBeLessThanOrEqual(viewport!.width);
  expect(after!.y + after!.height).toBeLessThanOrEqual(viewport!.height);
}

async function expectFullyInsideViewport(
  page: Page,
  locator: ReturnType<Page['locator']>,
) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function expectExpandedSurfacesStayViewportAnchored(page: Page) {
  await expectViewportAnchoredAfterScroll(page);

  await page.getByTestId('assistant-launcher').click();
  const companion = page.getByRole('dialog', { name: 'Agent Companion' });
  await expect(companion).toBeVisible();
  await expectFullyInsideViewport(page, companion);
  await page.getByRole('button', { name: 'Close Agent Companion' }).click();
  await expect(companion).not.toBeVisible();

  await page.getByRole('button', { name: 'View agent activity' }).click();
  const activity = page.getByRole('region', { name: 'Agent activity' });
  await expect(activity).toBeVisible();
  await expectFullyInsideViewport(page, activity);
  const before = await activity.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 0));
  const after = await activity.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.x).toBeCloseTo(before!.x, 0);
  expect(after!.y).toBeCloseTo(before!.y, 0);
  await expectFullyInsideViewport(page, activity);
}

test.describe('Phase 4 unified assistant companion', () => {
  test('shows the themed text-only fallback when no secure session is enabled', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByTestId('assistant-launcher').click();
    const dialog = page.getByRole('dialog', { name: /agent companion/i });
    const panel = dialog.getByRole('region', { name: /assistant panel/i });
    await expect(panel).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    const launcherBox = await page
      .getByTestId('assistant-launcher')
      .boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(launcherBox).not.toBeNull();
    expect(dialogBox!.height).toBeGreaterThan(300);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(
      launcherBox!.y,
    );
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

  test('keeps the companion anchored to the viewport through desktop and mobile document scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expectExpandedSurfacesStayViewportAnchored(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expectExpandedSurfacesStayViewportAnchored(page);
  });
});
