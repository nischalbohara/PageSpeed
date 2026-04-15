import { test } from "@playwright/test";
import fs from "fs";
import path from "path";

const TARGET_CLASSES: string[] = [
  "template-bundle",
  "template-gift-card",
  "template-p2",
  "template-p3",
  "template-p4",
  "template-p5",
  "template-pdp-test",
  "template-no-what-fits",
  "template-no-what-fits-quote",
  "template-nowhatfitsnew",
];

test("Categorize URLs based on body tag class", async ({ browser }) => {
  test.setTimeout(3000000);

  // Read urls.json
  const jsonPath = path.resolve(__dirname, "urls.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`urls.json not found at: ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const parsed = JSON.parse(rawData);
  const urlList: string[] = Array.isArray(parsed) ? parsed : parsed.urls;

  console.log(`\n✅ Loaded ${urlList.length} URLs from urls.json`);
  console.log(`🔍 Searching for ${TARGET_CLASSES.length} target classes...\n`);

  const results: Record<string, string[]> = {};
  for (const cls of TARGET_CLASSES) {
    results[cls] = [];
  }

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i].trim();
    if (!url) continue;

    console.log(`[${i + 1}/${urlList.length}] ${url}`);

    // Open a fresh page for every URL to avoid stale context
    const page = await browser.newPage();

    try {
      // Block unnecessary resources on this fresh page
      await page.route("**/*", (route) => {
        const blockedTypes = ["image", "media", "font", "stylesheet"];
        const blockedDomains = [
          "google-analytics",
          "googletagmanager",
          "facebook",
          "hotjar",
          "klaviyo",
          "segment",
          "tiktok",
        ];
        const reqUrl = route.request().url();
        const type = route.request().resourceType();

        if (
          blockedTypes.includes(type) ||
          blockedDomains.some((d) => reqUrl.includes(d))
        ) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait until body classes are populated by JS (max 8s)
      await page
        .waitForFunction(
          (targets) => {
            const classes = Array.from(document.body.classList);
            return (
              classes.some((c) => targets.includes(c)) || classes.length > 2
            );
          },
          TARGET_CLASSES,
          { timeout: 8000 },
        )
        .catch(() => {
          // No target class found within timeout — that's fine, move on
        });

      const bodyClasses: string[] = await page.evaluate(() =>
        Array.from(document.body.classList),
      );

      console.log(`  → [${bodyClasses.join(", ")}]`);

      let matched = false;
      for (const targetClass of TARGET_CLASSES) {
        if (bodyClasses.includes(targetClass)) {
          console.log(`  ✓ Matched: "${targetClass}"`);
          results[targetClass].push(url);
          matched = true;
        }
      }

      if (!matched) {
        console.log(`  — No target class found`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.log(`  ✗ ERROR: ${message}`);
    } finally {
      // Always close the page to free memory
      await page.close();
    }
  }

  // Write CSVs
  console.log("\n--- WRITING CSV FILES ---");
  for (const cls of TARGET_CLASSES) {
    const urls = results[cls];
    const outputPath = path.resolve(__dirname, `${cls}.csv`);
    fs.writeFileSync(outputPath, urls.join("\n"), "utf-8");
    console.log(`  ${cls}.csv → ${urls.length} URL(s)`);
  }

  console.log("\n========== SUMMARY ==========");
  for (const cls of TARGET_CLASSES) {
    console.log(`  ${cls}: ${results[cls].length} URL(s)`);
  }
  console.log("==============================");
  console.log("✅ Done!");
});
