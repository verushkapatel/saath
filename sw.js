// Saath service worker. Written to public/sw.js by scripts/sync-static.mjs. Edit the template, not the output.
const CACHE = "saath-v15";
// Works at the site root and in a sub-folder (for example /saath/ on GitHub Pages).
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const PAGES = [
  "/",
  "/journey",
  "/guide",
  "/money-lab",
  "/forms",
  "/forms/explain",
  "/stories",
  "/ai",
  "/progress",
  "/settings",
  "/scan",
  "/paths",
  "/privacy",
  "/privacy/partners",
  "/about",
  "/admin",
  "/check",
  "/drills",
  "/handbook",
  "/journey/first-job",
  "/journey/first-bank-account",
  "/journey/first-income",
  "/journey/early-adulthood",
  "/journey/saving",
  "/journey/insurance",
  "/journey/government-benefits",
  "/journey/first-goal",
  "/journey/tracking-spending",
  "/journey/receipt",
  "/journey/subscription-trap",
  "/journey/rent-lifestyle",
  "/journey/investing",
  "/journey/market-fall",
  "/journey/financial-security",
  "/journey/scam-consequences",
  "/journey/medical-expense",
  "/journey/money-tight",
  "/journey/borrowing",
  "/journey/bad-loan-offer",
  "/journey/loan-repayment",
  "/journey/job-loss",
  "/journey/recovery",
  "/journey/fraud-attempt",
  "/journey/financial-reset",
  "/journey/budgeting",
  "/journey/moving-home",
  "/journey/family-finances",
  "/journey/insurance-review",
  "/journey/taxes",
  "/journey/important-documents",
  "/journey/government-form",
  "/journey/kyc",
  "/journey/gold-loan",
  "/journey/children",
  "/journey/long-term-planning",
  "/journey/family-emergency",
  "/journey/helping-relative",
  "/journey/long-term-investing",
  "/journey/security-review",
  "/journey/thinking-retirement",
  "/journey/retirement-plan",
  "/journey/late-life-shock",
  "/journey/retirement",
  "/journey/verena-looks-back",
  "/forms/savings-account",
  "/forms/kyc-update",
  "/forms/nomination",
  "/forms/pan-application",
  "/forms/no-pan-declaration",
  "/forms/salary-tds-certificate",
  "/forms/no-tds-declaration",
  "/forms/loan-kfs",
  "/forms/gold-loan",
  "/forms/insurance-proposal",
  "/forms/jan-suraksha",
  "/forms/atal-pension",
  "/forms/sukanya-samriddhi",
  "/forms/epf-joining",
  "/forms/itr-1",
  "/forms/health-claim",
  "/forms/epf-claim",
  "/forms/ppf-account",
  "/forms/credit-card",
  "/forms/ayushman-card",
  "/drills/scam",
  "/drills/form",
  "/drills/price",
  "/drills/stories",
  "/guide/budget",
  "/guide/needs-wants",
  "/guide/pay-yourself",
  "/guide/true-cost",
  "/guide/subscription-traps",
  "/guide/lending-friends",
  "/guide/emergency-fund",
  "/guide/first-bank-account",
  "/guide/bank-charges",
  "/guide/money-missing",
  "/guide/why-pan",
  "/guide/payment-proof",
  "/guide/credit-score",
  "/guide/upi-safety",
  "/guide/otp-pin",
  "/guide/tax-basics",
  "/guide/what-insurance",
  "/guide/health-cover",
  "/guide/pay-later",
  "/guide/guarantor",
  "/guide/what-interest",
  "/guide/what-emi",
  "/guide/flat-reducing",
  "/guide/fees",
  "/guide/reading-fees",
  "/guide/reading-agreement",
  "/guide/before-you-sign",
  "/guide/prepayment",
  "/guide/fake-loan-apps",
  "/guide/scam-calls",
  "/guide/job-scams",
  "/guide/double-money",
  "/guide/inflation",
  "/guide/simple-compound",
  "/guide/what-sip",
  "/guide/where-savings",
  "/guide/who-keeps-safe",
  "/guide/salary-slip",
  "/guide/kyc-basics",
  "/guide/nominee-matters",
  "/guide/govt-schemes",
  "/guide/family-money",
  "/guide/children-planning",
  "/guide/risk-diversify",
  "/guide/retirement-basics",
  "/money-lab/case/hidden-fees",
  "/money-lab/case/gold-emergency",
  "/money-lab/case/upi-pin",
  "/money-lab/case/blank-form",
  "/money-lab/case/store-emi",
  "/money-lab/case/whatsapp-tip",
  "/money-lab/case/fest-card",
  "/money-lab/case/room-deposit",
  "/money-lab/case/insurance-missold",
  "/money-lab/case/payday-app",
  "/money-lab/case/two-education-loans",
  "/money-lab/case/festival-spend",
  "/paths/first-budget",
  "/paths/emergency-jar",
  "/paths/spend-smart",
  "/paths/bank-visit",
  "/paths/salary-slip",
  "/paths/missing-money",
  "/paths/upi-without-fear",
  "/paths/loan-scam",
  "/paths/first-loan-paper",
  "/paths/scholarship-safely",
  "/paths/scam-shield",
  "/paths/borrow-wisely",
  "/paths/grow-savings",
];
const FILES = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/skyward-logo.png",
  "/locales/en.json",
  "/locales/hi.json",
  "/locales/mr.json",
  "/locales/gate.json",
  "/content/daily-questions.json",
  "/content/cases.json",
  "/content/guide.json",
  "/content/glossary.json",
  "/content/paths.json",
  "/content/finlit-check.json",
  "/content/drills.json",
  "/content/journey.json",
  "/content/forms.json",
  "/content/challenges.json",
  "/content/form-fields.json",
  "/content/stories.json",
  "/samples/personal-loan.png",
  "/samples/gold-loan.png",
  "/samples/scheme-form.png",
];
// Large files that are kept once fetched: fonts, built scripts, and the OCR engine and its language data.
const KEEP = /\/(_next\/static|tessdata|tesseract)\//;

