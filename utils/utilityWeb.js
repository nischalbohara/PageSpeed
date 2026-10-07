const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SCREENSHOTS_DIR = path.join(process.cwd(), "fixtures", "screenshots");
const CSV_PATH = path.join(process.cwd(), "reports", "pagespeed-ui.csv");

const METRICS = [
  ["fcp", "First Contentful Paint"],
  ["lcp", "Largest Contentful Paint"],
  ["tbt", "Total Blocking Time"],
  ["cls", "Cumulative Layout Shift"],
  ["speedIndex", "Speed Index"],
];

const scoreColumns = (device) =>
  [
    `${device} Performance`,
    `${device} Accessibility`,
    `${device} Best Practices`,
    `${device} SEO`,
    ...METRICS.map(([, label]) => `${device} ${label}`),
  ].join(",");

const CSV_HEADER = [
  "Page",
  "URL",
  scoreColumns("Desktop"),
  scoreColumns("Mobile"),
  "Mobile Screenshot",
  "Desktop Screenshot",
].join(",");

function sanitizeName(name) {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

async function runPageSpeedTest(page, url, name) {
  const outputDir = path.join(SCREENSHOTS_DIR, sanitizeName(name));
  fs.mkdirSync(outputDir, { recursive: true });

  await page.goto("https://pagespeed.web.dev/", {
    waitUntil: "domcontentloaded",
    timeout: 10_000,
  });
  await dismissCookieBanner(page, 4_000);

  const urlInput = await page.waitForSelector(
    'input[type="url"], input[placeholder*="Enter"], input[aria-label*="URL"], #url-field',
    { timeout: 15_000 },
  );
  await urlInput.fill(url);
  await urlInput.press("Enter");

  await waitForLighthouseData(page);

  const { mobile, desktop } = await scrapeScores(page);

  const mobileScreenshot = await captureTab(
    page,
    "Mobile",
    path.join(outputDir, `${sanitizeName(name)}_mobile.png`),
  );
  const desktopScreenshot = await captureTab(
    page,
    "Desktop",
    path.join(outputDir, `${sanitizeName(name)}_desktop.png`),
  );

  appendRow({
    name,
    url,
    mobile,
    desktop,
    screenshots: { mobile: mobileScreenshot, desktop: desktopScreenshot },
  });
}

async function waitForLighthouseData(page, timeoutMs = 240_000) {
  await page.waitForFunction(
    () => {
      const w = window;
      const mobileReady =
        w.__LIGHTHOUSE_MOBILE_JSON__?.categories?.performance?.score != null;
      const desktopReady =
        w.__LIGHTHOUSE_DESKTOP_JSON__?.categories?.performance?.score != null;
      if (mobileReady && desktopReady) return true;

      // Bail early on a visible error instead of burning the full timeout
      const error =
        document.querySelector(".ErrorMessage") ||
        document.querySelector('[class*="error-message"]');
      return Boolean(error && error.offsetParent !== null);
    },
    { timeout: timeoutMs, polling: 2000 },
  );
}

async function scrapeScores(page) {
  const fallback = {
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
      const w = window;

      const AUDIT_IDS = {
        fcp: "first-contentful-paint",
        lcp: "largest-contentful-paint",
        tbt: "total-blocking-time",
        cls: "cumulative-layout-shift",
        speedIndex: "speed-index",
      };

      const formatMetric = (audit) => {
        if (!audit) return "N/A";
        if (audit.displayValue != null && String(audit.displayValue).trim()) {
          return String(audit.displayValue).trim();
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

      const extract = (data) => {
        if (!data?.categories) return null;
        const score = (key) =>
          Math.round((data.categories[key]?.score ?? 0) * 100).toString();
        return {
          performance: score("performance"),
          accessibility: score("accessibility"),
          bestPractices: score("best-practices"),
          seo: score("seo"),
          metrics: Object.fromEntries(
            Object.entries(AUDIT_IDS).map(([key, auditId]) => [
              key,
              formatMetric(data.audits?.[auditId]),
            ]),
          ),
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
  } catch (e) {
    console.warn(`Could not scrape scores: ${e.message}`);
    return { mobile: fallback, desktop: fallback };
  }
}

async function dismissCookieBanner(page, timeoutMs = 2_000) {
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
  await acceptBtn.waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
}

async function captureTab(page, tabName, screenshotPath) {
  const tab = page.locator(`[role="tab"]:has-text("${tabName}")`).first();
  await tab.click();
  await page
    .waitForFunction(
      (name) => {
        const target = Array.from(
          document.querySelectorAll('[role="tab"]'),
        ).find((t) => t.textContent?.includes(name));
        return target?.getAttribute("aria-selected") === "true";
      },
      tabName,
      { timeout: 5_000 },
    )
    .catch(() => {}); // non-fatal — screenshot whatever is visible

  await dismissCookieBanner(page);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const upload = await cloudinary.uploader.upload(screenshotPath, {
    folder: "FoundEnergyPages-test",
    public_id: path.basename(screenshotPath, ".png"),
  });
  return upload.secure_url;
}

function appendRow(result) {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, CSV_HEADER + "\n", "utf-8");
  }

  const values = (report) => [
    report.performance,
    report.accessibility,
    report.bestPractices,
    report.seo,
    ...METRICS.map(
      ([key]) => `"${(report.metrics[key] ?? "N/A").replace(/"/g, "")}"`,
    ),
  ];

  const row = [
    `"${result.name}"`,
    `"${result.url}"`,
    ...values(result.desktop),
    ...values(result.mobile),
    `"${result.screenshots.mobile}"`,
    `"${result.screenshots.desktop}"`,
  ].join(",");

  fs.appendFileSync(CSV_PATH, row + "\n", "utf-8");
}

module.exports = { sanitizeName, runPageSpeedTest };
