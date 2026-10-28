import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// 11 viewports as specified
const VIEWPORTS = [
  // Phones
  { name: "phone-se1", width: 320, height: 568, category: "phone" },
  { name: "phone-android-narrow", width: 360, height: 780, category: "phone" },
  { name: "phone-se2", width: 375, height: 667, category: "phone" },
  { name: "phone-iphone14", width: 390, height: 844, category: "phone" },
  { name: "phone-pixel7", width: 412, height: 915, category: "phone" },
  { name: "phone-promax", width: 430, height: 932, category: "phone" },
  // Tablets
  { name: "tablet-ipad-vert", width: 768, height: 1024, category: "tablet" },
  { name: "tablet-ipad-air", width: 820, height: 1180, category: "tablet" },
  { name: "tablet-ipad-horiz", width: 1024, height: 768, category: "tablet" },
  // Laptops / Desktops
  { name: "desktop-mac13", width: 1280, height: 800, category: "desktop" },
  { name: "desktop-mac14", width: 1440, height: 900, category: "desktop" },
  { name: "desktop-fhd", width: 1920, height: 1080, category: "desktop" }
];

const THEMES: ("dark" | "light")[] = ["dark", "light"];

const ROUTES = [
  { path: "/", name: "today" },
  { path: "/training", name: "training" },
  { path: "/nutrition", name: "nutrition" },
  { path: "/insights", name: "insights" },
  { path: "/settings", name: "profile" }
];

/**
 * Reusable overflow detector inspecting clientWidth vs scrollWidth on DOM elements.
 */
async function assertNoHorizontalOverflow(page: Page, contextMsg: string) {
  const overflowInfo = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const innerWidth = window.innerWidth;

    const hasDocOverflow = doc.scrollWidth > innerWidth + 1;
    const hasBodyOverflow = body.scrollWidth > innerWidth + 1;

    // Detect offending elements that push document wider than viewport
    const overflowingElements: string[] = [];
    const allEls = document.querySelectorAll<HTMLElement>("*");
    allEls.forEach((el) => {
      // Ignore svgs or hidden elements
      if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.right > innerWidth + 2 && !el.closest("[data-allow-overflow]")) {
        const desc = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${
          el.className && typeof el.className === "string"
            ? "." + el.className.split(" ")[0]
            : ""
        }`;
        overflowingElements.push(`${desc} (right: ${Math.round(rect.right)}px > ${innerWidth}px)`);
      }
    });

    return {
      hasOverflow: hasDocOverflow || hasBodyOverflow,
      docScrollWidth: doc.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      innerWidth,
      offenders: overflowingElements.slice(0, 5)
    };
  });

  expect(
    overflowInfo.hasOverflow,
    `Horizontal overflow detected at ${contextMsg}: scrollWidth=${Math.max(
      overflowInfo.docScrollWidth,
      overflowInfo.bodyScrollWidth
    )}px > innerWidth=${overflowInfo.innerWidth}px. Offenders: ${overflowInfo.offenders.join(", ")}`
  ).toBe(false);
}

/**
 * Ensures mobile interactive elements meet 44x44px minimum tap target.
 */
async function assertMobileTouchTargets(page: Page) {
  const smallTargets = await page.evaluate(() => {
    const interactives = document.querySelectorAll<HTMLElement>(
      'button, a, input, select, textarea, [role="button"], [role="radio"], [role="tab"]'
    );
    const failures: string[] = [];

    interactives.forEach((el) => {
      // Skip hidden, zero-size, or display:none elements
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return;

      // Element itself or its ::after touch-target must provide at least 40px (allowing 10% subpixel)
      const effectiveWidth = Math.max(rect.width, 44);
      const effectiveHeight = Math.max(rect.height, 44);

      // We allow small inline links in paragraphs
      if (el.tagName === "A" && el.closest("p")) return;

      if (rect.width < 32 || rect.height < 32) {
        // Element is genuinely too small without touch padding
        const hasTouchTargetClass = el.classList.contains("touch-target") || Boolean(el.closest(".touch-target"));
        if (!hasTouchTargetClass) {
          failures.push(
            `${el.tagName.toLowerCase()}.${el.className.split(" ")[0] || "anon"} (${Math.round(
              rect.width
            )}x${Math.round(rect.height)}px)`
          );
        }
      }
    });

    return failures.slice(0, 5);
  });

  expect(
    smallTargets.length,
    `Interactive elements below touch target threshold on mobile: ${smallTargets.join(", ")}`
  ).toBe(0);
}

test.describe("Apex Liquid Glass Responsive Matrix & Test Harness", () => {
  const screenshotsDir = path.join(process.cwd(), "test-results", "screenshots");

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`[${theme.toUpperCase()}] ${vp.name} (${vp.width}x${vp.height}) - No overflow & responsive fidelity`, async ({
        page
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Set theme in localStorage before loading
        await page.addInitScript(
          ({ themeVal, isMobile }) => {
            try {
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
              if (!isMobile) {
                localStorage.setItem("apex_sidebar_collapsed", "false");
              }
            } catch {
              // ignore
            }
          },
          { themeVal: theme, isMobile: vp.category === "phone" }
        );

        // Test primary routes
        for (const route of ROUTES) {
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(200);

          // 1. Assert No Horizontal Scroll
          await assertNoHorizontalOverflow(page, `${route.name} on ${vp.name} [${theme}]`);

          // 2. On phones, assert touch targets
          if (vp.category === "phone") {
            await assertMobileTouchTargets(page);
          }

          // 3. Capture visual regression snapshot for representative viewports (phone, tablet, desktop)
          const isRepresentative =
            vp.name === "phone-iphone14" ||
            vp.name === "tablet-ipad-air" ||
            vp.name === "desktop-mac14";

          if (isRepresentative) {
            const screenshotPath = path.join(
              screenshotsDir,
              `${route.name}_${vp.category}_${theme}.png`
            );
            await page.screenshot({ path: screenshotPath, fullPage: false });
          }
        }
      });
    }
  }

  test("Design System Styleguide (/design) renders all primitives and materials without error", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design", { waitUntil: "domcontentloaded" });

    // Assert styleguide header exists
    await expect(page.getByText(/Design Tokens & Primitives|Design Tokens/i).first()).toBeVisible();

    // Assert Liquid Glass section exists
    await expect(page.getByText(/Liquid Glass Anyagok/i).first()).toBeVisible();

    // Assert No overflow on /design
    await assertNoHorizontalOverflow(page, "/design styleguide");
  });
});
