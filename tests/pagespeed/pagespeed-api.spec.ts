// import { test } from "@playwright/test";
// import { getCustomerConfig } from "../config/baseConfig";
// import { UtilityApi } from "./utils/utilityApi";
// import { EneryHubPAGES, NationsWellPages } from "./fixtures/pageSpeedTargets";

// test.describe("PageSpeed Insights Combined CSV", () => {
//   test.setTimeout(300000); // 5 min -> This is excusively kept because the Pagespeed was timing out frequently since it took longer runs to generate the reports

//   NationsWellPages.forEach((pageInfo) => {
//     test(`Should fetch Desktop & Mobile scores for ${pageInfo.name}`, async ({
//       page,
//     }) => {
//       // Fetches the API KEY to run the google API
//       const psConfig = getCustomerConfig("PageSpeed", "reportGen");
//       const psUtils = new UtilityApi(page, psConfig);
//       // Desktop
//       let desktop = {
//         score: 0,
//         performance: 0,
//         accessibility: 0,
//         "best-practices": 0,
//         seo: 0,
//       };
//       try {
//         // console.log("Fetching Desktop scores...");
//         desktop = await psUtils.getPageSpeedScores(pageInfo.url, "desktop");
//       } catch (err: any) {
//         console.error(`Failed Desktop for ${pageInfo.url}: ${err.message}`);
//       }

//       // Mobile
//       let mobile = {
//         score: 0,
//         performance: 0,
//         accessibility: 0,
//         "best-practices": 0,
//         seo: 0,
//       };
//       try {
//         // console.log("Fetching Mobile scores...");
//         mobile = await psUtils.getPageSpeedScores(pageInfo.url, "mobile");
//       } catch (err: any) {
//         console.error(`Failed Mobile for ${pageInfo.url}: ${err.message}`);
//       }

//       // Append combined row to CSV
//       psUtils.appendCombinedReportToCSV(
//         pageInfo.name,
//         pageInfo.url,
//         desktop,
//         mobile,
//       );
//     });
//   });
// });
