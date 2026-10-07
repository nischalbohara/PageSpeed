import { test } from "@playwright/test";
import { NRCHealthPAGES } from "../fixtures/urls.js";
import { fetchScores, appendScoresRow } from "../utils/utilityApi.js";

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
