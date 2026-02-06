import { test, expect } from "@playwright/test";
import { getCustomerConfig, getOutsideConfig } from "../config/baseConfig";
import { BasePage } from "../way/page/BasePage";
import { VisualTargets } from "../utils/visualTargets";

test.describe("Way: Index Page Verification", () => {
  // test("Content: Should verify the Way landing page", async ({ page }) => {
  //   // 1. Create a Config according to the Customer or get a default config
  //   const wayConfig = getCustomerConfig("Way", "wayQA");
  //   // 2. Create the page object with that config
  //   const baseFlow = new BasePage(page, wayConfig);
  //   // 3. Perform basic redirection
  //   await baseFlow.goToWay();
  //   // 4. Perform a Menu Item verifications
  //   await baseFlow.verifyMenuItems();
  // });

  // test("Visual: Should verify Menu section", async ({ page }) => {
  //   // 1. Create a Config according to the Customer or get a default config
  //   const wayConfig = getCustomerConfig("Way", "wayQA");
  //   // 2. Create the page object with that config
  //   const baseFlow = new BasePage(page, wayConfig);
  //   // 3. Perform basic redirection
  //   await baseFlow.goToWay();
  //   // Wait for the navigation to be visible (more reliable than networkidle)
  //   await baseFlow.headerVisualVerification();
  // });

  // test("Visual: Should verify Hero section", async ({ page }) => {
  //   // 1. Create a Config according to the Customer or get a default config
  //   const wayConfig = getCustomerConfig("Way", "wayQA");
  //   // 2. Create the page object with that config
  //   const baseFlow = new BasePage(page, wayConfig);
  //   // 3. Perform basic redirection
  //   await baseFlow.goToWay();
  //   // Wait for the navigation to be visible (more reliable than networkidle)
  //   await baseFlow.heroVerification();
  // });

  // test("Visual: Should verify mLogo section", async ({ page }) => {
  //   // 1. Create a Config according to the Customer or get a default config
  //   const wayConfig = getCustomerConfig("Way", "wayQA");
  //   // 2. Create the page object with that config
  //   const baseFlow = new BasePage(page, wayConfig);
  //   // 3. Perform basic redirection
  //   await baseFlow.goToWay();
  //   // Wait for the navigation to be visible (more reliable than networkidle)
  //   await baseFlow.mLogoVerification();
  // });

  //  test("Visual: Should verify dataWF1 section", async ({ page }) => {
  //   // 1. Create a Config according to the Customer or get a default config
  //   const wayConfig = getCustomerConfig("Way", "wayQA");
  //   // 2. Create the page object with that config
  //   const baseFlow = new BasePage(page, wayConfig);
  //   // 3. Perform basic redirection
  //   await baseFlow.goToWay();
  //   // Wait for the navigation to be visible (more reliable than networkidle)
  //   await baseFlow.dataWF1();
  // });

  test("Visual: UTILITY AGENT", async ({ page }) => {
    // 1. Create a Config according to the Customer or get a default config
    const wayConfig = getCustomerConfig("Way", "wayQA");
    // 2. Create the page object with that config
    const baseFlow = new BasePage(page, wayConfig);
    // 3. Perform basic redirection
    await baseFlow.goToWay();
    // Close the modal popup
    await baseFlow.closePopupModal();
    // Disable animations for consistent screenshots
    await baseFlow.disableAnimation();
    // Manually Hide the Video in the background
    await baseFlow.hideBackgroundVideo();

    const targets = [
      VisualTargets.NAVIGATION_MENU,
      VisualTargets.INDEX_HERO,
      VisualTargets.M_LOGO,
      VisualTargets.DATA_WF1,
      VisualTargets.DATA_WF2,
      VisualTargets.DATA_WF3,
      VisualTargets.DATA_WF4,
    ];

    for (const target of targets) {
      await baseFlow.visualUtility(
        target.selector,
        target.snapshot,
        target.index,
      );
    }
  });

  // test("Visual: Should verify the Way index full page", async ({ page }) => {
  //   // 1. Create a Config according to the Customer or get a default config
  //   const wayConfig = getCustomerConfig("Way", "wayQA");
  //   // 2. Create the page object with that config
  //   const baseFlow = new BasePage(page, wayConfig);
  //   // 3. Perform basic redirection
  //   await baseFlow.goToWay();
  //   // Close the modal popup
  //   await baseFlow.closePopupModal();
  //   // Disable animations for consistent screenshots
  //   await baseFlow.disableAnimation();
  //   // Manually Hide the Video in the background
  //   await baseFlow.hideBackgroundVideo();
  //   // 4. Perform a fullpage verification
  //   await expect(page).toHaveScreenshot("full-page.png", {
  //     fullPage: true,
  //   });
  // });
});
