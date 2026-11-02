// Hand-written service worker: cache-first for hashed static assets, sounds and icons,
// network-first (with cached fallback) for pages, never caches the API.
// While online the app also asks it to download the pages around the student's current level
// (plus the scripts, styles and fonts they use), so the game keeps working with no internet.
const VERSION = "v2";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const PRAISE = ["mashallah", "ahsant", "rae3", "mumtaz", "allahuakbar", "barakallah", "win1", "win2", "win3"].map((id) => `/sounds/praise/${id}.mp3`);
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/192", "/icons/512", ...PRAISE];
/** Must match PREFETCH_HEADER in src/server/services/offline.ts. */
const PREFETCH_HEADER = "x-kq-prefetch";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (path) => path.startsWith("/_next/static/") || path.startsWith("/icons/") || path.startsWith("/sounds/");

/** A redirected response can't answer a navigation, so store a plain copy of it. */
async function storable(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  if (isStatic(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname, { cacheName: PAGES, ignoreVary: true })) || caches.match("/offline", { ignoreVary: true })),
    );
  }
});

// ── Offline download, requested by the app (SyncAgent) while online ──

const ASSET = /\/_next\/static\/[^"'()\s\\]+/g;
let warming = null;

/** Downloads one page and everything it needs that isn't cached yet. */
async function warmPage(path, pages, statics, seen) {
  const res = await fetch(path, { credentials: "same-origin", headers: { [PREFETCH_HEADER]: "1" } });
  if (!res.ok) return;
  const html = await res.clone().text();
  await pages.put(path, await storable(res));
  for (const asset of new Set(html.match(ASSET) || [])) {
    if (seen.has(asset)) continue;
    seen.add(asset);
    if (await statics.match(asset)) continue;
    const a = await fetch(asset).catch(() => null);
    if (!a || !a.ok) continue;
    // Stylesheets point at fonts; fetch those too.
    if (asset.endsWith(".css")) {
      const css = await a.clone().text();
      for (const font of new Set(css.match(ASSET) || [])) {
        if (seen.has(font) || (await statics.match(font))) continue;
        seen.add(font);
        const f = await fetch(font).catch(() => null);
        if (f && f.ok) await statics.put(font, f);
      }
    }
    await statics.put(asset, a);
  }
}

async function warm(urls) {
  const [pages, statics] = await Promise.all([caches.open(PAGES), caches.open(STATIC)]);
  const seen = new Set();
  let done = 0;
  for (const path of urls) {
    try {
      await warmPage(path, pages, statics, seen);
      done++;
    } catch {
      break; // connection dropped: keep what we have, the app asks again later
    }
  }
  return done;
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "warm" || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === "string" && u.startsWith("/") && !u.startsWith("//"));
  warming = (warming || Promise.resolve()).then(() => warm(urls));
  event.waitUntil(warming.then((done) => event.source && event.source.postMessage({ type: "warmed", done, total: urls.length })));
});
