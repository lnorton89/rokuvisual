const { test, expect } = require('@playwright/test');

test.describe('Roku Visual App', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Roku Visual/);
  });

  test('canvas element is present', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas#c');
    await expect(canvas).toBeVisible();
  });

  test('HUD elements are visible', async ({ page }) => {
    await page.goto('/');

    // Check status indicator
    const status = page.locator('#status');
    await expect(status).toBeVisible();

    // Check mode badge
    const modeBadge = page.locator('#mode-badge');
    await expect(modeBadge).toBeVisible();

    // Check log panel
    const logPanel = page.locator('#log-panel');
    await expect(logPanel).toBeVisible();
  });

  test('on-screen remote buttons are clickable', async ({ page }) => {
    await page.goto('/');

    // Test Up button
    const upBtn = page.locator('.rkey[data-key="Up"]');
    await expect(upBtn).toBeVisible();
    await upBtn.click();

    // Test Select button
    const selectBtn = page.locator('.rkey[data-key="Select"]');
    await expect(selectBtn).toBeVisible();
    await selectBtn.click();
  });

  test('button press shows flash overlay', async ({ page }) => {
    await page.goto('/');

    const flashEl = page.locator('#btn-flash');
    const selectBtn = page.locator('.rkey[data-key="Select"]');

    await selectBtn.click();

    // Flash should become visible briefly
    await expect(flashEl).toBeVisible();
  });

  test('WebSocket connection is established', async ({ page }) => {
    await page.goto('/');

    // Wait for logs to appear (indicates WS connection)
    const logPanel = page.locator('#log-panel');
    await expect(logPanel).toContainText(/connected|ws/i, { timeout: 5000 });
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.goto('/');

    // Press arrow up
    await page.keyboard.press('ArrowUp');

    // Press Enter (Select)
    await page.keyboard.press('Enter');

    // Press Space (Play/Pause)
    await page.keyboard.press(' ');
  });

  test('params update on button press', async ({ page }) => {
    await page.goto('/');

    const paramsEl = page.locator('#hud-params');
    const initialText = await paramsEl.textContent();

    // Click right arrow to change hue
    const rightBtn = page.locator('.rkey[data-key="Right"]');
    await rightBtn.click();

    // Params should update
    await expect(paramsEl).not.toHaveText(initialText, { timeout: 2000 });
  });
});
