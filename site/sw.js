/* 首頁以前是 App，舊版會在根目錄註冊離線快取。
   這個檔案讓舊的快取自動清掉並解除註冊，訪客就會看到新的介紹頁；App 自己的快取在 app/sw.js。 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith('vaultcard-app-')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
