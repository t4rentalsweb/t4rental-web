## T4 Rentals — High level developer README

This repo is a small static site that dynamically loads data from published Google Sheets and a GCS image bucket. The client-side JavaScript fetches CSV exports, parses them, and renders lists of cards for properties, customer reviews, and local businesses.

This README explains where data comes from, how it's loaded and cached, and how pages consume that data so a new dev can make changes quickly.

### Deployment

This site is deployed to GitHub Pages using GitHub Actions. The deployment workflow stored in /.github/workflows:

1. **Base URL substitution**: The `__BASE_URL__` placeholder in `index.html` and all files in `/pages/` is replaced with the appropriate base URL (base url:  `/t4rental-web/`, stored in settings >> secrets & variables >> variables) during the build process. 

2. **Configuration secrets**: Environment secrets and variables stored in GitHub repository secrets are used to replace template variables in `assets/config.json`:
   - `WEB3API_K` → `{WEB3API_K}`
   - `PROPERTIESSHEETURL` → `{PROPERTIESSHEETURL}`
   - `CUSTOMERREVIEWSURL` → `{CUSTOMERREVIEWSURL}`
   - `BUSINESSESSHEETURL` → `{BUSINESSESSHEETURL}`

3. **Build and deploy**: The GitHub Actions workflow runs on commits to `main`, substitutes all placeholders, and deploys the static site to GitHub Pages.

### Quick overview

- **Base URL**: The `<base href="__BASE_URL__" />` tag in `index.html` and page files is dynamically set during deployment to ensure relative URLs work correctly on GitHub Pages. This is automatically updated by the GitHub Actions workflow.
- Entry: `index.html` is the home page. It includes `/assets/js/main.js` which is responsible for loading configuration and property data, and for injecting the header and footer partials.
- Data sources: Google Sheets published as CSV and configured in `assets/config.json`.
- Images: Stored in a Google Cloud Storage bucket. The bucket name is in `assets/config.json`.
- UI: Each entity (property, review, business) is rendered as a card. There are dedicated JS modules that render cards and wait for data to be available.

### Important files

- `assets/config.json` — primary config template. Template variables (e.g. `{WEB3API_K}`) are replaced by GitHub Actions during deployment using repository secrets. Keys used by the app:
  - `propertiesSheetUrl` — CSV URL for properties (replaced from `PROPERTIESSHEETURL` secret)
  - `customerReviewsUrl` — CSV URL for customer reviews (replaced from `CUSTOMERREVIEWSURL` secret)
  - `businessesSheetUrl` — CSV URL for businesses (replaced from `BUSINESSESSHEETURL` secret)
  - `image_bucket` — GCS bucket name used to build image URLs
  - `web3FormsKey` — third-party key used for contact forms (replaced from `WEB3API_K` secret) manages emails sent.

- `assets/js/main.js` — loads `assets/config.json`, fetches and parses the properties CSV, converts image filename lists to full GCS URLs, and stores data in `sessionStorage` and `window` globals.

- `assets/js/featured-properties.js` — creates and injects featured property cards on the home page. It waits for `PROPERTY_DATA` in sessionStorage.

- `assets/js/customer-reviews.js` — fetches and renders customer reviews. It waits for `CONFIG_DATA` then fetches the reviews CSV and caches it.

- `assets/js/community.js` — fetches and renders businesses and handles business details (used on the community page and home featured list).

- `assets/js/resedential.js` and `assets/js/commercial.js` — render full property lists for each category (residential/commercial). They rely on `PROPERTY_DATA` prepared by `main.js`.

- `partials/header.html` and `partials/footer.html` — injected into pages by `main.js` via `loadPages()`.

### How data loading works (runtime flow)

1. On page load the site includes `assets/js/main.js` which runs `initPages()`.
2. `initPages()` decides whether to refresh data by checking `sessionStorage.SESSION_TIME` and a `sessionExpired()` check. If expired or missing, `refreshData()` runs.
3. `refreshData()` calls `getConfig()` which fetches `/assets/config.json` (versioned to bust cache). `getConfig()` stores the parsed config in `sessionStorage.CONFIG_DATA` and `window.config`.
4. `refreshData()` then calls `loadPropertyData()` which fetches the CSV from `config.propertiesSheetUrl`, parses it using PapaParse, and normalizes image URLs using `config.image_bucket` and the row's `IMAGEFOLDER` + `IMAGENAMES` fields. The result is stored in `sessionStorage.PROPERTY_DATA` and `window.propertyData`.
5. After initial data is loaded, other modules wait for either `CONFIG_DATA` or `PROPERTY_DATA` to be present in `sessionStorage` (they poll in short intervals). When available they render their cards.

