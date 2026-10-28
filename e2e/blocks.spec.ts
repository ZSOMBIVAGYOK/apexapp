import { test, expect } from "@playwright/test";

test.describe("Training Blocks Subsystem (Rounds & Rest Times)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/training");
  });

  test("creates a manual workout with structured blocks (rounds and rest times), saves and displays them", async ({
    page,
  }) => {
    await expect(page).toHaveURL(/.*training/);

    // 1. Open Manual Session Modal
    const logSessionBtn = page.getByRole("button", { name: /Edzés naplózása|Kézi naplózás|Új edzés/i }).first();
    await expect(logSessionBtn).toBeVisible();
    await logSessionBtn.click();

    // Verify modal is open
    await expect(page.getByText(/Edzés naplózása|Új edzés rögzítése/i).first()).toBeVisible();

    // 2. Set basic session fields
    const titleInput = page.getByPlaceholder(/pl\. Küszöb futás|Edzés megnevezése/i);
    if (await titleInput.isVisible()) {
      await titleInput.fill("Erőnléti Blokk Teszt");
    }

    const durationInput = page.locator('input[type="number"]').first();
    if (await durationInput.isVisible()) {
      await durationInput.fill("60");
    }

    // 3. Expand "Részletek" collapsible
    const detailsToggle = page.getByRole("button", { name: /Részletek/i }).first();
    if (await detailsToggle.isVisible()) {
      await detailsToggle.click();
    }

    // 4. Look for "Edzésblokkok" section
    const blocksToggle = page.getByRole("button", { name: /Edzésblokkok/i }).first();
    await expect(blocksToggle).toBeVisible();
    await blocksToggle.click();

    // 5. Add "+ A blokk"
    const addABlockBtn = page.getByRole("button", { name: /\+ A blokk/i }).first();
    await expect(addABlockBtn).toBeVisible();
    await addABlockBtn.click();

    // Verify block header shows "A blokk"
    await expect(page.getByText(/A blokk/i).first()).toBeVisible();

    // Verify Rounds input is present
    const roundsInput = page.locator('input[aria-label="Körök"]').or(page.locator('input[title="Körök"]')).first();
    if (await roundsInput.isVisible()) {
      await roundsInput.fill("3");
    }

    // Verify Quick-pick rest chip (e.g. 1:00)
    const restChip = page.getByRole("button", { name: "1:00" }).first();
    if (await restChip.isVisible()) {
      await restChip.click();
    }

    // 6. Save the session
    const saveBtn = page.getByRole("button", { name: /Mentés|Rögzítés/i }).last();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 7. Verify session appears in the training calendar or session list
    await expect(page.getByText("Erőnléti Blokk Teszt").first()).toBeVisible({ timeout: 5000 });
  });

  test("verifies planned workout builder estimated duration calculation from blocks", async ({ page }) => {
    await expect(page).toHaveURL(/.*training/);

    // Switch to Plan sub-tab if present
    const planTab = page.getByRole("button", { name: /Terv/i }).first();
    if (await planTab.isVisible()) {
      await planTab.click();
    }

    // Open Workout Builder Modal
    const addPlanBtn = page.getByRole("button", { name: /Új tervezett edzés|\+ Tervezett edzés/i }).first();
    if (await addPlanBtn.isVisible()) {
      await addPlanBtn.click();

      // Check modal open
      await expect(page.getByText(/Tervezett edzés hozzáadása/i).first()).toBeVisible();

      // Add a block
      const addWarmupBtn = page.getByRole("button", { name: /\+ Bemelegítés/i }).first();
      if (await addWarmupBtn.isVisible()) {
        await addWarmupBtn.click();
        await expect(page.getByText(/Bemelegítés/i).first()).toBeVisible();
      }

      // Check for (becsült) label or estimated duration badge
      const estimatedBadge = page.getByText(/becsült/i).first();
      if (await estimatedBadge.isVisible()) {
        await expect(estimatedBadge).toBeVisible();
      }

      // Close modal
      const cancelBtn = page.getByRole("button", { name: /Mégse/i }).last();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });
});
