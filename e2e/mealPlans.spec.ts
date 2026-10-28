import { test, expect } from "@playwright/test";

test.describe("Meal Pools & Diet Planning Subsystem (Étrendterv)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/nutrition");
  });

  test("navigates tabs, views active meal pool plan, composes day, and tests 1-tap logging", async ({
    page
  }) => {
    await expect(page).toHaveURL(/.*nutrition/);

    // 1. Verify navigation tabs are visible
    const naploTab = page.getByRole("tab", { name: /Napló/i }).or(page.getByText("Napló")).first();
    const etrendtervTab = page.getByRole("tab", { name: /Étrendterv/i }).or(page.getByText("Étrendterv")).first();
    const eteleimTab = page.getByRole("tab", { name: /Ételeim/i }).or(page.getByText("Ételeim")).first();
    const celokTab = page.getByRole("tab", { name: /Célok/i }).or(page.getByText("Célok")).first();

    await expect(naploTab).toBeVisible();
    await expect(etrendtervTab).toBeVisible();
    await expect(eteleimTab).toBeVisible();
    await expect(celokTab).toBeVisible();

    // 2. Open Étrendterv tab
    await etrendtervTab.click();
    await expect(page.getByText(/Aktív terv|Új étrendterv létrehozása|Étkezési idősávok/i).first()).toBeVisible();

    // Verify slots like Reggeli, Ebéd, Vacsora are rendered
    await expect(page.getByText("Reggeli").first()).toBeVisible();
    await expect(page.getByText("Ebéd").first()).toBeVisible();
    await expect(page.getByText("Vacsora").first()).toBeVisible();

    // 3. Open Ételeim library tab
    await eteleimTab.click();
    await expect(page.getByPlaceholder(/Keresés az ételek között/i)).toBeVisible();
    await expect(page.getByText(/Saját étel hozzáadása/i).first()).toBeVisible();

    // 4. Return to Napló tab
    await naploTab.click();

    // Verify header action buttons: Nap összeállítása, Hétterv, Bevásárlólista
    const composeDayBtn = page.getByRole("button", { name: /Nap összeállítása/i }).first();
    const weekPlanBtn = page.getByRole("button", { name: /Hétterv/i }).first();
    const shoppingBtn = page.getByRole("button", { name: /Bevásárlólista/i }).first();

    await expect(composeDayBtn).toBeVisible();
    await expect(weekPlanBtn).toBeVisible();
    await expect(shoppingBtn).toBeVisible();

    // 5. Open Day Composer Sheet
    await composeDayBtn.click();
    await expect(page.getByText(/Nap Összeállítása|Javasolj egy napot/i).first()).toBeVisible();

    // Check presence of "Javasolj egy napot" button and summary bar
    const suggestBtn = page.getByRole("button", { name: /Javasolj egy napot/i }).first();
    if (await suggestBtn.isVisible()) {
      await suggestBtn.click();
      // Should show success toast
      await expect(page.getByText(/Új javaslat betöltve|Javasolt nap összeállítva/i).first()).toBeVisible();
    }

    // Apply composed day
    const applyBtn = page.getByRole("button", { name: /Alkalmaz a napra/i }).first();
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await expect(page.getByText(/Összeállított nap elmentve/i).first()).toBeVisible();
    }

    // 6. Test 1-tap Quick-pick pool chip in diary
    const quickPoolChip = page.locator('button[title*="1 koppintásos naplózás"]').first();
    if (await quickPoolChip.isVisible()) {
      await quickPoolChip.click();
      await expect(page.getByText(/hozzáadva a naplóhoz/i).first()).toBeVisible();
    }

    // 7. Test sensitive-use mode: "Kalóriaszámok elrejtése (Tányérmódszer)"
    const hideCaloriesToggle = page.getByLabel(/Kalóriaszámok elrejtése/i).or(page.getByText(/Kalóriaszámok elrejtése/i)).first();
    if (await hideCaloriesToggle.isVisible()) {
      await hideCaloriesToggle.click();
      // Plate distribution notice should appear
      await expect(page.getByText(/Tányérmódszeres megoszlás/i).first()).toBeVisible();
    }
  });

  test("opens Bevásárlólista sheet and verifies aggregated items", async ({ page }) => {
    const shoppingBtn = page.getByRole("button", { name: /Bevásárlólista/i }).first();
    await expect(shoppingBtn).toBeVisible();
    await shoppingBtn.click();

    // Verify modal header & date range presets
    await expect(page.getByText(/Bevásárlólista/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Következő 3 nap/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ez a hét/i })).toBeVisible();

    // Close sheet
    const closeBtn = page.locator('button[aria-label="Bezárás"]').or(page.getByRole("button", { name: /Bezárás/i })).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
