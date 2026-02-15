import { test } from "@playwright/test";
import { getCustomerConfig } from "../config/baseConfig";
import { Utility } from "./utils/utility";
import { EneryHubPAGES } from "./fixtures/pageSpeedTargets";


test.describe("PageSpeed Insights Combined CSV", () => {
  test.setTimeout(300000); // 5 min -> This is excusively kept because the Pagespeed was timing out frequently since it took longer runs to generate the reports

  EneryHubPAGES.forEach((pageInfo) => {
    test(`Fetch Desktop & Mobile scores for ${pageInfo.name}`, async ({
      page,
    }) => {
      const psConfig = getCustomerConfig("PageSpeed", "reportGen");
      const psUtils = new Utility(page, psConfig);

      console.log(`\n===== Page: ${pageInfo.name} =====`);

      await page.goto(pageInfo.url);

      // Desktop
      let desktop = {
        score: 0,
        performance: 0,
        accessibility: 0,
        "best-practices": 0,
        seo: 0,
      };
      try {
        console.log("Fetching Desktop scores...");
        desktop = await psUtils.getPageSpeedScores(pageInfo.url, "desktop");
        // await runLighthouseReport(pageInfo.url, pageInfo.name, "desktop");

        console.log("Desktop:", desktop);
      } catch (err: any) {
        console.error(`Failed Desktop for ${pageInfo.url}: ${err.message}`);
      }

      // Mobile
      let mobile = {
        score: 0,
        performance: 0,
        accessibility: 0,
        "best-practices": 0,
        seo: 0,
      };
      try {
        console.log("Fetching Mobile scores...");
        mobile = await psUtils.getPageSpeedScores(pageInfo.url, "mobile");
        // await runLighthouseReport(pageInfo.url, pageInfo.name, "mobile");

        console.log("Mobile:", mobile);
      } catch (err: any) {
        console.error(`Failed Mobile for ${pageInfo.url}: ${err.message}`);
      }

      // Append combined row to CSV
      psUtils.appendCombinedReportToCSV(
        pageInfo.name,
        pageInfo.url,
        desktop,
        mobile,
      );
    });
  });
});
