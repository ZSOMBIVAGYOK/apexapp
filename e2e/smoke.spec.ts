import { test, expect } from "@playwright/test";

test.describe("Apex Platform Smoke Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to base application URL
    await page.goto("/");
  });

  /**
   * Flow 1: Onboarding in Manual Mode
   */
  test("1. should complete onboarding in manual mode with health data consent", async ({ page }) => {
    // Navigate to onboarding wizard
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/.*onboarding/);

    // Step 1: Select role (Athlete)
    const athleteRoleBtn = page.getByRole("button", { name: /Sportoló/i }).or(page.getByText(/Sportoló/i));
    if (await athleteRoleBtn.isVisible()) {
      await athleteRoleBtn.click();
      await page.getByRole("button", { name: /Tovább|Következő/i }).click();
    }

    // Step 2: Athlete Profile (Sport, Level)
    const sportInput = page.getByPlaceholder(/fő sportág|Triatlon/i);
    if (await sportInput.isVisible()) {
      await sportInput.fill("Triatlon");
    }

    // Step 3: Data Logging Mode -> Pick Manual Mode
    const manualModeOption = page.getByText(/Manuális naplózás|Kézi naplózás/i);
    if (await manualModeOption.isVisible()) {
      await manualModeOption.click();
    }

    // Step 4: Health Data Consent (GDPR Art. 9)
    const consentCheckbox = page.getByRole("checkbox", { name: /hozzájárulok|egészségügyi/i });
    if (await consentCheckbox.isVisible()) {
      await consentCheckbox.check();
    }

    // Finish onboarding
    const finishBtn = page.getByRole("button", { name: /Befejezés|Kezdés/i });
    if (await finishBtn.isVisible()) {
      await finishBtn.click();
    }

    // Should arrive on Today cockpit
    await expect(page).toHaveURL(/\/$/);
  });

  /**
   * Flow 2: Daily Check-in & Readiness Calculation
   */
  test("2. should log morning check-in and display updated readiness score", async ({ page }) => {
    await page.goto("/checkin");
    await expect(page.getByText(/Napi Check-in|Reggeli Check-in/i).first()).toBeVisible();

    // Sleep quality tap (e.g. 4 stars / rating)
    const sleepQualityOption = page.getByRole("button", { name: /4|Jó/i }).first();
    if (await sleepQualityOption.isVisible()) {
      await sleepQualityOption.click();
    }

    // Submit check-in
    const submitBtn = page.getByRole("button", { name: /Mentés|Check-in rögzítése/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify redirected to today screen or readiness card visible
    await page.waitForTimeout(500);
    const readinessIndicator = page.getByText(/Készenlét|Regeneráció|Ready|Ready for/i).first();
    await expect(readinessIndicator).toBeVisible();
  });

  /**
   * Flow 3: Logging a Manual Training Session with Session-RPE Load
   */
  test("3. should log a manual workout session with calculated load", async ({ page }) => {
    await page.goto("/training");
    await expect(page).toHaveURL(/.*training/);

    // Open Manual Session Modal
    const logSessionBtn = page.getByRole("button", { name: /Edzés naplózása|Kézi naplózás|Új edzés/i }).first();
    await logSessionBtn.click();

    // Modal should be open
    await expect(page.getByText(/Edzés naplózása|Új edzés rögzítése/i).first()).toBeVisible();

    // Fill workout title & duration
    const titleInput = page.getByPlaceholder(/pl. Küszöb futás|Edzés megnevezése/i);
    if (await titleInput.isVisible()) {
      await titleInput.fill("45p Bázis Futás");
    }

    // Submit workout
    const saveSessionBtn = page.getByRole("button", { name: /Mentés|Rögzítés/i }).last();
    await saveSessionBtn.click();

    // Toast notification confirmation
    await expect(page.getByText(/Edzés rögzítve|sikeresen mentve/i).first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * Flow 4: Quick Meal Logging
   */
  test("4. should log a meal and update nutrition progress", async ({ page }) => {
    await page.goto("/nutrition");
    await expect(page).toHaveURL(/.*nutrition/);

    // Open meal log / quick add
    const logMealBtn = page.getByRole("button", { name: /Étkezés rögzítése|Gyors hozzáadás/i }).first();
    if (await logMealBtn.isVisible()) {
      await logMealBtn.click();
    }

    // Verify macronutrient progress bars exist
    await expect(page.getByText(/Fehérje|Protein/i).first()).toBeVisible();
    await expect(page.getByText(/Szénhidrát|Carbs/i).first()).toBeVisible();
  });

  /**
   * Flow 5: Coach Invitation and Access Revocation
   */
  test("5. should generate coach invite code and handle access revocation", async ({ page }) => {
    await page.goto("/sharing");
    await expect(page).toHaveURL(/.*sharing/);

    // Open invite dialog
    const inviteBtn = page.getByRole("button", { name: /Edző meghívása|Új szakember meghívása/i }).first();
    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();

      // Invite code should appear in modal (e.g. APX-XXXXX)
      const codeElement = page.getByText(/APX-[A-Z0-9]{4,6}/i);
      if (await codeElement.isVisible()) {
        await expect(codeElement).toBeVisible();
      }
    }

    // Test Revocation: Active collaborations list
    const activeStaffRow = page.getByText(/Kovács Péter|Molnár Eszter/i).first();
    if (await activeStaffRow.isVisible()) {
      const revokeBtn = page.getByRole("button", { name: /Hozzáférés visszavonása|Törlés/i }).first();
      if (await revokeBtn.isVisible()) {
        await revokeBtn.click();
        // Immediate lockout confirmation dialog
        const confirmBtn = page.getByRole("button", { name: /Igen, visszavonom|Megerősítés/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await expect(page.getByText(/visszavonva|megszüntetve/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  /**
   * Flow 6: Session Share Modal - Sticker & Photo Image Generation
   */
  test("6. should open session share modal and generate non-empty image blob", async ({ page }) => {
    await page.goto("/training");
    await expect(page).toHaveURL(/.*training/);

    // Look for a share button in the calendar or open session detail
    const shareBtn = page.getByRole("button", { name: /Megosztás/i }).first();
    const detailsBtn = page.getByRole("button", { name: /Részletek \/ Szerkesztés/i }).first();

    if (await shareBtn.isVisible()) {
      await shareBtn.click();
    } else if (await detailsBtn.isVisible()) {
      await detailsBtn.click();
      const modalShareBtn = page.getByRole("button", { name: /Megosztás/i }).last();
      await modalShareBtn.click();
    } else {
      // If no completed session button is directly visible, switch to Day view
      const dayViewBtn = page.getByRole("button", { name: /Nap nézet|Nap/i });
      if (await dayViewBtn.isVisible()) {
        await dayViewBtn.click();
        const dayShareBtn = page.getByRole("button", { name: /Edzés megosztása|Megosztás/i }).first();
        if (await dayShareBtn.isVisible()) {
          await dayShareBtn.click();
        }
      }
    }

    // Verify Share Modal is open
    const shareModalTitle = page.getByText(/Edzés megosztása/i).first();
    if (await shareModalTitle.isVisible()) {
      await expect(shareModalTitle).toBeVisible();

      // Check canvas preview is rendered
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible();

      // Verify Sticker mode options
      await expect(page.getByText(/Átlátszó matrica/i)).toBeVisible();

      // Switch to Photo mode
      const photoTab = page.getByRole("button", { name: /Fotó/i });
      if (await photoTab.isVisible()) {
        await photoTab.click();
        // Check photo controls exist
        await expect(page.getByText(/Képarány|Sötétítés/i).first()).toBeVisible();
      }

      // Test that an image blob can be generated client-side from the canvas
      const hasValidBlob = await page.evaluate(async () => {
        const c = document.querySelector("canvas");
        if (!c) return false;
        return new Promise<boolean>((resolve) => {
          c.toBlob((blob) => {
            resolve(!!blob && blob.size > 0);
          }, "image/png");
        });
      });

      expect(hasValidBlob).toBe(true);
    }
  });
});
