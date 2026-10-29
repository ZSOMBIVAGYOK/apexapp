import { test, expect, Page } from "@playwright/test";

// Small subset as requested: 3 viewports (375x667, 768x1024, 1440x900)
const SUBSET_VIEWPORTS = [
  { name: "phone-375", width: 375, height: 667, category: "phone" },
  { name: "tablet-768", width: 768, height: 1024, category: "tablet" },
  { name: "laptop-1440", width: 1440, height: 900, category: "desktop" }
];

const THEMES: ("dark" | "light")[] = ["dark", "light"];

const ROUTES = [
  { path: "/", name: "today" },
  { path: "/training", name: "training" },
  { path: "/nutrition", name: "nutrition" },
  { path: "/insights", name: "insights" },
  { path: "/settings", name: "settings" }
];

async function assertNoHorizontalOverflow(page: Page, contextMsg: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const innerWidth = window.innerWidth;
    return {
      hasOverflow: doc.scrollWidth > innerWidth + 1 || body.scrollWidth > innerWidth + 1,
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      innerWidth
    };
  });

  expect(
    overflow.hasOverflow,
    `Horizontal overflow at ${contextMsg}: scrollWidth=${overflow.scrollWidth}px > innerWidth=${overflow.innerWidth}px`
  ).toBe(false);
}

test.describe("Quick Responsive Subset (3 viewports, 2 themes, main routes)", () => {
  test.describe.configure({ timeout: 20000 });

  for (const vp of SUBSET_VIEWPORTS) {
    for (const theme of THEMES) {
      test(`[${theme.toUpperCase()}] ${vp.name} (${vp.width}x${vp.height}) - Main routes & Three Scores`, async ({
        page
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.addInitScript(
          ({ themeVal }) => {
            try {
              localStorage.setItem("apex_demo_user", "true");
              localStorage.setItem("apex-theme-mode", themeVal);
              localStorage.setItem(
                "apex_appearance",
                JSON.stringify({
                  theme: themeVal,
                  glass: "full",
                  textSize: "default",
                  reducedMotion: false
                })
              );
              localStorage.setItem("apex_hide_beta_banner", "true");
            } catch {
              // ignore
            }
          },
          { themeVal: theme }
        );

        // Verify Today screen and Three Scores Hero Card
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await assertNoHorizontalOverflow(page, `today on ${vp.name} [${theme}]`);

        // Check Three Scores ring buttons are visible
        await expect(page.getByRole("button", { name: /Regeneráció/i }).first()).toBeVisible();
        await expect(page.getByRole("button", { name: /Terhelés/i }).first()).toBeVisible();
        await expect(page.getByRole("button", { name: /Alvás/i }).first()).toBeVisible();

        // Check detail sheet opening on today
        if (vp.category === "desktop") {
          const strainBtn = page.getByRole("button", { name: /Terhelés/i }).first();
          await strainBtn.click();
          await expect(page.getByRole("heading", { name: /Terhelés Részletei/i }).first()).toBeVisible();
          const closeBtn = page.getByRole("button", { name: /Bezárás/i }).first();
          await closeBtn.click();
        }

        // Check other main routes
        for (const route of ROUTES.slice(1)) {
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          await assertNoHorizontalOverflow(page, `${route.name} on ${vp.name} [${theme}]`);
        }
      });
    }
  }
});
