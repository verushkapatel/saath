const CACHE = "saath-v4";
const PRECACHE = [
  "/",
  "/scan",
  "/money-lab",
  "/guide",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/locales/en.json",
  "/locales/hi.json",
  "/locales/mr.json",
  "/content/daily-questions.json",
  "/content/cases.json",
  "/content/guide.json",
  "/content/glossary.json",
  "/samples/personal-loan.png",
  "/samples/gold-loan.png",
  "/samples/scheme-form.png",
  "/guide/budget",
  "/guide/needs-wants",
  "/guide/pay-yourself",
  "/guide/what-interest",
  "/guide/simple-compound",
  "/guide/what-emi",
  "/guide/flat-reducing",
  "/guide/fees",
  "/guide/prepayment",
  "/guide/credit-score",
  "/guide/reading-agreement",
  "/guide/upi-safety",
  "/guide/otp-pin",
  "/guide/fake-loan-apps",
  "/guide/job-scams",
  "/guide/what-insurance",
  "/guide/health-cover",
  "/guide/emergency-fund",
  "/guide/where-savings",
  "/guide/what-sip",
  "/guide/inflation",
  "/guide/tax-basics",
  "/guide/why-pan",
  "/guide/reading-fees",
  "/guide/before-you-sign",
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
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
  );
});
