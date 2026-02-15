import { Page } from "@playwright/test";
import { RoleCredentials } from "../../config/baseConfig";
import fs from "fs";
import path from "path";

// Global constants for the report directory and CSV path
export const REPORT_DIR = path.join(__dirname,"..","pagespeedreport");
export const CSV_FILE_PATH = path.join(
  REPORT_DIR,
  "pagespeed_scores_combined.csv",
);

// Ensure the directory exists (runs once when module is imported)
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}
export class Utility {
  //   constructor(private page: Page,) {}
  constructor(
    private page: Page,
    private config: { baseUrl: string } & RoleCredentials,
  ) {}

  // Fetch PSI API scores
  async getPageSpeedScores(url: string, strategy: "mobile" | "desktop") {
    // Lighthouse categories
    const SCORES = [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ] as const;
    type ScoreKey = (typeof SCORES)[number];

    const apiUrl = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url,
    )}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo&key=${this.config.apikey}`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as any;

    const scores: Record<ScoreKey, number> = {
      performance: 0,
      accessibility: 0,
      "best-practices": 0,
      seo: 0,
    };

    SCORES.forEach((key) => {
      const score = data.lighthouseResult?.categories?.[key]?.score;
      scores[key] = score !== undefined ? score * 100 : 0;
    });

    // Add a combined "overall" score as Desktop/Mobile Score
    const overallScore = scores.performance; // you can choose which metric to use as the "main score"

    return { ...scores, score: overallScore };
  }

  async ensureCSVHeader() {
    const header = [
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

    if (
      !fs.existsSync(CSV_FILE_PATH) ||
      fs.readFileSync(CSV_FILE_PATH, "utf-8").trim() === ""
    ) {
      fs.writeFileSync(CSV_FILE_PATH, header + "\n");
    }
  }

  async appendCombinedReportToCSV(
    pageName: string,
    url: string,
    desktop: {
      score: number;
      performance: number;
      accessibility: number;
      "best-practices": number;
      seo: number;
    },
    mobile: {
      score: number;
      performance: number;
      accessibility: number;
      "best-practices": number;
      seo: number;
    },
  ) {
    this.ensureCSVHeader();

    const row = [
      `"${pageName}"`,
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

    fs.appendFileSync(CSV_FILE_PATH, row + "\n");
  }
}
