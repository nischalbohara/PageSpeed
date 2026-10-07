const { test } = require("@playwright/test");
const { NRCHealthPAGES } = require("../fixtures/urls");
const { runPageSpeedTest } = require("../utils/utilityWeb");

test.describe("PageSpeed screenshots + scores", () => {
  test.setTimeout(360_000); // PageSpeed analysis can take up to ~6 min per page

  NRCHealthPAGES.forEach(({ name, url }) => {
    test(`PageSpeed: ${name}`, async ({ page }) => {
      await runPageSpeedTest(page, url, name);
    });
  });
});
