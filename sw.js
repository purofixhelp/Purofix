const CACHE_NAME = 'purofix-pwa-v7';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/core.js',
  '/i18n.js',
  '/app.js',
  '/manifest.webmanifest',
  '/purofix-logo.png',
  '/purofix-logo-transparent.png',
  '/assets/pwa-icon-192.png',
  '/assets/pwa-icon-512.png',
  '/assets/admin-icon-192.png',
  '/assets/pwa-screen-mobile.jpg',
  '/assets/purofix-certified-ro-service-engineer-lucknow-hero.jpg',
  '/assets/purofix-leadership-brand-promise-lucknow.jpg',
  '/assets/purofix-customer-dealing-service-plan-lucknow.jpg',
  '/assets/purofix-expert-ro-repair-service-lucknow-banner.jpg',
  '/assets/ashwani-tiwari.jpg',
  '/assets/google-review-qr.png',
  '/ro-service-tiwariganj-chinhat.html',
  '/ro-service-gomti-nagar.html',
  '/ro-service-indira-nagar.html',
  '/ro-service-aliganj-jankipuram.html',
  '/ro-service-alambagh-ashiyana.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache private Admin CRM HTML offline; pass straight to network
  if (url.pathname.includes('purofix-admin')) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML / navigation requests: Network-first with cache fallback
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

function syncSwAppBadge(count) {
  try {
    const n = Math.max(0, parseInt(count || 0, 10) || 0);
    if (self.navigator) {
      if (n > 0 && typeof self.navigator.setAppBadge === 'function') {
        self.navigator.setAppBadge(n).catch(() => {});
      } else if (n === 0 && typeof self.navigator.clearAppBadge === 'function') {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  } catch (e) {}
}

self.addEventListener('message', (event) => {
  const data = event && event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SET_BADGE') {
    syncSwAppBadge(data.count);
    return;
  }

  if (data.type === 'SHOW_ENQUIRY_NOTIFICATION') {
    syncSwAppBadge(data.unreadCount);
    const lead = data.lead || {};
    const notif = data.notification || {};
    if (self.Notification && self.Notification.permission === 'granted' && self.registration && typeof self.registration.showNotification === 'function') {
      event.waitUntil(
        self.registration.showNotification(
          notif.title || `🔔 New RO Enquiry: ${lead.name || 'Customer'} (${lead.locality || 'Lucknow'})`,
          {
            body: notif.message || `${lead.serviceType || 'RO Service'} • 📞 ${lead.phone || ''} • ID ${lead.id || ''}`,
            icon: '/assets/admin-icon-192.png',
            badge: '/assets/pwa-icon-192.png',
            tag: 'purofix-enquiry-' + (lead.id || notif.id || Date.now()),
            renotify: true,
            requireInteraction: true,
            vibrate: [220, 100, 220],
            data: {
              url: '/purofix-admin.html?lead=' + encodeURIComponent(lead.id || '') + '&tab=leads',
              leadId: lead.id || '',
              phone: lead.phone || ''
            },
            actions: [
              { action: 'open-admin', title: '📋 Open Admin CRM' },
              { action: 'call-customer', title: '📞 Call Customer' }
            ]
          }
        ).catch(() => {})
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  const notif = event.notification;
  const info = (notif && notif.data) || {};
  notif.close();

  if (event.action === 'call-customer' && info.phone) {
    const clean = String(info.phone).replace(/[^0-9+]/g, '');
    if (clean) {
      event.waitUntil(self.clients.openWindow('tel:' + clean));
      return;
    }
  }

  const targetUrl = info.url || '/purofix-admin.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i];
        if (client.url && client.url.includes('purofix-admin')) {
          client.postMessage({ type: 'FOCUS_LEAD', leadId: info.leadId || '' });
          if ('focus' in client) return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    })
  );
});
