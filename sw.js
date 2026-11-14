const CACHE_NAME = "money-pwa-cache-20261115_v16";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./PIC1.jpg",
  "./manifest.json"
];

// 安裝階段：立即預先快取核心靜態資源並跳過等待
self.addEventListener("install", function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CORE_ASSETS);
    }).catch(function() {})
  );
});

// 啟動階段：清理舊版快取並立即接管所有頁面
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 攔截請求：API 走網路，網頁與圖示採用 Stale-While-Revalidate（0.01 秒本機秒開 + 背景自動更新快取）
self.addEventListener("fetch", function(event) {
  const req = event.request;

  // POST 請求或 Google Apps Script API 請求直接走網路
  if (req.method !== "GET" || req.url.indexOf("script.google.com") !== -1 || req.url.indexOf("googleusercontent.com") !== -1) {
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // 若帶有強制更新參數 (?force_reload=)，優先向伺服器拉取最新版並寫入快取
  if (url.search.indexOf("force_reload=") !== -1) {
    event.respondWith(
      fetch(req).then(function(networkRes) {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put("./index.html", clone);
          });
        }
        return networkRes;
      }).catch(function() {
        return caches.match("./index.html", { ignoreSearch: true });
      })
    );
    return;
  }

  // Stale-While-Revalidate：0.005 秒直接從手機硬碟快取回傳，同時在背景靜默拉取最新版本更新快取
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(req, { ignoreSearch: true }).then(function(cachedRes) {
        const fetchPromise = fetch(req).then(function(networkRes) {
          if (networkRes && networkRes.status === 200 && networkRes.type === "basic") {
            cache.put(req, networkRes.clone());
            if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
              cache.put("./index.html", networkRes.clone());
            }
          }
          return networkRes;
        }).catch(function() {
          return null;
        });

        if (cachedRes) {
          return cachedRes;
        }
        return fetchPromise.then(function(res) {
          return res || cache.match("./index.html", { ignoreSearch: true });
        });
      });
    })
  );
});
