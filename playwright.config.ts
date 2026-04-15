import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", // Directory where your tests will reside
  retries: 2, //  Retry failed tests once
  testMatch: "**/*.spec.ts", // Pattern for test files
  fullyParallel: true, // Run tests in parallel
  workers: 5, // Number of parallel workers, adjust as needed
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    // baseURL: "https://outside.studio/", // The site you're testing
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure", // Capture screenshot on failure
    video: "on-first-retry", // Record video on first retry
    trace: "on-first-retry", // Capture trace on retry
  },
  // projects: [
  //   {
  //     name: "chromium",
  //     use: { ...devices["Desktop Chrome"] }, // Use Chrome for testing
  //   },
  //   {
  //     name: "firefox",
  //     use: { ...devices["Desktop Firefox"] }, // Use Firefox for testing
  //   },
  //   {
  //     name: "webkit",
  //     use: { ...devices["Desktop Safari"] }, // Use Safari for testing
  //   },
  // ],

  projects: [
    // ===============================
    // WAY → Chrome only
    // ===============================
    {
      name: "way-chromium",
      testDir: "./tests/way",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.Way_QA_URL,
      },
    },
    // ===============================
    // CGH → Chrome only
    // ===============================
    {
      name: "cgh-chromium",
      testDir: "./tests/cgh",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.CGH_STG_URL,
      },
    },

    // ===============================
    // PAGESPEED → Just 1 browser
    // ===============================
    {
      name: "pagespeed-chromium",
      testDir: "./tests/pagespeed",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.ICT_UAT_URL,
      },
    },

    {
      name: "statebags-chromium",
      testDir: "./tests/statebags",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.STATEBAGS_STG_URL,
      },
    },
  ],
  timeout: 30000, // Timeout for each test (30 seconds)
});
