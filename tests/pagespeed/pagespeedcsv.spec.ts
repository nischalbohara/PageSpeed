import { test } from "@playwright/test";
import path from "path";
import {
  EneryHubPAGES,
  NationsWellPages,
  FoundEnergyPages,
} from "./fixtures/pageSpeedTargets";
import { UtilityWeb } from "./utils/utilityWeb";

const psUtils = new UtilityWeb();

test.describe("PageSpeed Insights Screenshots", () => {
  /**
   * Per-test timeout budget:
   *   ~4 min  PageSpeed parallel analysis (the only real wait)
   *   ~20s    two screenshots + Cloudinary uploads
   *   ~15s    navigation, URL submit, tab switches
   *   ──────────────────────────────────────────────
   *   ~5 min  total; 6 min ceiling for slow PageSpeed runs
   */
  test.setTimeout(360_000); // 6 minutes

  FoundEnergyPages.forEach((pageInfo) => {
    test(`PageSpeed: ${pageInfo.name}`, async ({ page }) => {
      const outputDir = path.join(
        process.cwd(),
        "screenshots",
        psUtils.sanitizeName(pageInfo.name),
      );

      const result = await psUtils.runPageSpeedTest(
        page,
        pageInfo.url,
        pageInfo.name,
        outputDir,
      );

      psUtils.appendRowToCSV(result);
    });
  });
});
