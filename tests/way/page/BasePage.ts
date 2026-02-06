import { Locator, Page } from "@playwright/test";
import { RoleCredentials } from "../../config/baseConfig";
import { expect } from "@playwright/test";

export class BasePage {
  constructor(
    private page: Page,
    private config: { baseUrl: string } & RoleCredentials,
  ) {}

  async goToWay() {
    const page = this.page;
    await page.goto(`${this.config.baseUrl}`);
  }

  async verifyMenuItems() {
    const page = this.page;

    const navItems = [
      "About",
      "Core Platform",
      "Products",
      "Resources",
      "Request Meeting",
    ];
    // Asserts the Nav text/items on a bulk
    for (const item of navItems) {
      const navItemLocator = page.locator(
        `.wy-nav-qf-container >> text=${item}`,
      );
      await expect(navItemLocator).toContainText(item);
      await expect(navItemLocator).toBeVisible();
    }
  }

  async headerVisualVerification() {
    const page = this.page;
    const navContainer = page
      .locator(
        ".w-layout-blockcontainer.wy-nav__container.wy-nav__container--secondary.w-container",
      )
      .first();
    await navContainer.waitFor({ state: "visible", timeout: 10000 });

    // Close any modal/popup that might appear
    await this.closePopupModal();

    // Disable animations for consistent screenshots
    this.disableAnimation();

    // Manually Hide the Video in the background
    this.hideBackgroundVideo();

    // Take screenshot and compare with baseline
    await this.compareScreenshot(navContainer, "navigation-menu.png", 100, 0.3);
  }

  // Visual Verification of Hero section
  async heroVerification() {
    const page = this.page;
    const heroContainer = page.locator(".home_hero_content-container").first();
    await heroContainer.waitFor({ state: "visible", timeout: 10000 });

    // Close the modal popup
    await this.closePopupModal();

    // Disable animations for consistent screenshots
    this.disableAnimation();

    // Manually Hide the Video in the background
    this.hideBackgroundVideo();

    // Take screenshot and compare with baseline
    await this.compareScreenshot(heroContainer, "index-hero.png", 100, 0.3);
  }

  // Visual Verification of Hero section
  async mLogoVerification() {
    const page = this.page;
    const mLogoContainer = page.locator(".m-logos.bg-light").first();
    await mLogoContainer.waitFor({ state: "visible", timeout: 10000 });

    // Close the modal popup
    await this.closePopupModal();

    // Disable animations for consistent screenshots
    this.disableAnimation();

    // Manually Hide the Video in the background
    this.hideBackgroundVideo();

    // Take screenshot and compare with baseline
    await this.compareScreenshot(mLogoContainer, "m-logo.png", 100, 0.3);
  }

  // First Data-WF Verification
  async dataWF1() {
    const page = this.page;
    const dataWFContainer = page
      .locator('section[data-wf--section-2col--style-expand-body-copy="base"]')
      .first();
    await dataWFContainer.waitFor({ state: "visible", timeout: 10000 });

    // Close the modal popup
    await this.closePopupModal();

    // Disable animations for consistent screenshots
    this.disableAnimation();

    // Manually Hide the Video in the background
    this.hideBackgroundVideo();

    // Take screenshot and compare with baseline
    await this.compareScreenshot(dataWFContainer, "data-wf1.png", 100, 0.3);
  }

  // Utility Visual Verification
  // Trying to lighten out the load of multiple modules
  async visualUtility(selector: string, snapShot: string, index: number) {
    console.log("Visual Test for: ", snapShot);
    const page = this.page;
    const dataWFContainer = page.locator(selector).nth(index);
    await dataWFContainer.waitFor({ state: "visible", timeout: 10000 });

    // Take screenshot and compare with baseline
    await this.compareScreenshot(dataWFContainer, snapShot, 100, 0.3);
  }

  async compareScreenshot(
    container: Locator,
    screenshotName: string,
    maxDiffPixels: number = 100,
    threshold: number = 0.2,
  ) {
    await expect(container).toHaveScreenshot(screenshotName, {
      maxDiffPixels: maxDiffPixels,
      threshold: threshold,
    });
  }

  async closePopupModal() {
    const page = this.page;
    // Close the modal popup
    const closeButton = page.locator("#popup-banner-close");
    await closeButton.click();
    await page.waitForTimeout(500); // Wait for modal to fully disappear
  }

  async disableAnimation() {
    const page = this.page;
    await page.addStyleTag({
      content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
    });
  }

  async hideBackgroundVideo() {
    const page = this.page;
    await page.addStyleTag({
      content: `
    .hero-video.w-embed,
    ._w-100.h-100.w-embed,
    .section_vid-autoplay.bg-lt-grey,
    .row.m-three-col-image-card__row {
      display: none !important;
      visibility: hidden !important;
    }
  `,
    });
  }
}
