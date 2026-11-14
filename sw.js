/* Network-first freshness for GitHub Pages.
 * HTML, JS, CSS and site JSON always request the current deployed copy.
 * Images, fonts, and cross-origin resources retain normal browser caching.
 */
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === "navigate";
  const isSiteData = /\.(?:js|css|json)$/i.test(url.pathname);
  if (!isDocument && !isSiteData) return;

  // Let browser handle the response normally, but do not reuse its HTTP cache.
  // No SW response cache is stored; failed/offline requests fail normally.
  event.respondWith(fetch(request, { cache: "no-store" }));
});