const at = (path) => BASE + path.replace(/^\//, "");

// A static host answers /guide with a redirect to /guide/. A redirected response cannot be replayed
// for a page load, so keep a plain copy, under both addresses.
async function plain(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
}

// Pages name the scripts, styles and fonts they need. Saving those too means a page that was
// never opened before still works with no connection.
const seen = new Set();
async function saveAssets(cache, text, depth) {
  const found = text.match(/[^"'()\s\\]*\/_next\/static\/[^"'()\s\\]+/g) || [];
  await Promise.all([...new Set(found)].map(async (raw) => {
    const url = new URL(raw.startsWith("/") ? raw : "/" + raw, self.location.origin).href;
    if (seen.has(url)) return;
    seen.add(url);
    try {
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (!response.ok) return;
      // Stylesheets name the font files. Follow them one level down.
      if (depth > 0 && url.endsWith(".css")) await saveAssets(cache, await response.clone().text(), depth - 1);
      await cache.put(url, response);
    } catch {
      // One missing file must not stop the rest.
    }
  }));
}

async function save(cache, url, isPage) {
  const response = await fetch(url);
  if (!response.ok) return;
  const finalUrl = response.url;
  const copy = await plain(response);
  if (isPage) await saveAssets(cache, await copy.clone().text(), 1);
  if (finalUrl && finalUrl !== new URL(url, self.location.href).href) await cache.put(finalUrl, copy.clone());
  await cache.put(url, copy);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // One missing page must not stop the rest from being saved.
      Promise.all([
        ...PAGES.map((path) => save(cache, at(path), true).catch(() => undefined)),
        ...FILES.map((path) => save(cache, at(path), false).catch(() => undefined)),
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Only Saath's own old caches are removed. The local AI model (WebLLM) keeps its files in caches of its own,
    // and deleting those would force a download of hundreds of megabytes again.
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("saath-") && key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(BASE + "api/")) return;

  // Fonts, scripts and OCR data never change under the same name: serve the saved copy first.
  if (KEEP.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
    return;
  }

  // Everything else: fresh when there is a connection, saved copy when there is not.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(async (cache) => cache.put(request, await plain(copy)));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match(at("/"))),
      ),
  );
});
