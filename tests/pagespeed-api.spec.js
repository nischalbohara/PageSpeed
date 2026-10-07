const { test } = require("@playwright/test");
const { NRCHealthPAGES } = require("../fixtures/urls");
const { fetchScores, appendScoresRow } = require("../utils/utilityApi");

test.describe("PageSpeed API scores", () => {
  test.setTimeout(300_000); // PSI API can be slow on large pages

  NRCHealthPAGES.forEach(({ name, url }) => {
    test(`API scores: ${name}`, async () => {
      const desktop = await fetchScores(url, "desktop");
      const mobile = await fetchScores(url, "mobile");
      appendScoresRow(name, url, desktop, mobile);
    });
  });
});
