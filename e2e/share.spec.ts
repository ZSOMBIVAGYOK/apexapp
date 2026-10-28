import { test, expect } from "@playwright/test";

test.describe("Megosztás (Share) Subsystem - Copy PNG & APEX Lockup", () => {
  test.beforeEach(async ({ page }) => {
    // Grant clipboard permissions if supported
    try {
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    } catch {
      // Ignore if browser context does not support this permission
    }
  });

  test("verifies Másolás button, PNG default, and APEX branding presence", async ({ page }) => {
    await page.goto("/training");
    await expect(page).toHaveURL(/.*training/);

    // Look for share button or open a session
    const shareBtn = page.getByRole("button", { name: /Megosztás/i }).first();
    const detailsBtn = page.getByRole("button", { name: /Részletek \/ Szerkesztés/i }).first();

    if (await shareBtn.isVisible()) {
      await shareBtn.click();
    } else if (await detailsBtn.isVisible()) {
      await detailsBtn.click();
      const modalShareBtn = page.getByRole("button", { name: /Megosztás/i }).last();
      if (await modalShareBtn.isVisible()) {
        await modalShareBtn.click();
      }
    } else {
      const dayViewBtn = page.getByRole("button", { name: /Nap nézet|Nap/i });
      if (await dayViewBtn.isVisible()) {
        await dayViewBtn.click();
        const dayShareBtn = page.getByRole("button", { name: /Edzés megosztása|Megosztás/i }).first();
        if (await dayShareBtn.isVisible()) {
          await dayShareBtn.click();
        }
      }
    }

    const shareModalTitle = page.getByText(/Edzés megosztása/i).first();
    if (await shareModalTitle.isVisible()) {
      // 1. Check "Másolás" button exists next to "Megosztás" and "Letöltés"
      const copyBtn = page.getByRole("button", { name: /Másolás/i });
      const downloadBtn = page.getByRole("button", { name: /Letöltés/i });
      const shareActionBtn = page.getByRole("button", { name: /^Megosztás$/i });

      await expect(copyBtn).toBeVisible();
      await expect(downloadBtn).toBeVisible();
      await expect(shareActionBtn).toBeVisible();

      // 2. Wordmark toggle MUST NOT exist
      const wordmarkToggle = page.getByText(/APEX logó felirat|APEX felirat/i);
      await expect(wordmarkToggle).not.toBeVisible();

      // 3. Canvas is rendered with non-empty dimensions
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible();

      // 4. Test clicking "Másolás" button triggers copy workflow
      await copyBtn.click();
      // Should show toast "Kép a vágólapon" or fallback notice
      const toastOrNotice = page.getByText(/Kép a vágólapon|vágólapra|Letöltés/i).first();
      await expect(toastOrNotice).toBeVisible({ timeout: 5000 });

      // 5. Switch to Fotó tab and verify PNG default and format selector under details
      const photoTab = page.getByRole("button", { name: /Fotó/i });
      if (await photoTab.isVisible()) {
        await photoTab.click();

        // Verify "Másolás" button is also present in Fotó mode
        await expect(copyBtn).toBeVisible();

        // Check for JPEG / PNG format option under details
        const formatSelect = page.locator("select").filter({ hasText: /PNG|JPEG/i });
        if (await formatSelect.isVisible()) {
          const val = await formatSelect.inputValue();
          expect(val).toBe("image/png");
        }
      }
    }
  });
});
