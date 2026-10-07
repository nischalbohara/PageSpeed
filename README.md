# Playwright PageSpeed Test Suite

Automated PageSpeed Insights testing built on [Playwright Test](https://playwright.dev/docs/intro).
Two independent specs measure the **same list of pages**:

| Spec                          | What it does                                                                                                                                                                        | Output                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `tests/pagespeedcsv.spec.js`  | Drives the [pagespeed.web.dev](https://pagespeed.web.dev/) UI: runs Lighthouse, scrapes scores + Core Web Vitals, screenshots the Mobile & Desktop tabs, uploads PNGs to Cloudinary | `reports/pagespeed-ui.csv` + `fixtures/screenshots/<page>/*.png` |
| `tests/pagespeed-api.spec.js` | Calls the [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) directly for desktop + mobile                                                  | `reports/pagespeed-api.csv`                                      |

Everything is plain JavaScript (CommonJS) — no build step, no TypeScript.

---

## 1. Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm
- A Chromium browser installed by Playwright (`npx playwright install`)

## 2. Installation

```bash
git clone git@github.com:mahrosan/playwright-outside.git
cd playwright-outside
npm install
npx playwright install chromium
```

## 3. Environment Variables

Copy the template and fill in real values:

```bash
cp .env.example .env
```

`.env` is loaded automatically by `playwright.config.js` (via `dotenv`).

| Key                     | Required by             | Description                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PS_APIKEY`             | `pagespeed-api.spec.js` | Google PageSpeed Insights API key. **Without it the anonymous quota is exhausted almost immediately (HTTP 429).** Get one from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with the _PageSpeed Online API_ enabled. |
| `CLOUDINARY_CLOUD_NAME` | `pagespeedcsv.spec.js`  | Cloudinary cloud name — screenshot uploads fail without it.                                                                                                                                                                                           |
| `CLOUDINARY_API_KEY`    | `pagespeedcsv.spec.js`  | Cloudinary API key.                                                                                                                                                                                                                                   |
| `CLOUDINARY_API_SECRET` | `pagespeedcsv.spec.js`  | Cloudinary API secret.                                                                                                                                                                                                                                |

> The UI spec still records scores and local PNGs even if a Cloudinary upload fails the test —
> fix the credentials first if screenshots are required in the CSV.

---

## 4. Project Structure

```
PLAYWRIGHT_OUTSIDE/
├── playwright.config.js         # Playwright config: chromium, workers, retries, reporter
├── package.json                 # Scripts + dependencies (only cloudinary, dotenv, prettier)
│
├── fixtures/                    # Test data & generated test assets
│   ├── urls.js                  # NRCHealthPAGES — the shared page list used by BOTH specs
│   └── screenshots/             # PNG output, one folder per page (gitignored)
│       └── homepage/
│           ├── homepage_mobile.png
│           └── homepage_desktop.png
│
├── tests/                       # Test specs (Playwright only scans this folder)
│   ├── pagespeedcsv.spec.js     # UI flow: pagespeed.web.dev → screenshots + scores
│   └── pagespeed-api.spec.js    # API flow: PSI API → desktop/mobile scores
│
├── utils/                       # Shared helpers (outside tests/, so never collected as specs)
│   ├── utilityWeb.js            # Navigation, Lighthouse wait, score scraping, screenshots, CSV
│   └── utilityApi.js            # PSI API fetch + CSV append
│
├── reports/                     # CSV output (gitignored)
│   ├── pagespeed-ui.csv         # written by pagespeedcsv.spec.js
│   └── pagespeed-api.csv        # written by pagespeed-api.spec.js
│
├── playwright-report/           # HTML report (gitignored)
├── test-results/                # Traces & failure screenshots (gitignored)
├── .env.example                 # Environment template
└── .github/workflows/playwright.yml   # CI pipeline
```

---

## 5. Running the Tests

```bash
# Everything (both specs)
npm test

# UI flow only — PageSpeed screenshots + scores
npm run test:screenshots

# API flow only — desktop/mobile scores
npm run test:api

# Interactive Playwright UI (pick tests, watch runs, time travel)
npm run test:ui

# Open the HTML report from the last run
npm run report

# Format all source files with Prettier
npm run format
```

Useful one-offs:

```bash
# A single test by title
npx playwright test tests/pagespeedcsv.spec.js -g "Homepage"

# One spec, headed browser, no retries
npx playwright test tests/pagespeedcsv.spec.js --headed --retries=0

# Debug mode (step through, inspector opens)
npx playwright test tests/pagespeed-api.spec.js --debug
```

---

## 6. How Each Spec Works

### `tests/pagespeedcsv.spec.js` (UI flow)

For every entry in `fixtures/urls.js`:

1. Open `https://pagespeed.web.dev/` and dismiss the cookie banner.
2. Paste the target URL into the input and press Enter.
3. Wait for **both** Lighthouse reports (mobile + desktop) to finish — up to 4 minutes;
   bails out early if the page shows an error message.
4. Read scores (performance, accessibility, best practices, SEO) and Core Web Vitals
   (FCP, LCP, TBT, CLS, Speed Index) for both devices from the in-page Lighthouse JSON.
5. Switch to the **Mobile** tab → full-page screenshot → upload to Cloudinary → keep the URL.
6. Repeat for the **Desktop** tab.
7. Append one row to `reports/pagespeed-ui.csv`.

Timeout: **6 minutes per test** (`test.setTimeout(360_000)`).

### `tests/pagespeed-api.spec.js` (API flow)

For every entry in `fixtures/urls.js`:

1. `GET` the PSI API with `strategy=desktop`.
2. `GET` the PSI API with `strategy=mobile`.
3. Append one row with both sets of scores to `reports/pagespeed-api.csv`.

Timeout: **5 minutes per test** (`test.setTimeout(300_000)`).
Failures (429 quota, invalid key, network) fail the test and surface the API's own error message.

---

## 7. Output & CSV Schemas

### `fixtures/screenshots/<page>/`

`<page>` is the sanitized test name (`Page name` → lowercase, non-alphanumerics → `_`), containing:

- `<page>_mobile.png`
- `<page>_desktop.png`

The same two PNGs are uploaded to the Cloudinary folder `FoundEnergyPages-test`; their
`https://res.cloudinary.com/...` URLs land in the CSV's last two columns.

### `reports/pagespeed-ui.csv`

| Column group | Columns                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity     | `Page`, `URL`                                                                                                                                                                  |
| Desktop      | `Performance`, `Accessibility`, `Best Practices`, `SEO`, `First Contentful Paint`, `Largest Contentful Paint`, `Total Blocking Time`, `Cumulative Layout Shift`, `Speed Index` |
| Mobile       | same 9 columns with a `Mobile` prefix                                                                                                                                          |
| Media        | `Mobile Screenshot`, `Desktop Screenshot` (Cloudinary URLs)                                                                                                                    |

Scores are `0–100` integers; metrics are display strings (e.g. `0.8 s`, `1,750 ms`).

### `reports/pagespeed-api.csv`

`Page`, `URL`, `Desktop Score`, `Performance`, `Accessibility`, `Best Practices`, `SEO`,
`Mobile Score`, `Performance (Mobile)`, `Accessibility (Mobile)`, `Best Practices (Mobile)`, `SEO (Mobile)`

Scores are `0–100` integers; `Score` equals the performance score for that strategy.

> Both CSVs get a header the first time they are written and are **appended to** on every
> subsequent run. Delete the file to start fresh.

---

## 8. Configuration (`playwright.config.js`)

| Option          | Value                                                           | Why                                                                            |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `testDir`       | `./tests`                                                       | Only specs in `tests/` are collected; `utils/` and `fixtures/` are ignored     |
| `fullyParallel` | `true`                                                          | Every page is independent                                                      |
| `workers`       | `4`                                                             | 4 pages analysed at once (raise/lower to trade speed vs. PageSpeed throttling) |
| `retries`       | `1`                                                             | One retry covers transient PageSpeed/API hiccups                               |
| `timeout`       | `30 s`                                                          | Default per test; each spec raises its own budget with `test.setTimeout`       |
| `reporter`      | `list` + `html`                                                 | Console output + `playwright-report/`                                          |
| `use`           | Chromium, 1280×800, screenshot on failure, trace on first retry | Deterministic viewport; traces for debugging                                   |

---

## 9. Adding Pages to Test

Edit `fixtures/urls.js` — both specs pick the change up automatically:

```js
const NRCHealthPAGES = [
  { name: "Homepage", url: "https://nrchealth.com/" },
  { name: "Pricing", url: "https://nrchealth.com/pricing/" }, // ← add here
];

module.exports = { NRCHealthPAGES };
```

Rules: `name` must be unique (it becomes the screenshot folder and the CSV's first column).

---

## 10. CI/CD (`.github/workflows/playwright.yml`)

Runs on pushes to `main`, PRs, a nightly cron, and manual dispatch:

1. `npm ci` → cache + `npx playwright install --with-deps chromium`
2. `npx playwright test` (both specs)
3. Upload `playwright-report/` and `reports/` as artifacts (30 days)
4. Post the run status to Slack

**Repository secrets used:** `PS_APIKEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`.

---

## 11. Troubleshooting

| Symptom                                                       | Cause / fix                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `PageSpeed API (…) failed … Quota exceeded … Queries per day` | Missing/expired `PS_APIKEY`, or the key's daily quota is used up. Add the key to `.env` or wait for quota reset.            |
| `Cloudinary upload failed` / tests fail at screenshot step    | `CLOUDINARY_*` values missing or wrong in `.env`.                                                                           |
| Test fails after 6 min on `waitForLighthouseData`             | PageSpeed was slow or the target URL failed analysis. Re-run just that test; PageSpeed occasionally needs a second attempt. |
| Scores show `N/A`                                             | The report page didn't expose the Lighthouse JSON (error state). Check the failure screenshot/trace.                        |
| Old columns in a CSV                                          | The schema changed — delete `reports/*.csv` so a fresh header is written.                                                   |
| Nothing to run / 0 tests                                      | Make sure specs keep the `.spec.js` suffix and stay inside `tests/`.                                                        |

Debug any failure with its trace:

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```