Notes on caching: data is cached to `sessionStorage` and a `SESSION_TIME` timestamp is set. By default, session expiration logic treats data older than a short window as stale and will refresh on the next load.

### Data shape and CSV expectations

Properties CSV (expected columns used by the code, may be adjusted since posting this):

- `ID` — unique identifier
- `TITLE` — property title shown on cards
- `STATUS` — string like `open`, `closed`, `soon`, `inactive` (controls visibility and badges)
- `IMAGEFOLDER` — folder name in the GCS bucket
- `IMAGENAMES` — comma-separated filenames (main.js will convert these to full URLs and replace the field with an array of URLs)
- `FEATURED` — `TRUE` shows the property on the home page
- `COMMERCIAL` / `RESIDENTIAL` — `TRUE` toggles which listing page the property appears on

Customer reviews CSV (columns expected):

- `ID`, `NAME`, `TEXT`, `STARS` (1-5)

Businesses CSV (columns expected):

- `ID`, `NAME`, `HEADER`, `DETAILS`, `IMAGEFOLDER`, `IMAGENAME`, `FEATURED`, and optional contact fields like `PHONE`, `EMAIL`, `WEB-LINK`.

If you publish the Google Sheet as CSV, use the published URL and set it in `assets/config.json`.

### How pages consume data

- Home (`index.html`): shows a subset (featured) of properties, a subset of customer reviews, and featured businesses. It relies on `featured-properties.js`, `customer-reviews.js`, and `community.js`.
- Residential (`pages/resedential.html`): shows the full residential property listing. The page contains a `data-page="resedential"` attribute and uses `resedential.js` to render a full list filtered by `RESIDENTIAL` flag.
- Commercial (`pages/commercial.html`): same as residential but filtered by `COMMERCIAL`.
- Community (`pages/community.html`): shows businesses and a detail pane. Clicking a business card on other pages may navigate here with `?biz=<ID>` to show the detail.
- Contact / About (`pages/contact.html`, `pages/about.html`): mostly static with a small contact form. `assets/js/contact.js` integrates the third-party form key from `config.json`.

### Card components

Each entity is represented by a simple HTML card constructed in JS and injected into a container element:

- Property cards — created in `featured-properties.js` and the per-page listing scripts; they include an image, title, and a status badge.
- Review cards — rendered by `customer-reviews.js` and show quote text, rating stars, and author name.
- Business cards — rendered by `community.js` and include an image, short header, and details. Clicking a card shows a detail view.

### Developer notes and tips

- To update data: publish your Google Sheet (File → Publish to web → CSV) and paste the CSV URL into `assets/config.json`.
- To add images: upload into folders inside the GCS bucket named by `image_bucket`. Set each property's `IMAGEFOLDER` and `IMAGENAMES` (comma-separated) in the CSV. `main.js` will map these to `https://storage.googleapis.com/<bucket>/<folder>/<file>`.
- Cache behavior: session storage is used to improve perceived load times. Clear `sessionStorage` in your browser devtools during development if you need to force a fresh load.
- Partial HTML: the header and footer are in `partials/header.html` and `partials/footer.html` and are injected at runtime by `main.js`.
- Styling: component styles live under `assets/css/` (card styles, customer reviews, business-card, etc.).

### Troubleshooting

- Missing data on the page: open DevTools → Application → Session Storage and confirm `CONFIG_DATA` and `PROPERTY_DATA` exist.
- CSV parse errors: check that the published CSV has the expected header row and no stray characters; PapaParse is used for parsing.
- Images not loading: confirm the GCS bucket name in `assets/config.json` and that `IMAGEFOLDER` + `IMAGENAMES` match the bucket structure.

### Local development

To run this site locally:

1. Edit `assets/config.json` and replace template variables with actual values:
   - Replace `{WEB3API_K}` with your Web3 Forms API key
   - Replace `{PROPERTIESSHEETURL}`, `{CUSTOMERREVIEWSURL}`, `{BUSINESSESSHEETURL}` with your published CSV URLs

2. Optionally update the `<base href="__BASE_URL__" />` in `index.html` and page files:
   - For local development, you can use `href="/"` (local root)
   - For GitHub Pages deployments, the Actions workflow will automatically set this to the correct repository path

3. Serve the files locally (e.g., `python -m http.server 8000` or use VS Code's Live Server extension)

**Note**: GitHub Actions automatically handles both the base URL substitution and config variable replacement on every push to `main`, so you should not commit actual secret values to the repository.

### Where to look to extend functionality

- To change card templates, edit the JS modules in `assets/js/` (they return HTML strings for injection).
- To change data refresh rules, edit `sessionExpired()` and related logic in `assets/js/main.js`.
