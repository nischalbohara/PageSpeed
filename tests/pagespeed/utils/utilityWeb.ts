import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryConfig } from "../../config/baseConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageScores {
  performance: string;
  accessibility: string;
  bestPractices: string;
  seo: string;
}

interface PageResult {
  name: string;
  url: string;
  desktop: PageScores;
  mobile: PageScores;
  cloudinaryUrls: {
    mobile: string;
    desktop: string;
  };
}
const cloudinaryConfig = getCloudinaryConfig();
cloudinary.config({
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key,
  api_secret: cloudinaryConfig.api_secret,
});

// const folder = path.join(__dirname, "screenshots");
// if (!fs.existsSync(folder)) {
//   fs.mkdirSync(folder, { recursive: true });
// }

// const CSV_PATH = path.join(__dirname, "screenshots", "pagespeed-scores.csv");
const CSV_PATH = path.join(
  process.cwd(),
  "screenshots",
  "pagespeed-scores.csv",
);
const CSV_HEADER =
  "Page,URL,Desktop Performance,Desktop Accessibility,Desktop Best Practices,Desktop SEO,Mobile Performance,Mobile Accessibility,Mobile Best Practices,Mobile SEO,Mobile Screenshot,Desktop Screenshot";

export class UtilityWeb {
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  sanitizeName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  }

  async waitForLighthouseData(page: any, timeoutMs = 240_000): Promise<void> {
    await page.waitForFunction(
      () => {
        const w = window as any;
        const mobileReady =
          w.__LIGHTHOUSE_MOBILE_JSON__?.categories?.performance?.score != null;
        const desktopReady =
          w.__LIGHTHOUSE_DESKTOP_JSON__?.categories?.performance?.score != null;
        if (mobileReady && desktopReady) return true;

        // Bail early on a visible error so we don't burn the full timeout
        const error =
          document.querySelector(".ErrorMessage") ||
          document.querySelector('[class*="error-message"]');
        if (error && (error as HTMLElement).offsetParent !== null) return true;

        return false;
      },
      { timeout: timeoutMs, polling: 2000 },
    );
  }

  /**
   * Extracts both mobile and desktop scores in a single evaluate call
   * from the window-injected Lighthouse JSON objects.
   */
  async scrapeAllScores(
    page: any,
  ): Promise<{ mobile: PageScores; desktop: PageScores }> {
    const fallback: PageScores = {
      performance: "N/A",
      accessibility: "N/A",
      bestPractices: "N/A",
      seo: "N/A",
    };

    try {
      return await page.evaluate(() => {
        const w = window as any;
        const extract = (data: any): any => {
          if (!data?.categories) return null;
          const score = (key: string) =>
            Math.round((data.categories[key]?.score ?? 0) * 100).toString();
          return {
            performance: score("performance"),
            accessibility: score("accessibility"),
            bestPractices: score("best-practices"),
            seo: score("seo"),
          };
        };
        return {
          mobile: extract(w.__LIGHTHOUSE_MOBILE_JSON__),
          desktop: extract(w.__LIGHTHOUSE_DESKTOP_JSON__),
        };
      });
    } catch (e: any) {
      console.warn(`Could not scrape scores: ${e.message}`);
      return { mobile: fallback, desktop: fallback };
    }
  }

  /**
   * Clicks a tab and takes a screenshot.
   *
   * By the time this is called, waitForLighthouseData() has already confirmed
   * both reports are fully loaded in the DOM. Tab switching is just a CSS
   * visibility toggle — it's near-instant, no re-analysis happens.
   * We only wait for the tab's [aria-selected="true"] state as confirmation
   * the panel swap is complete before screenshotting.
   */
  async screenshotTab(
    page: any,
    tabName: "Mobile" | "Desktop",
    screenshotPath: string,
  ): Promise<string> {
    const tab = page.locator(`[role="tab"]:has-text("${tabName}")`).first();
    await tab.click();

    // Wait only for the tab to register as selected — this is a DOM attribute
    // flip, happens in <100ms. No analysis or network wait needed.
    await tab.waitFor({ state: "visible", timeout: 5_000 });
    await page
      .waitForFunction(
        (name: string) => {
          const tabs = document.querySelectorAll('[role="tab"]');
          const target = Array.from(tabs).find((t) =>
            t.textContent?.includes(name),
          );
          return target?.getAttribute("aria-selected") === "true";
        },
        tabName,
        { timeout: 5_000 },
      )
      .catch(() => {}); // non-fatal — screenshot whatever is visible

    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const result = await cloudinary.uploader.upload(screenshotPath, {
      folder: "FoundEnergyPages-test",
      public_id: path.basename(screenshotPath, ".png"),
    });

    return result.secure_url;
  }

  /**
   * Appends one result row to the CSV (sync append — safe across parallel workers).
   */
  appendRowToCSV(result: PageResult): void {
    const dir = path.dirname(CSV_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, CSV_HEADER + "\n", "utf-8");
    }

    const { desktop: d, mobile: m } = result;
    const row = [
      `"${result.name}"`,
      `"${result.url}"`,
      d.performance,
      d.accessibility,
      d.bestPractices,
      d.seo,
      m.performance,
      m.accessibility,
      m.bestPractices,
      m.seo,
      `"${result.cloudinaryUrls.mobile}"`,
      `"${result.cloudinaryUrls.desktop}"`,
    ].join(",");

    fs.appendFileSync(CSV_PATH, row + "\n", "utf-8");
  }

  async runPageSpeedTest(
    page: any,
    targetUrl: string,
    pageName: string,
    outputDir: string,
  ): Promise<PageResult> {
    const sanitized = this.sanitizeName(pageName);
    fs.mkdirSync(outputDir, { recursive: true });

    // ── 1. Navigate to PageSpeed ──────────────────────────────────────────────
    await page.goto("https://pagespeed.web.dev/", {
      waitUntil: "domcontentloaded",
      timeout: 3000,
    });

    // Dismiss cookie banner if present (single attempt, no loop)
    const acceptBtn = page
      .locator('button:has-text("Ok, Got it."), button:has-text("Accept all")')
      .first();
    if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await acceptBtn.click();
    }

    // ── 2. Submit the target URL ──────────────────────────────────────────────
    const urlInput = await page.waitForSelector(
      'input[type="url"], input[placeholder*="Enter"], input[aria-label*="URL"], #url-field',
      { timeout: 15_000 },
    );
    await urlInput.fill(targetUrl);
    await urlInput.press("Enter");

    // ── 3. Wait for BOTH analyses to finish (the only real wait in the flow) ──
    await this.waitForLighthouseData(page, 240_000);

    // ── 4. Extract all scores in one shot — no tab switching needed for this ──
    const { mobile: mobileScores, desktop: desktopScores } =
      await this.scrapeAllScores(page);

    // ── 5 & 6. Screenshot each tab — fast, just a panel swap at this point ────
    const mobileCloudinaryUrl = await this.screenshotTab(
      page,
      "Mobile",
      path.join(outputDir, `${sanitized}_mobile.png`),
    );

    const desktopCloudinaryUrl = await this.screenshotTab(
      page,
      "Desktop",
      path.join(outputDir, `${sanitized}_desktop.png`),
    );

    return {
      name: pageName,
      url: targetUrl,
      desktop: desktopScores,
      mobile: mobileScores,
      cloudinaryUrls: {
        mobile: mobileCloudinaryUrl,
        desktop: desktopCloudinaryUrl,
      },
    };
  }
}
