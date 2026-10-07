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

interface PageMetrics {
  fcp: string;
  lcp: string;
  tbt: string;
  cls: string;
  speedIndex: string;
}

interface DeviceReport extends PageScores {
  metrics: PageMetrics;
}

interface PageResult {
  name: string;
  url: string;
  desktop: DeviceReport;
  mobile: DeviceReport;
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
const METRIC_LABELS: Array<[keyof PageMetrics, string]> = [
  ["fcp", "First Contentful Paint"],
  ["lcp", "Largest Contentful Paint"],
  ["tbt", "Total Blocking Time"],
  ["cls", "Cumulative Layout Shift"],
  ["speedIndex", "Speed Index"],
];

const deviceCols = (device: "Desktop" | "Mobile") =>
  [
    `${device} Performance`,
    `${device} Accessibility`,
    `${device} Best Practices`,
    `${device} SEO`,
    ...METRIC_LABELS.map(([, label]) => `${device} ${label}`),
  ].join(",");

const CSV_HEADER = [
  "Page",
  "URL",
  deviceCols("Desktop"),
  deviceCols("Mobile"),
  "Mobile Screenshot",
  "Desktop Screenshot",
].join(",");

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
   * Extracts scores + core web vitals for both mobile and desktop in a single
   * evaluate call from the window-injected Lighthouse JSON objects.
   */
  async scrapeAllScores(
    page: any,
  ): Promise<{ mobile: DeviceReport; desktop: DeviceReport }> {
    const fallback: DeviceReport = {
      performance: "N/A",
      accessibility: "N/A",
      bestPractices: "N/A",
      seo: "N/A",
      metrics: {
        fcp: "N/A",
        lcp: "N/A",
        tbt: "N/A",
        cls: "N/A",
        speedIndex: "N/A",
      },
    };

    try {
      const scraped = await page.evaluate(() => {
        const w = window as any;

        const AUDIT_IDS: Record<string, string> = {
          fcp: "first-contentful-paint",
          lcp: "largest-contentful-paint",
          tbt: "total-blocking-time",
          cls: "cumulative-layout-shift",
          speedIndex: "speed-index",
        };

        const formatMetric = (audit: any): string => {
          if (!audit) return "N/A";
          const display = audit.displayValue;
          if (display != null && String(display).trim() !== "") {
            return String(display).trim();
          }
          const n = audit.numericValue;
          if (n == null || Number.isNaN(n)) return "N/A";
          switch (audit.numericUnit) {
            case "millisecond":
              return n >= 1000
                ? `${(n / 1000).toFixed(1)} s`
                : `${Math.round(n)} ms`;
            case "second":
              return `${n.toFixed(1)} s`;
            case "unitless":
              return n.toFixed(3);
            default:
              return String(n);
          }
        };

        const extract = (data: any): any => {
          if (!data?.categories) return null;
          const score = (key: string) =>
            Math.round((data.categories[key]?.score ?? 0) * 100).toString();
          const metrics = Object.fromEntries(
            Object.entries(AUDIT_IDS).map(([key, auditId]) => [
              key,
              formatMetric(data.audits?.[auditId]),
            ]),
          );
          return {
            performance: score("performance"),
            accessibility: score("accessibility"),
            bestPractices: score("best-practices"),
            seo: score("seo"),
            metrics,
          };
        };
        return {
          mobile: extract(w.__LIGHTHOUSE_MOBILE_JSON__),
          desktop: extract(w.__LIGHTHOUSE_DESKTOP_JSON__),
        };
      });
      return {
        mobile: scraped?.mobile ?? fallback,
        desktop: scraped?.desktop ?? fallback,
      };
    } catch (e: any) {
      console.warn(`Could not scrape scores: ${e.message}`);
      return { mobile: fallback, desktop: fallback };
    }
  }

  /**
   * Dismisses the Google cookie banner ("Ok, Got it.") so it never overlaps
   * report values in screenshots. Safe to call repeatedly — no-op when absent.
   */
  async dismissCookieBanner(page: any, timeoutMs = 2_000): Promise<void> {
    const acceptBtn = page
      .locator(
        'button:has-text("Ok, Got it"), button:has-text("Accept all"), button:has-text("Reject all")',
      )
      .first();

    const visible = await acceptBtn
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);
    if (!visible) return;

    await acceptBtn.click({ timeout: 3_000 }).catch(() => {});
    await acceptBtn
      .waitFor({ state: "hidden", timeout: 3_000 })
      .catch(() => {});
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

    await this.dismissCookieBanner(page);
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
   * Rewrites the file when the header schema changes so old rows never misalign.
   */
  appendRowToCSV(result: PageResult): void {
    const dir = path.dirname(CSV_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const headerMismatch =
      fs.existsSync(CSV_PATH) &&
      (fs.readFileSync(CSV_PATH, "utf-8").split("\n")[0] ?? "").trim() !==
        CSV_HEADER;

    if (!fs.existsSync(CSV_PATH) || headerMismatch) {
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
      ...this.metricValues(d.metrics),
      m.performance,
      m.accessibility,
      m.bestPractices,
      m.seo,
      ...this.metricValues(m.metrics),
      `"${result.cloudinaryUrls.mobile}"`,
      `"${result.cloudinaryUrls.desktop}"`,
    ].join(",");

    fs.appendFileSync(CSV_PATH, row + "\n", "utf-8");
  }

  private metricValues(metrics?: PageMetrics): string[] {
    return METRIC_LABELS.map(
      ([key]) => `"${(metrics?.[key] ?? "N/A").replace(/"/g, "")}"`,
    );
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
      timeout: 10000,
    });

    // Dismiss cookie banner if present (single attempt, no loop)
    await this.dismissCookieBanner(page, 4_000);

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
