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

    // Wait for initial logs to appear
    const logPanel = page.locator('#log-panel');
    await expect(logPanel).not.toBeEmpty({ timeout: 3000 });

    const flashEl = page.locator('#btn-flash');
    const selectBtn = page.locator('.rkey[data-key="Select"]');

    await selectBtn.click();

    // Flash should become visible briefly - check within short window
    await expect(flashEl).toBeVisible({ timeout: 500 });
  });

  test('WebSocket connection is established', async ({ page }) => {
    await page.goto('/');

    // Wait for logs to appear (indicates WS connection)
    const logPanel = page.locator('#log-panel');
    await expect(logPanel).not.toBeEmpty({ timeout: 3000 });
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

    // Wait for initial state to load
    const paramsEl = page.locator('#hud-params');
    await expect(paramsEl).not.toHaveText('—', { timeout: 3000 });

    const initialText = await paramsEl.textContent();

    // Click Up arrow to change speed (this shows in params)
    const upBtn = page.locator('.rkey[data-key="Up"]');
    await upBtn.click();

    // Give it time to update
    await page.waitForTimeout(500);

    // Params should update (speed change affects display)
    const newText = await paramsEl.textContent();
    expect(newText).not.toBe(initialText);
  });
});
