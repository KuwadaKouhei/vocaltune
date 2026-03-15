/// @ts-nocheck
const CACHE_NAME = "vocaltune-v1";

// ビルド後の静的アセットとページをキャッシュ
const PRECACHE_URLS = [
  "/",
  "/history",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

// install: 静的アセットをプリキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// activate: 古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// fetch: Network-first + キャッシュフォールバック
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // POST や WebSocket 等は無視
  if (request.method !== "GET") return;

  // Chrome拡張等のリクエストは無視
  if (!request.url.startsWith("http")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 成功したレスポンスをキャッシュに保存
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュからフォールバック
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // ナビゲーションリクエストは "/" にフォールバック
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
