import { test, expect } from "@playwright/test";

test.describe("CGH: Visual testing and Verification", () => {
  test("Visual: Compare Old Landing Page vs New Landing Page", async ({
    page,
  }) => {
    // Old Snapshot
    await page.goto(
      "https://cgh-headless-git-refact-migrate-to-next-js-outsidetech.vercel.app/",
      // dev
    );
    await page.addStyleTag({
      content: `
      .absolute.-bottom-15 {
        display: none !important;
        visibility: hidden !important;
      }
    `,
    });
    await page.waitForSelector(".relative.block.w-full");
    await expect(page).toHaveScreenshot(["cgh", "old-full-page.png"], {
      fullPage: true,
      mask: [
        // page.locator('img[data-nimg]'),
        // page.locator(".sm:inline.mt-1.25.text-dark-gray"),
        page.locator(".relative.block.w-full"),
      ],
    });
    // New Snapshot
    await page.goto(
      "https://hwlthrbsxzd9fagxcy9gayhxl.js.wpenginepowered.com/",
      // stg
    );
    await page.addStyleTag({
      content: `
      #peacock {
        display: none !important;
        visibility: hidden !important;
      }
    `,
    });
    await page.waitForSelector(
      "section.pageContent--workThumbnails.js-fade__quick img",
    );
    await expect(page).toHaveScreenshot(["cgh", "new-full-page.png"], {
      fullPage: true,
      mask: [
        // page.locator(".workThumbnail"),
        page.locator("section.pageContent--workThumbnails.js-fade__quick img"),
        page.locator(".workThumbnail--projectInformation.hasSubtitle"),
      ],
    });
  });
});
