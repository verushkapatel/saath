// Saath service worker. Written to public/sw.js by scripts/sync-static.mjs. Edit the template, not the output.
const CACHE = "saath-v11";
// Works at the site root and in a sub-folder (for example /saath/ on GitHub Pages).
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const PAGES = [
/*PAGES*/
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
  "/content/comic.json",
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
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
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
