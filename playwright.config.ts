import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", // Directory where your tests will reside
  // retries: 1, //  Retry failed tests once
  testMatch: "**/*.spec.ts", // Pattern for test files
  fullyParallel: true, // Run tests in parallel
  workers: 10, // Number of parallel workers, adjust as needed
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "https://outside.studio/", // The site you're testing
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure", // Capture screenshot on failure
    video: "on-first-retry", // Record video on first retry
    trace: "on-first-retry", // Capture trace on retry
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }, // Use Chrome for testing
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] }, // Use Firefox for testing
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] }, // Use Safari for testing
    // },
  ],
  timeout: 30000, // Timeout for each test (30 seconds)
});
