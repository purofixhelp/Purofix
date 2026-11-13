/**
 * PUROFIX - Enterprise CRM & Business Operating System
 * State Management, Lead Lifecycle, 90-Day Retention & Analytics
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    LEADS: 'purofix_leads_db_v2',
    TECHNICIANS: 'purofix_technicians_db_v2',
    SETTINGS: 'purofix_settings_db_v2',
    FINANCES: 'purofix_finances_db_v2',
    REVIEWS: 'purofix_reviews_db_v2',
    AUDIT: 'purofix_audit_log_v2',
    NOTIFICATIONS: 'purofix_notifications_v2',
    OWNER_ALERTS: 'purofix_owner_device_alerts_v2',
    AUTH: 'purofix_admin_auth_v2'
  };

  // IndexedDB Durable Mirror (survives browser localStorage eviction & powers offline PWA)
  const IDB_NAME = 'PurofixEnterpriseDB';
  const IDB_VERSION = 1;
  let idbPromise = null;

  function openEnterpriseDB() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (ev) => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('audit_log')) db.createObjectStore('audit_log', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return idbPromise;
  }

  function mirrorToIndexedDB(key, value) {
    openEnterpriseDB().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put({ key, value, updatedAt: new Date().toISOString() });
      } catch (e) {}
    });
  }

  function hydrateMissingFromIndexedDB() {
    openEnterpriseDB().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        let restored = false;
        [STORAGE_KEYS.LEADS, STORAGE_KEYS.TECHNICIANS, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.REVIEWS, STORAGE_KEYS.AUDIT, STORAGE_KEYS.NOTIFICATIONS].forEach((key) => {
          if (localStorage.getItem(key) !== null) return;
          const r = store.get(key);
          r.onsuccess = () => {
            if (r.result && r.result.value !== undefined) {
              const val = r.result.value;
              if (Array.isArray(val) && val.length === 0) return;
              try {
                localStorage.setItem(key, JSON.stringify(val));
                restored = true;
              } catch (e) {}
            }
          };
        });
        tx.oncomplete = () => {
          if (restored) notifyTabs('idb_restore');
        };
      } catch (e) {}
    });
  }

  // Default Business Settings (Editable from Purofix Admin Portal)
  const DEFAULT_SETTINGS = {
    businessName: 'PUROFIX',
    ownerName: 'Ashwani Tiwari',
    ownerTitle: 'Founder & Lead RO Engineer',
    ownerExperience: '5 Years',
    primaryPhone: '9250332918',
    whatsappNumber: '9250332918',
    secondaryPhone: '8853257414',
    address: 'A-401, Juggaur, Tiwariganj, Lucknow, Uttar Pradesh – 226028',
    startingPrice: '199',
    responsePromise: 'Under 30 Minutes',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=purofix-ro-lucknow',
    webhookUrl: '',
    ownerAlertEmail: '',
    notifySound: true,
    adminPin: 'purofix2026',
    dailyTargetCapacity: 300,
    metaTitle: 'Purofix | Lucknow\'s No.1 RO Water Purifier Service Under 30 Mins',
    metaDescription: 'Purofix - Lucknow\'s trusted RO water purifier repair & service under 30 minutes. Starting at ₹199. Led by Ashwani Tiwari with 5 years experience. Call 9250332918.',
    metaKeywords: 'RO service Lucknow, RO repair Lucknow, ARO service Lucknow, water purifier service Lucknow, Kent RO service Lucknow, Aquaguard repair Lucknow, RO filter replacement Lucknow, Tiwariganj RO service, Gomti Nagar RO repair, Indira Nagar RO service, Aliganj RO repair, Alambagh RO service, Purofix Ashwani Tiwari'
  };

  // Real Owner Profile Only (Add additional real team engineers inside Admin)
  const DEFAULT_TECHNICIANS = [
    {
      id: 'tech-1',
      name: 'Ashwani Tiwari',
      role: 'Founder & Lead RO Engineer',
      phone: '9250332918',
      whatsapp: '9250332918',
      areas: 'All Lucknow Zones (Primary Hub: A-401 Juggaur, Tiwariganj)',
      status: 'Active',
      completedJobs: 0
    }
  ];

  // Zero fake seed leads — only real customer bookings & Admin-logged leads
  const DEFAULT_LEADS = [];

  const SYNC_CHANNEL_NAME = 'purofix_sync_channel';
  let syncChannel = null;
  try {
    if (typeof BroadcastChannel === 'function') {
      syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    }
  } catch (e) {}

  function notifyTabs(kind) {
    try {
      if (syncChannel) syncChannel.postMessage({ type: 'purofix_sync', kind });
    } catch (e) {}
  }

  function pushCloudEvent(event, dataObj, overrideUrl) {
    try {
      const settings = getSettings();
      const targetUrl = (overrideUrl || settings.webhookUrl || '').trim();
      if (!targetUrl || typeof fetch !== 'function') return;
      const payload = Object.assign({ event }, dataObj || {});
      fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => console.warn('Cloud sync warning:', err));
    } catch (err) {
      console.warn('Cloud sync skipped:', err);
    }
  }

  function cleanLegacyFakeSeeds() {
    try {
      const flagKey = 'purofix_clean_real_v1';
      if (localStorage.getItem(flagKey)) return;
      const fakeLeads = {
        'PFX-1001': 'Dr. Vivek Mishra',
        'PFX-1002': 'Neeraj Srivastava',
        'PFX-1003': 'Smt. Anjali Rastogi',
        'PFX-1004': 'Rajesh Khanna',
        'PFX-1005': 'Mohd. Tariq'
      };
      const rawLeads = localStorage.getItem(STORAGE_KEYS.LEADS);
      if (rawLeads) {
        const parsed = JSON.parse(rawLeads);
        if (Array.isArray(parsed)) {
          const realOnly = parsed.filter(l => !(l && fakeLeads[l.id] === l.name));
          localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(realOnly));
        }
      }
      const fakeTechs = {
        'tech-2': 'Ravi Kumar',
        'tech-3': 'Amit Sharma',
        'tech-4': 'Suresh Verma'
      };
      const rawTechs = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      if (rawTechs) {
        const parsedT = JSON.parse(rawTechs);
        if (Array.isArray(parsedT)) {
          const realT = parsedT
            .filter(t => !(t && fakeTechs[t.id] === t.name))
            .map(t => (t && t.id === 'tech-1' && t.completedJobs === 1420) ? { ...t, completedJobs: 0 } : t);
          localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(realT.length ? realT : DEFAULT_TECHNICIANS));
        }
      }
      localStorage.setItem(flagKey, '1');
    } catch (e) {}
  }
  cleanLegacyFakeSeeds();
  hydrateMissingFromIndexedDB();

  // Database Management Functions
  function getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  function saveSettings(settings, skipCloudPush = false) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      mirrorToIndexedDB(STORAGE_KEYS.SETTINGS, settings);
      notifyTabs('settings');
      if (!skipCloudPush) pushCloudEvent('save_settings', { settings }, settings.webhookUrl);
    } catch (e) {
      console.error('Error saving settings', e);
    }
  }

  function getLeads() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEADS);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_LEADS;
    }
  }

  function saveLeads(leads, skipCloudPush = false) {
    try {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
      mirrorToIndexedDB(STORAGE_KEYS.LEADS, leads);
      notifyTabs('leads');
      if (!skipCloudPush) pushCloudEvent('save_leads', { leads });
    } catch (e) {
      console.error('Error saving leads', e);
    }
  }

  function getTechnicians() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(DEFAULT_TECHNICIANS));
        return DEFAULT_TECHNICIANS;
      }
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_TECHNICIANS;
    }
  }

  function saveTechnicians(techs, skipCloudPush = false) {
    try {
      localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(techs));
      mirrorToIndexedDB(STORAGE_KEYS.TECHNICIANS, techs);
      notifyTabs('technicians');
      if (!skipCloudPush) pushCloudEvent('save_technicians', { technicians: techs });
    } catch (e) {
      console.error('Error saving technicians', e);
    }
  }

  function getReviews() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveReviews(reviews, skipCloudPush = false) {
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
      mirrorToIndexedDB(STORAGE_KEYS.REVIEWS, reviews);
      notifyTabs('reviews');
      if (!skipCloudPush) pushCloudEvent('save_reviews', { reviews });
    } catch (e) {
      console.error('Error saving reviews', e);
    }
  }

  function getAuditLog() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function appendAuditLog(action, detail, leadId) {
    try {
      const log = getAuditLog();
      const entry = {
        id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        action: String(action || 'UPDATE'),
        detail: String(detail || ''),
        leadId: leadId || ''
      };
      log.unshift(entry);
      const trimmed = log.slice(0, 150);
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(trimmed));
      mirrorToIndexedDB(STORAGE_KEYS.AUDIT, trimmed);
      openEnterpriseDB().then((db) => {
        if (!db) return;
        try {
          const tx = db.transaction('audit_log', 'readwrite');
          tx.objectStore('audit_log').put(entry);
        } catch (e) {}
      });
    } catch (e) {}
  }

  function clearAuditLog() {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, '[]');
      mirrorToIndexedDB(STORAGE_KEYS.AUDIT, []);
    } catch (e) {}
  }

  // Real-Time Enquiry Notification Store, App Icon Badging & Audio Chime
  const enquiryListeners = new Set();

  function getNotifications() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function getUnreadNotificationCount() {
    return getNotifications().filter((n) => n && !n.read).length;
  }

  function updatePwaAppBadge(countOverride) {
    const count = typeof countOverride === 'number'
      ? Math.max(0, countOverride)
      : getUnreadNotificationCount();
    try {
      if (typeof navigator !== 'undefined') {
        if (count > 0 && typeof navigator.setAppBadge === 'function') {
          navigator.setAppBadge(count).catch(() => {});
        } else if (count === 0 && typeof navigator.clearAppBadge === 'function') {
          navigator.clearAppBadge().catch(() => {});
        }
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SET_BADGE', count });
        } else {
          navigator.serviceWorker.ready
            .then((reg) => {
              if (reg && reg.active) reg.active.postMessage({ type: 'SET_BADGE', count });
            })
            .catch(() => {});
        }
      }
    } catch (e) {}
    return count;
  }

  function saveNotifications(list, silentBroadcast = false) {
    try {
      const trimmed = Array.isArray(list) ? list.slice(0, 80) : [];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(trimmed));
      mirrorToIndexedDB(STORAGE_KEYS.NOTIFICATIONS, trimmed);
      updatePwaAppBadge(trimmed.filter((n) => n && !n.read).length);
      if (!silentBroadcast) notifyTabs('notifications');
      return trimmed;
    } catch (e) {
      return [];
    }
  }

  function isOwnerAlertsEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEYS.OWNER_ALERTS) === '1';
    } catch (e) {
      return false;
    }
  }

  function setOwnerAlertsEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_KEYS.OWNER_ALERTS, enabled ? '1' : '0');
      updatePwaAppBadge();
    } catch (e) {}
  }

  function notifyServiceWorkerAlert(lead, notification, unreadCount) {
    try {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
      const msg = {
        type: 'SHOW_ENQUIRY_NOTIFICATION',
        lead,
        notification,
        unreadCount
      };
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(msg);
      } else {
        navigator.serviceWorker.ready
          .then((reg) => {
            if (!reg) return;
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && typeof reg.showNotification === 'function') {
              reg.showNotification(notification.title, {
                body: notification.message,
                icon: '/assets/admin-icon-192.png',
                badge: '/assets/pwa-icon-192.png',
                tag: 'purofix-enquiry-' + (lead.id || notification.id),
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
              }).catch(() => {});
            } else if (reg.active) {
              reg.active.postMessage(msg);
            }
          })
          .catch(() => {});
      }
    } catch (e) {}
  }

  function playNotificationChime() {
    try {
      const settings = getSettings();
      if (settings && settings.notifySound === false) return false;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      const ctx = new Ctx();
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }
      const notes = [880, 1174.66]; // Clear two-tone chime (A5 -> D6)
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.36);
      });
      setTimeout(() => {
        if (typeof ctx.close === 'function') ctx.close().catch(() => {});
      }, 900);
      return true;
    } catch (e) {
      return false;
    }
  }

  function dispatchEnquiryAlert(lead, opts = {}) {
    if (!lead || typeof lead !== 'object') return null;
    const list = getNotifications();
    const duplicate = list.find((n) => n && n.leadId && n.leadId === lead.id && !opts.force);
    const notif = duplicate || {
      id: 'NTF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      leadId: lead.id || '',
      title: `🔔 New RO Enquiry: ${lead.name || 'Customer'} (${lead.locality || 'Lucknow'})`,
      message: `${lead.serviceType || 'RO Service'} • 📞 ${lead.phone || '—'} • ID ${lead.id || ''}`,
      customerName: lead.name || 'Customer',
      phone: lead.phone || lead.whatsapp || '',
      locality: lead.locality || 'Lucknow',
      serviceType: lead.serviceType || 'RO Service',
      brand: lead.brand || 'RO Purifier',
      revenue: parseFloat(lead.revenue || 199) || 199,
      leadSource: opts.source === 'cloud' ? 'Cloud Cross-Device' : (lead.leadSource || 'Website Booking'),
      createdAt: new Date().toISOString(),
      read: opts.markReadOnCreate === true
    };

    if (!duplicate) {
      list.unshift(notif);
      saveNotifications(list, true);
    }

    const unreadCount = getUnreadNotificationCount();
    updatePwaAppBadge(unreadCount);

    if (!opts.markReadOnCreate) {
      try {
        if (syncChannel) {
          syncChannel.postMessage({
            type: 'purofix_new_enquiry',
            lead,
            notification: notif,
            unreadCount
          });
        }
      } catch (e) {}
      enquiryListeners.forEach((cb) => {
        try { cb({ lead, notification: notif, unreadCount }); } catch (err) {}
      });
      if (!opts.skipOsPush) {
        notifyServiceWorkerAlert(lead, notif, unreadCount);
      }
    }
    notifyTabs('notifications');
    return notif;
  }

  function markNotificationRead(notifId) {
    const updated = getNotifications().map((n) => (n && n.id === notifId ? { ...n, read: true } : n));
    saveNotifications(updated);
    return getUnreadNotificationCount();
  }

  function markNotificationsByLeadId(leadId) {
    if (!leadId) return getUnreadNotificationCount();
    const updated = getNotifications().map((n) => (n && n.leadId === leadId ? { ...n, read: true } : n));
    saveNotifications(updated);
    return getUnreadNotificationCount();
  }

  function markAllNotificationsRead() {
    const updated = getNotifications().map((n) => (n ? { ...n, read: true } : n));
    saveNotifications(updated);
    return 0;
  }

  function clearAllNotifications() {
    saveNotifications([]);
    return 0;
  }

  function onEnquiryAlert(callback) {
    if (typeof callback !== 'function') return function () {};
    enquiryListeners.add(callback);
    const handleBroadcast = (ev) => {
      if (ev && ev.data && ev.data.type === 'purofix_new_enquiry') {
        callback({
          lead: ev.data.lead,
          notification: ev.data.notification,
          unreadCount: ev.data.unreadCount
        });
      }
    };
    let lastSeenTopId = (getNotifications()[0] && getNotifications()[0].id) || null;
    const handleStorage = (ev) => {
      if (ev && ev.key === STORAGE_KEYS.NOTIFICATIONS) {
        const list = getNotifications();
        const newest = list.find((n) => n && !n.read);
        if (newest && newest.id !== lastSeenTopId) {
          lastSeenTopId = newest.id;
          const lead = getLeads().find((l) => l.id === newest.leadId) || {
            id: newest.leadId,
            name: newest.customerName,
            phone: newest.phone,
            locality: newest.locality,
            serviceType: newest.serviceType,
            revenue: newest.revenue
          };
          callback({ lead, notification: newest, unreadCount: getUnreadNotificationCount() });
        } else {
          lastSeenTopId = (list[0] && list[0].id) || null;
        }
      }
    };
    if (syncChannel) syncChannel.addEventListener('message', handleBroadcast);
    window.addEventListener('storage', handleStorage);
    return function unsubscribe() {
      enquiryListeners.delete(callback);
      if (syncChannel) syncChannel.removeEventListener('message', handleBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  async function syncFromCloud(mode = 'public') {
    const settings = getSettings();
    const baseUrl = (settings.webhookUrl || '').trim();
    if (!baseUrl || typeof fetch !== 'function') return null;
    try {
      const sep = baseUrl.includes('?') ? '&' : '?';
      const action = mode === 'admin' ? 'admin_pull' : 'public';
      const res = await fetch(`${baseUrl}${sep}action=${action}`, { method: 'GET', cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== 'object') return null;

      if (data.settings && typeof data.settings === 'object') {
        const merged = { ...getSettings(), ...data.settings, webhookUrl: baseUrl };
        saveSettings(merged, true);
      }
      if (Array.isArray(data.reviews)) saveReviews(data.reviews, true);
      if (mode === 'admin') {
        if (Array.isArray(data.leads)) {
          const prevIds = new Set(getLeads().map((l) => l.id));
          const incomingNewLeads = data.leads.filter((l) => l && l.id && !prevIds.has(l.id));
          saveLeads(data.leads, true);
          incomingNewLeads.forEach((remoteLead) => {
            dispatchEnquiryAlert(remoteLead, { source: 'cloud' });
          });
        }
        if (Array.isArray(data.technicians) && data.technicians.length) saveTechnicians(data.technicians, true);
      }
      notifyTabs('cloud');
      return data;
    } catch (e) {
      console.warn('Cloud pull skipped:', e);
      return null;
    }
  }

  // Calculate next 90-day reminder date from completion
  function calculateReminderDate(completedDateStr, intervalDays = 90) {
    const d = completedDateStr ? new Date(completedDateStr) : new Date();
    d.setDate(d.getDate() + intervalDays);
    return d.toISOString().split('T')[0];
  }

  function onSync(callback) {
    if (typeof callback !== 'function') return function () {};
    const validKeys = new Set([
      STORAGE_KEYS.LEADS,
      STORAGE_KEYS.TECHNICIANS,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.REVIEWS,
      STORAGE_KEYS.NOTIFICATIONS
    ]);
    const handleMessage = (ev) => {
      if (ev && ev.data && ev.data.type === 'purofix_sync') {
        callback(ev.data.kind || 'all');
      }
    };
    const handleStorage = (ev) => {
      if (ev && validKeys.has(ev.key)) {
        callback(ev.key);
      }
    };
    if (syncChannel) syncChannel.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return function unsubscribe() {
      if (syncChannel) syncChannel.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }

  function normalizePhoneKey(phone, fallbackName) {
    const digits = String(phone || '').replace(/[^0-9]/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    if (digits.length >= 6) return digits;
    return 'name:' + String(fallbackName || 'unknown').trim().toLowerCase();
  }

  function getLeadPaymentSummary(lead) {
    if (!lead) {
      return { billed: 0, paid: 0, pending: 0, paymentStatus: 'Pending', paymentMode: 'Pending' };
    }
    const billed = Math.max(0, parseFloat(lead.revenue || 0) || 0);
    const isCancelled = lead.status === 'Cancelled';
    const hasExplicitPaid = lead.amountPaid !== undefined && lead.amountPaid !== null && lead.amountPaid !== '';
    let paid = 0;
    if (hasExplicitPaid) {
      paid = Math.max(0, parseFloat(lead.amountPaid) || 0);
    } else {
      paid = lead.status === 'Completed' ? billed : 0;
    }

    if (isCancelled) {
      return {
        billed,
        paid,
        pending: 0,
        paymentStatus: paid > 0 ? 'Settled' : 'Cancelled',
        paymentMode: lead.paymentMode || 'Cancelled'
      };
    }

    const pending = Math.max(0, billed - paid);
    let paymentStatus = 'Pending';
    if (billed > 0 && pending === 0) paymentStatus = 'Paid';
    else if (paid > 0 && pending > 0) paymentStatus = 'Partial';
    else if (billed === 0 && paid === 0) paymentStatus = 'Paid';

    return {
      billed,
      paid,
      pending,
      paymentStatus,
      paymentMode: lead.paymentMode || (paymentStatus === 'Paid' ? 'Cash / UPI' : 'Pending')
    };
  }

  function getWorkflowStage(status) {
    const s = String(status || 'New Lead');
    if (s === 'Completed') return 'completed';
    if (s === 'Cancelled') return 'cancelled';
    if (s === 'Technician Assigned' || s === 'On The Way' || s === 'In Progress') return 'continue';
    return 'pending';
  }

  function getCustomerLedger() {
    const leads = getLeads();
    const map = new Map();

    leads.forEach((lead) => {
      const key = normalizePhoneKey(lead.phone || lead.whatsapp, lead.name);
      const pay = getLeadPaymentSummary(lead);
      const stage = getWorkflowStage(lead.status);

      if (!map.has(key)) {
        map.set(key, {
          customerKey: key,
          name: lead.name || 'Customer',
          phone: lead.phone || lead.whatsapp || '',
          whatsapp: lead.whatsapp || lead.phone || '',
          locality: lead.locality || 'Lucknow',
          address: lead.address || lead.locality || '',
          brands: [],
          totalBookings: 0,
          completedCount: 0,
          pendingEnquiryCount: 0,
          continueCount: 0,
          notDoneCount: 0,
          cancelledCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalPending: 0,
          totalProfit: 0,
          lastBookingDate: '',
          lastCompletedDate: '',
          nextReminderDate: '',
          latestTdsBefore: '',
          latestTdsAfter: '',
          history: []
        });
      }

      const cust = map.get(key);
      if (lead.name && cust.name === 'Customer') cust.name = lead.name;
      if (lead.phone && !cust.phone) cust.phone = lead.phone;
      if (lead.whatsapp && !cust.whatsapp) cust.whatsapp = lead.whatsapp;
      if (lead.locality && (!cust.locality || cust.locality === 'Lucknow')) cust.locality = lead.locality;
      if (lead.address && lead.address.length > cust.address.length) cust.address = lead.address;
      if (lead.brand && !cust.brands.includes(lead.brand)) cust.brands.push(lead.brand);

      cust.totalBookings += 1;
      if (stage === 'completed') cust.completedCount += 1;
      else if (stage === 'pending') {
        cust.pendingEnquiryCount += 1;
        cust.notDoneCount += 1;
      } else if (stage === 'continue') {
        cust.continueCount += 1;
        cust.notDoneCount += 1;
      } else if (stage === 'cancelled') {
        cust.cancelledCount += 1;
      }

      if (stage !== 'cancelled') {
        cust.totalBilled += pay.billed;
        cust.totalProfit += (parseFloat(lead.profit) || 0);
      }
      cust.totalPaid += pay.paid;
      cust.totalPending += pay.pending;

      const bDate = lead.bookingDate || '';
      if (bDate && (!cust.lastBookingDate || bDate > cust.lastBookingDate)) cust.lastBookingDate = bDate;
      if (lead.completedDate && (!cust.lastCompletedDate || lead.completedDate > cust.lastCompletedDate)) {
        cust.lastCompletedDate = lead.completedDate;
      }
      if (lead.nextReminderDate && (!cust.nextReminderDate || lead.nextReminderDate > cust.nextReminderDate)) {
        cust.nextReminderDate = lead.nextReminderDate;
      }
      if (lead.tdsBefore && !cust.latestTdsBefore) cust.latestTdsBefore = lead.tdsBefore;
      if (lead.tdsAfter && !cust.latestTdsAfter) cust.latestTdsAfter = lead.tdsAfter;

      cust.history.push({ ...lead, paymentSummary: pay, workflowStage: stage });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalPending !== a.totalPending) return b.totalPending - a.totalPending;
      if (b.lastBookingDate !== a.lastBookingDate) return String(b.lastBookingDate).localeCompare(String(a.lastBookingDate));
      return b.totalBookings - a.totalBookings;
    });
  }

  function getAnalyticsSummary() {
    const leads = getLeads();
    const todayStr = new Date().toISOString().split('T')[0];
    const ledger = getCustomerLedger();

    let pendingEnquiryCount = 0;
    let continueCount = 0;
    let okayCompletedCount = 0;
    let cancelledCount = 0;
    let totalBilled = 0;
    let totalEarnedCollected = 0;
    let totalPaymentPending = 0;
    let totalPartsCost = 0;
    let totalTechAndExp = 0;
    let totalNetProfit = 0;
    let todayDone = 0;
    let todayLeads = 0;
    let todayCollected = 0;
    let todayProfit = 0;
    let remindersDue = 0;

    const localityMap = new Map();
    const serviceMap = new Map();
    const brandMap = new Map();

    leads.forEach((l) => {
      const stage = getWorkflowStage(l.status);
      const pay = getLeadPaymentSummary(l);

      if (stage === 'pending') pendingEnquiryCount += 1;
      else if (stage === 'continue') continueCount += 1;
      else if (stage === 'completed') okayCompletedCount += 1;
      else if (stage === 'cancelled') cancelledCount += 1;

      if (stage !== 'cancelled') {
        totalBilled += pay.billed;
        totalPartsCost += (parseFloat(l.partsCost) || 0);
        totalTechAndExp += (parseFloat(l.techComm) || 0) + (parseFloat(l.expenses) || 0);
        totalNetProfit += (parseFloat(l.profit) || 0);
      }
      totalEarnedCollected += pay.paid;
      totalPaymentPending += pay.pending;

      if (l.bookingDate === todayStr) todayLeads += 1;
      if (l.completedDate === todayStr || (stage === 'completed' && l.bookingDate === todayStr)) {
        todayDone += 1;
        todayProfit += (parseFloat(l.profit) || 0);
      }
      if ((l.paymentDate && l.paymentDate === todayStr) || (pay.paid > 0 && l.bookingDate === todayStr && !l.paymentDate)) {
        todayCollected += pay.paid;
      }

      if (l.status === 'Completed' && l.nextReminderDate && l.nextReminderDate <= todayStr && !l.reminderContacted) {
        remindersDue += 1;
      }

      const locKey = (l.locality || 'Lucknow').trim() || 'Lucknow';
      if (!localityMap.has(locKey)) localityMap.set(locKey, { name: locKey, count: 0, completed: 0, billed: 0, paid: 0, pending: 0 });
      const locObj = localityMap.get(locKey);
      locObj.count += 1;
      if (stage === 'completed') locObj.completed += 1;
      if (stage !== 'cancelled') locObj.billed += pay.billed;
      locObj.paid += pay.paid;
      locObj.pending += pay.pending;

      const svcKey = (l.serviceType || 'RO General Service').split('(')[0].trim() || 'RO Service';
      if (!serviceMap.has(svcKey)) serviceMap.set(svcKey, { name: svcKey, count: 0, completed: 0, billed: 0, paid: 0, pending: 0 });
      const svcObj = serviceMap.get(svcKey);
      svcObj.count += 1;
      if (stage === 'completed') svcObj.completed += 1;
      if (stage !== 'cancelled') svcObj.billed += pay.billed;
      svcObj.paid += pay.paid;
      svcObj.pending += pay.pending;

      const brKey = (l.brand || 'Other / Not Specified').trim() || 'Other';
      if (!brandMap.has(brKey)) brandMap.set(brKey, { name: brKey, count: 0 });
      brandMap.get(brKey).count += 1;
    });

    const sortByCountThenBilled = (a, b) => (b.count - a.count) || (b.billed - a.billed);

    return {
      totalEnquiries: leads.length,
      pendingEnquiryCount,
      continueCount,
      notDoneCount: pendingEnquiryCount + continueCount,
      okayCompletedCount,
      cancelledCount,
      uniqueCustomersCount: ledger.length,
      repeatCustomersCount: ledger.filter(c => c.totalBookings > 1).length,
      totalBilled,
      totalEarnedCollected,
      totalPaymentPending,
      totalPartsCost,
      totalTechAndExp,
      totalNetProfit,
      todayDone,
      todayLeads,
      todayCollected,
      todayProfit,
      remindersDue,
      byLocality: Array.from(localityMap.values()).sort(sortByCountThenBilled),
      byService: Array.from(serviceMap.values()).sort(sortByCountThenBilled),
      byBrand: Array.from(brandMap.values()).sort((a, b) => b.count - a.count)
    };
  }

  // Core API Exposing methods for both Public and Admin pages
  window.PurofixCore = {
    getSettings,
    saveSettings,
    getLeads,
    saveLeads,
    getTechnicians,
    saveTechnicians,
    getReviews,
    saveReviews,
    getAuditLog,
    clearAuditLog,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markNotificationsByLeadId,
    markAllNotificationsRead,
    clearAllNotifications,
    dispatchEnquiryAlert,
    onEnquiryAlert,
    isOwnerAlertsEnabled,
    setOwnerAlertsEnabled,
    updatePwaAppBadge,
    playNotificationChime,
    getLeadPaymentSummary,
    getWorkflowStage,
    getCustomerLedger,
    getAnalyticsSummary,
    syncFromCloud,
    onSync,
    calculateReminderDate,

    addReview: function (reviewData) {
      const reviews = getReviews();
      const ratingNum = Math.min(5, Math.max(1, parseInt(reviewData.rating || 5, 10) || 5));
      const newReview = {
        id: 'REV-' + Date.now(),
        name: String(reviewData.name || 'Lucknow Resident').trim(),
        locality: String(reviewData.locality || 'Lucknow').trim(),
        rating: ratingNum,
        serviceTag: String(reviewData.serviceTag || 'RO Service').trim(),
        text: String(reviewData.text || '').trim(),
        createdAt: new Date().toISOString().split('T')[0],
        source: reviewData.source || 'Customer Submitted'
      };
      reviews.unshift(newReview);
      saveReviews(reviews, true);
      pushCloudEvent('new_review', { review: newReview });
      return newReview;
    },

    deleteReview: function (id) {
      const reviews = getReviews().filter(r => r.id !== id);
      saveReviews(reviews);
      return true;
    },

    // Add Lead from public website booking or manual admin entry
    addLead: function (leadData) {
      const leads = getLeads();
      const existingIds = new Set(leads.map(l => l.id));
      let uniqueId;
      do {
        uniqueId = 'PFX-' + Math.floor(1000 + Math.random() * 9000);
      } while (existingIds.has(uniqueId) && existingIds.size < 8999);
      if (existingIds.has(uniqueId)) {
        uniqueId = 'PFX-' + String(Date.now()).slice(-6);
      }
      const revenue = Math.max(0, parseFloat(leadData.revenue || 0) || 199);
      const hasPaid = leadData.amountPaid !== undefined && leadData.amountPaid !== null && leadData.amountPaid !== '';
      const initialPaid = hasPaid
        ? Math.max(0, parseFloat(leadData.amountPaid) || 0)
        : (leadData.status === 'Completed' ? revenue : 0);
      const pendingBal = leadData.status === 'Cancelled' ? 0 : Math.max(0, revenue - initialPaid);
      const derivedPayStatus = leadData.status === 'Cancelled'
        ? (initialPaid > 0 ? 'Settled' : 'Cancelled')
        : (revenue > 0 && pendingBal === 0 ? 'Paid' : (initialPaid > 0 ? 'Partial' : 'Pending'));

      const newLead = {
        id: uniqueId,
        name: leadData.name || 'Anonymous',
        phone: leadData.phone || '',
        whatsapp: leadData.whatsapp || leadData.phone || '',
        locality: leadData.locality || leadData.area || 'Lucknow',
        address: leadData.address || leadData.area || '',
        brand: leadData.brand || 'Other / Not Specified',
        serviceType: leadData.serviceType || leadData.service || 'RO General Service',
        status: leadData.status || 'New Lead',
        bookingDate: leadData.bookingDate || new Date().toISOString().split('T')[0],
        completedDate: leadData.status === 'Completed' ? new Date().toISOString().split('T')[0] : null,
        nextReminderDate: leadData.status === 'Completed' ? calculateReminderDate(new Date().toISOString().split('T')[0], 90) : null,
        technician: leadData.technician || 'Unassigned',
        revenue: revenue,
        amountPaid: initialPaid,
        paymentStatus: leadData.paymentStatus || derivedPayStatus,
        paymentMode: leadData.paymentMode || (initialPaid > 0 ? 'Cash / UPI' : 'Pending'),
        paymentDate: initialPaid > 0 ? new Date().toISOString().split('T')[0] : '',
        tdsBefore: leadData.tdsBefore !== undefined ? String(leadData.tdsBefore) : '',
        tdsAfter: leadData.tdsAfter !== undefined ? String(leadData.tdsAfter) : '',
        partsCost: parseFloat(leadData.partsCost || 0),
        techComm: parseFloat(leadData.techComm || 0),
        expenses: parseFloat(leadData.expenses || 0),
        profit: parseFloat(leadData.profit || 0) || 0,
        notes: leadData.notes || '',
        reminderContacted: false,
        leadSource: leadData.leadSource || 'Website Booking'
      };

      // Auto compute profit if not manually supplied
      if (!leadData.profit && newLead.revenue) {
        newLead.profit = Math.max(0, newLead.revenue - (newLead.partsCost + newLead.techComm + newLead.expenses));
      }

      leads.unshift(newLead);
      saveLeads(leads, true);
      appendAuditLog('NEW_BOOKING', `${newLead.name} (${newLead.locality}) • ${newLead.serviceType} • ₹${newLead.revenue}`, newLead.id);
      dispatchEnquiryAlert(newLead, { markReadOnCreate: Boolean(leadData._manualAdmin) });
      pushCloudEvent('new_lead', { lead: newLead });

      return newLead;
    },

    // Update Lead status, payments & trigger 90-day retention logic when completed
    updateLead: function (id, updates) {
      const leads = getLeads();
      const index = leads.findIndex(l => l.id === id);
      if (index === -1) return false;

      const current = leads[index];
      const updated = { ...current, ...updates };

      // Trigger 90-day retention calculation if status became Completed
      if (updated.status === 'Completed' && (!current.completedDate || current.status !== 'Completed')) {
        updated.completedDate = new Date().toISOString().split('T')[0];
        updated.nextReminderDate = calculateReminderDate(updated.completedDate, 90);
      }

      // Normalize revenue, payment status & net profit
      const rev = Math.max(0, parseFloat(updated.revenue !== undefined ? updated.revenue : current.revenue) || 0);
      const parts = parseFloat(updated.partsCost) || 0;
      const comm = parseFloat(updated.techComm) || 0;
      const exp = parseFloat(updated.expenses) || 0;
      updated.revenue = rev;
      updated.profit = rev - (parts + comm + exp);

      const paySummary = getLeadPaymentSummary(updated);
      updated.amountPaid = paySummary.paid;
      updated.paymentStatus = paySummary.paymentStatus;
      updated.paymentMode = updates.paymentMode || paySummary.paymentMode;
      if (paySummary.paid > 0 && !updated.paymentDate) {
        updated.paymentDate = new Date().toISOString().split('T')[0];
      }

      leads[index] = updated;
      saveLeads(leads);
      appendAuditLog(
        'UPDATE_JOB',
        `${updated.name} -> Status: ${updated.status}, Paid: ₹${paySummary.paid}/₹${paySummary.billed}`,
        updated.id
      );
      return updated;
    },

    deleteLead: function (id) {
      const existing = getLeads().find(l => l.id === id);
      const leads = getLeads().filter(l => l.id !== id);
      saveLeads(leads);
      if (existing) {
        appendAuditLog('DELETE_JOB', `Removed booking ${existing.id} (${existing.name})`, existing.id);
      }
      return true;
    },

    // Generate WhatsApp direct URL with formatted message
    getWhatsAppUrl: function (phone, text) {
      const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
      const num = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
      return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    },

    // Export Leads Database to CSV
    exportLeadsToCSV: function () {
      const leads = getLeads();
      if (!leads.length) return false;

      const headers = [
        'Booking ID', 'Customer Name', 'Phone', 'WhatsApp', 'Locality', 'Address',
        'RO Brand', 'Service Type', 'Status', 'Booking Date', 'Completed Date',
        'Next 90-Day Reminder', 'Technician', 'Revenue (INR)', 'Amount Paid (INR)',
        'Pending Balance (INR)', 'Payment Status', 'Payment Mode', 'TDS Before (ppm)',
        'TDS After (ppm)', 'Parts Cost', 'Commission', 'Expenses', 'Net Profit (INR)',
        'Notes', 'Lead Source'
      ];

      const rows = leads.map(l => {
        const pay = getLeadPaymentSummary(l);
        return [
          l.id,
          `"${(l.name || '').replace(/"/g, '""')}"`,
          `"${l.phone}"`,
          `"${l.whatsapp}"`,
          `"${l.locality}"`,
          `"${(l.address || '').replace(/"/g, '""')}"`,
          `"${l.brand}"`,
          `"${l.serviceType}"`,
          `"${l.status}"`,
          l.bookingDate || '',
          l.completedDate || '',
          l.nextReminderDate || '',
          `"${l.technician}"`,
          pay.billed,
          pay.paid,
          pay.pending,
          `"${pay.paymentStatus}"`,
          `"${pay.paymentMode}"`,
          `"${l.tdsBefore || ''}"`,
          `"${l.tdsAfter || ''}"`,
          l.partsCost || 0,
          l.techComm || 0,
          l.expenses || 0,
          l.profit || 0,
          `"${(l.notes || '').replace(/"/g, '""')}"`,
          `"${l.leadSource || ''}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Purofix_Leads_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    },

    // Full JSON Database Backup (Leads + Customers + Technicians + Reviews + Settings + Audit)
    exportBackupJSON: function () {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 'purofix-crm-v3',
        settings: getSettings(),
        technicians: getTechnicians(),
        leads: getLeads(),
        reviews: getReviews(),
        auditLog: getAuditLog()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Purofix_CRM_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    },

    // Restore Full JSON Database Backup
    importBackupJSON: function (rawJson) {
      try {
        const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        if (!parsed || typeof parsed !== 'object') return false;
        if (Array.isArray(parsed.leads)) saveLeads(parsed.leads);
        if (Array.isArray(parsed.technicians)) saveTechnicians(parsed.technicians);
        if (Array.isArray(parsed.reviews)) saveReviews(parsed.reviews);
        if (Array.isArray(parsed.auditLog)) {
          localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(parsed.auditLog.slice(0, 150)));
          mirrorToIndexedDB(STORAGE_KEYS.AUDIT, parsed.auditLog.slice(0, 150));
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          saveSettings({ ...getSettings(), ...parsed.settings });
        }
        appendAuditLog('IMPORT_BACKUP', 'Restored JSON database backup');
        return true;
      } catch (e) {
        console.error('Invalid backup JSON', e);
        return false;
      }
    }
  };

})();
