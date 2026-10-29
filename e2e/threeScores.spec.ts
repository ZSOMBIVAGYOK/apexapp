import { test, expect } from "@playwright/test";

test.describe("Three Score Rings (Regeneráció, Terhelés, Alvás) & Today Cockpit", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("apex_demo_user", "true");
        localStorage.setItem("apex_hide_beta_banner", "true");
      } catch {
        // ignore
      }
    });
    await page.goto("/");
  });

  test("1. renders three score rings hero card with Regeneráció, Terhelés, and Alvás", async ({ page }) => {
    // Verify hero card container exists
    await expect(page.getByText("Napi Egyensúly").first()).toBeVisible();

    // Verify all 3 ring buttons exist
    const recoveryRingBtn = page.getByRole("button", { name: /Regeneráció/i }).first();
    const strainRingBtn = page.getByRole("button", { name: /Terhelés/i }).first();
    const sleepRingBtn = page.getByRole("button", { name: /Alvás/i }).first();

    await expect(recoveryRingBtn).toBeVisible();
    await expect(strainRingBtn).toBeVisible();
    await expect(sleepRingBtn).toBeVisible();

    // Verify ring labels exist
    await expect(page.getByText("Regeneráció").first()).toBeVisible();
    await expect(page.getByText("Terhelés").first()).toBeVisible();
    await expect(page.getByText("Alvás").first()).toBeVisible();
  });

  test("2. clicking Regeneráció ring in pending morning state navigates to morning check-in", async ({ page }) => {
    const recoveryRingBtn = page.getByRole("button", { name: /Regeneráció/i }).first();
    await recoveryRingBtn.click();

    // Should navigate to morning checkin
    await expect(page).toHaveURL(/.*checkin/);
  });

  test("3. opens and closes Strain Detail Sheet when clicking Terhelés ring", async ({ page }) => {
    const strainRingBtn = page.getByRole("button", { name: /Terhelés/i }).first();
    await strainRingBtn.click();

    // Detail sheet appears
    const sheetTitle = page.getByRole("heading", { name: /Terhelés Részletei/i }).first();
    await expect(sheetTitle).toBeVisible();

    // Check for target range or contributing sessions
    await expect(page.getByText(/Napi Terhelés \(Strain\)|Célsáv/i).first()).toBeVisible();

    // Close sheet
    const closeBtn = page.getByRole("button", { name: /Bezárás/i }).first();
    await closeBtn.click();
    await expect(sheetTitle).not.toBeVisible();
  });

  test("4. opens and closes Sleep Detail Sheet when clicking Alvás ring", async ({ page }) => {
    const sleepRingBtn = page.getByRole("button", { name: /Alvás/i }).first();
    await sleepRingBtn.click();

    // Detail sheet appears
    const sheetTitle = page.getByRole("heading", { name: /Alvás Részletei/i }).first();
    await expect(sheetTitle).toBeVisible();

    // Check for sleep need breakdown
    await expect(page.getByText(/Személyre Szabott Alvásigény Összetevői|7 napos adósság/i).first()).toBeVisible();

    // Close sheet
    const closeBtn = page.getByRole("button", { name: /Bezárás/i }).first();
    await closeBtn.click();
    await expect(sheetTitle).not.toBeVisible();
  });

  test("5. verifies responsive layout and zero horizontal overflow on mobile and desktop", async ({ page }) => {
    // Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const scrollWidthMobile = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidthMobile = await page.evaluate(() => window.innerWidth);
    expect(scrollWidthMobile).toBeLessThanOrEqual(innerWidthMobile + 1);

    // Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const scrollWidthDesktop = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidthDesktop = await page.evaluate(() => window.innerWidth);
    expect(scrollWidthDesktop).toBeLessThanOrEqual(innerWidthDesktop + 1);
  });
});
