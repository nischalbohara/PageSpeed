const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(process.cwd(), "reports", "pagespeed-api.csv");

const CSV_HEADER = [
  "Page",
  "URL",
  "Desktop Score",
  "Performance",
  "Accessibility",
  "Best Practices",
  "SEO",
  "Mobile Score",
  "Performance (Mobile)",
  "Accessibility (Mobile)",
  "Best Practices (Mobile)",
  "SEO (Mobile)",
].join(",");

async function fetchScores(url, strategy) {
  const key = process.env.PS_APIKEY;
  const apiUrl =
    "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed" +
    `?url=${encodeURIComponent(url)}` +
    `&strategy=${strategy}` +
    "&category=performance&category=accessibility&category=best-practices&category=seo" +
    (key ? `&key=${key}` : "");

  const res = await fetch(apiUrl);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
    } catch {
      // keep the status line when the body isn't JSON
    }
    throw new Error(`PageSpeed API (${strategy}) failed for ${url}: ${detail}`);
  }

  const data = await res.json();
  const read = (category) =>
    Math.round(
      (data.lighthouseResult?.categories?.[category]?.score ?? 0) * 100,
    );

  const scores = {
    performance: read("performance"),
    accessibility: read("accessibility"),
    "best-practices": read("best-practices"),
    seo: read("seo"),
  };

  return { score: scores.performance, ...scores };
}

function appendScoresRow(name, url, desktop, mobile) {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, CSV_HEADER + "\n", "utf-8");
  }

  const row = [
    `"${name}"`,
    `"${url}"`,
    desktop.score,
    desktop.performance,
    desktop.accessibility,
    desktop["best-practices"],
    desktop.seo,
    mobile.score,
    mobile.performance,
    mobile.accessibility,
    mobile["best-practices"],
    mobile.seo,
  ].join(",");

  fs.appendFileSync(CSV_PATH, row + "\n", "utf-8");
}

module.exports = { fetchScores, appendScoresRow };
