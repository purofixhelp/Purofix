/**
 * PUROFIX - Public Website Interactive Controller
 * Connects with PurofixCore database, handles bookings, WhatsApp redirects, and tools
 */

(function () {
  'use strict';

  // DOM Elements
  const bookingDialog = document.getElementById('bookingDialog');
  const closeDialogBtn = document.getElementById('closeDialogBtn');
  const modalServiceSelect = document.getElementById('modalService');
  const menuToggle = document.getElementById('menuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const backdrop = document.getElementById('backdrop');
  const toastEl = document.getElementById('toastNotification');

  // TDS Elements
  const tdsSlider = document.getElementById('tdsSlider');
  const tdsNumber = document.getElementById('tdsNumber');
  const tdsStatusPill = document.getElementById('tdsStatusPill');
  const tdsCategoryTitle = document.getElementById('tdsCategoryTitle');
  const tdsDescription = document.getElementById('tdsDescription');
  const tdsAdvice = document.getElementById('tdsAdvice');

  let websiteAlertTimer = null;

  function ensureWebsiteEnquiryAlertEl() {
    let el = document.getElementById('websiteEnquiryAlert');
    if (!el) {
      el = document.createElement('div');
      el.id = 'websiteEnquiryAlert';
      el.className = 'website-enquiry-alert';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  function hideWebsiteEnquiryAlert() {
    const el = document.getElementById('websiteEnquiryAlert');
    if (el) el.classList.remove('active');
    if (websiteAlertTimer) {
      clearTimeout(websiteAlertTimer);
      websiteAlertTimer = null;
    }
  }

  const isHiLang = () => Boolean(window.PurofixI18n && window.PurofixI18n.getLang() === 'hi');
  const tI18n = (key, fallback = '') => (window.PurofixI18n ? window.PurofixI18n.t(key, fallback) : fallback);

  function showWebsiteEnquiryAlert({ lead, notification, mode = 'customer', waUrl = '', unreadCount = 0 }) {
    if (!lead) return;
    const el = ensureWebsiteEnquiryAlertEl();
    const isOwnerMode = mode === 'owner';
    const hi = isHiLang();
    const title = isOwnerMode
      ? `${tI18n('wea.ownerTitle', '🔔 New RO Enquiry Alert!')} (${lead.id || ''})`
      : `${tI18n('wea.custTitle', '🔔 Enquiry Confirmed & Notified')} (${lead.id || ''})`;
    const desc = isOwnerMode
      ? (hi
          ? `<strong>${escapeHtml(lead.name || 'ग्राहक')}</strong> ने ${escapeHtml(lead.locality || 'लखनऊ')} में <strong>${escapeHtml(lead.serviceType || 'आरओ सर्विस')}</strong> बुक की${lead.phone ? ' • 📞 ' + escapeHtml(lead.phone) : ''}${unreadCount > 0 ? ` • ${unreadCount} अपठित` : ''}`
          : `<strong>${escapeHtml(lead.name || 'Customer')}</strong> booked <strong>${escapeHtml(lead.serviceType || 'RO Service')}</strong> in ${escapeHtml(lead.locality || 'Lucknow')}${lead.phone ? ' • 📞 ' + escapeHtml(lead.phone) : ''}${unreadCount > 0 ? ` • ${unreadCount} unread` : ''}`)
      : (hi
          ? `धन्यवाद <strong>${escapeHtml(lead.name || '')}</strong>! <strong>${escapeHtml(lead.locality || 'लखनऊ')}</strong> के लिए अश्वनी तिवारी व प्यूरोफिक्स टीम को तुरंत सूचना भेज दी गई है।`
          : `Thank you <strong>${escapeHtml(lead.name || '')}</strong>! Instant notification sent to Ashwani Tiwari &amp; Purofix Dispatch for <strong>${escapeHtml(lead.locality || 'Lucknow')}</strong>.`);

    const callHelplineLabel = `${tI18n('wea.callHelpline', '📞 Call')} +91 9250332918`;
    const actionsHtml = isOwnerMode
      ? `
        <a href="purofix-admin.html?lead=${encodeURIComponent(lead.id || '')}&tab=leads" class="wea-btn primary">${escapeHtml(tI18n('wea.openCrm', '📋 Open Admin CRM'))}</a>
        ${lead.phone ? `<a href="tel:+91${escapeHtml(String(lead.phone).replace(/[^0-9]/g, '').slice(-10))}" class="wea-btn whatsapp">${escapeHtml(tI18n('wea.callCust', '📞 Call Customer'))}</a>` : ''}
      `
      : `
        ${waUrl ? `<a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener" class="wea-btn whatsapp">${escapeHtml(tI18n('wea.waContinue', '📲 Continue on WhatsApp'))}</a>` : ''}
        <a href="tel:+919250332918" class="wea-btn primary" data-sync-phone="primary">${escapeHtml(callHelplineLabel)}</a>
      `;

    el.innerHTML = `
      <div class="wea-top">
        <div class="wea-bell" aria-hidden="true">🔔</div>
        <div class="wea-body">
          <div class="wea-title">${title}</div>
          <div class="wea-desc">${desc}</div>
        </div>
        <button type="button" class="wea-close" aria-label="Dismiss notification">&times;</button>
      </div>
      <div class="wea-actions">${actionsHtml}</div>
    `;
    el.querySelector('.wea-close')?.addEventListener('click', hideWebsiteEnquiryAlert);
    el.classList.add('active');
    if (websiteAlertTimer) clearTimeout(websiteAlertTimer);
    websiteAlertTimer = setTimeout(hideWebsiteEnquiryAlert, isOwnerMode ? 12000 : 8500);
  }

  function showToast(message, duration = 3500) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('active');
    setTimeout(() => {
      toastEl.classList.remove('active');
    }, duration);
  }

  // Dialog Controls
  function openBookingModal(preselectedService = null) {
    if (!bookingDialog) return;
    if (preselectedService && modalServiceSelect) {
      const target = preselectedService.toLowerCase().trim();
      let matchedIndex = -1;
      for (let i = 0; i < modalServiceSelect.options.length; i++) {
        if (modalServiceSelect.options[i].value.toLowerCase().trim() === target) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex === -1) {
        for (let i = 0; i < modalServiceSelect.options.length; i++) {
          if (modalServiceSelect.options[i].value.toLowerCase().includes(target) ||
              modalServiceSelect.options[i].text.toLowerCase().includes(target)) {
            matchedIndex = i;
            break;
          }
        }
      }
      if (matchedIndex !== -1) {
        modalServiceSelect.selectedIndex = matchedIndex;
      }
    }
    if (typeof bookingDialog.showModal === 'function') {
      bookingDialog.showModal();
    } else {
      bookingDialog.setAttribute('open', '');
    }
  }

  function closeBookingModal() {
    if (!bookingDialog) return;
    if (typeof bookingDialog.close === 'function') {
      bookingDialog.close();
    } else {
      bookingDialog.removeAttribute('open');
    }
  }

  if (bookingDialog) {
    bookingDialog.addEventListener('click', (event) => {
      const rect = bookingDialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        closeBookingModal();
      }
    });
  }

  if (closeDialogBtn) {
    closeDialogBtn.addEventListener('click', closeBookingModal);
  }

  // Mobile Drawer Controls
  function openDrawer() {
    if (mobileDrawer) mobileDrawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuToggle) menuToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }

  // Desktop Dropdown Click Toggle, Outside Click & Keyboard Close
  const navDropdowns = document.querySelectorAll('.nav-dropdown');
  if (navDropdowns.length) {
    navDropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.nav-dropdown-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('active');
        navDropdowns.forEach(d => {
          d.classList.remove('active');
          const t = d.querySelector('.nav-dropdown-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          dropdown.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          dropdown.classList.remove('active');
          trigger.setAttribute('aria-expanded', 'false');
        });
      });
    });

    document.addEventListener('click', (e) => {
      navDropdowns.forEach(dropdown => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
          const t = dropdown.querySelector('.nav-dropdown-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navDropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
          const t = dropdown.querySelector('.nav-dropdown-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  function estimateServiceRevenue(serviceStr) {
    const s = String(serviceStr || '').toLowerCase();
    if (s.includes('4999') || s.includes('commercial')) return 4999;
    if (s.includes('2899') || s.includes('comprehensive amc')) return 2899;
    if (s.includes('1499') || s.includes('amc')) return 1499;
    if (s.includes('699') || s.includes('premium')) return 699;
    if (s.includes('499') || s.includes('install')) return 499;
    if (s.includes('399') || s.includes('standard')) return 399;
    return 199;
  }

  // Form Submissions -> Saved to PurofixCore CRM + Opened in WhatsApp!
  function handleHeroFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('heroName').value.trim();
    const phone = document.getElementById('heroPhone').value.trim();
    const service = document.getElementById('heroService').value;
    const brand = document.getElementById('heroBrand').value;
    const area = document.getElementById('heroArea').value.trim();

    if (!name || !phone || !service || !brand || !area) {
      alert(isHiLang() ? 'कृपया सभी आवश्यक जानकारी भरें।' : 'Please fill all required fields.');
      return;
    }

    // Save in CRM
    const quotedRev = estimateServiceRevenue(service);
    const newLead = window.PurofixCore.addLead({
      name,
      phone,
      whatsapp: phone,
      locality: area,
      address: area,
      serviceType: service,
      brand,
      revenue: quotedRev,
      amountPaid: 0,
      paymentMode: 'Pending',
      paymentStatus: 'Pending',
      leadSource: 'Homepage Hero Form',
      status: 'New Lead'
    });

    // Prefilled WhatsApp message
    const waText = `Hello Purofix Team,

I want to book an RO service in Lucknow.

My Name: ${name}
My Contact: +91 ${phone}
My Location: ${area}
My RO Brand: ${brand}
My Problem: ${service}

Please confirm the 30-minute technician dispatch.

Thank you.`;

    const settings = window.PurofixCore.getSettings();
    const waUrl = window.PurofixCore.getWhatsAppUrl(settings.whatsappNumber || '9250332918', waText);

    window.PurofixCore.playNotificationChime();
    showWebsiteEnquiryAlert({ lead: newLead, mode: 'customer', waUrl });
    showToast(isHiLang()
      ? `✅ बुकिंग ${newLead.id} कन्फर्म हो गई! अश्वनी तिवारी से व्हाट्सएप पर जुड़ रहे हैं...`
      : `✅ Booking ${newLead.id} confirmed! Connecting with Ashwani Tiwari on WhatsApp...`);
    document.getElementById('heroBookingForm').reset();

    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 700);
  }

  function handleModalFormSubmit(e) {
    e.preventDefault();
    const service = document.getElementById('modalService').value;
    const name = document.getElementById('modalName').value.trim();
    const phone = document.getElementById('modalPhone').value.trim();
    const brand = document.getElementById('modalBrand').value;
    const slot = document.getElementById('modalSlot').value;
    const address = document.getElementById('modalAddress').value.trim();

    if (!name || !phone || !service || !brand || !address) {
      alert(isHiLang() ? 'कृपया सभी आवश्यक जानकारी भरें।' : 'Please fill all required fields.');
      return;
    }

    // Save in CRM
    const quotedRev = estimateServiceRevenue(service);
    const newLead = window.PurofixCore.addLead({
      name,
      phone,
      whatsapp: phone,
      locality: address,
      address,
      serviceType: service,
      brand,
      revenue: quotedRev,
      amountPaid: 0,
      paymentMode: 'Pending',
      paymentStatus: 'Pending',
      notes: `Preferred Slot: ${slot}`,
      leadSource: 'Modal Booking Engine',
      status: 'New Lead'
    });

    closeBookingModal();

    const waText = `Hello Purofix Team,

I want to book an RO service in Lucknow.

My Name: ${name}
My Phone: +91 ${phone}
My Location: ${address}
My RO Brand: ${brand}
Service: ${service}
Preferred Slot: ${slot}

Please confirm the booking.

Thank you.`;

    const settings = window.PurofixCore.getSettings();
    const waUrl = window.PurofixCore.getWhatsAppUrl(settings.whatsappNumber || '9250332918', waText);

    window.PurofixCore.playNotificationChime();
    showWebsiteEnquiryAlert({ lead: newLead, mode: 'customer', waUrl });
    showToast(isHiLang()
      ? `✅ बुकिंग ${newLead.id} दर्ज हो गई! व्हाट्सएप खोल रहे हैं...`
      : `✅ Booking ${newLead.id} registered! Opening WhatsApp...`);
    document.getElementById('modalBookingForm').reset();

    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 600);
  }

  // Pincode & Locality Availability Checker (Lucknow)
  function checkPincode(e, isSilent = false) {
    if (e) e.preventDefault();
    const input = document.getElementById('pincodeInput');
    const resultBox = document.getElementById('pincodeResult');
    if (!input || !resultBox) return;

    const val = input.value.trim();
    if (!val) return;

    const lowerVal = val.toLowerCase();
    const primaryHubTerms = ['226028', 'juggaur', 'tiwariganj', 'chinhat', 'matiyari', 'bbd', 'faizabad road', 'ayodhya road', 'kamta', 'semra'];
    const fastHubTerms = ['226010', '226016', '226024', '226006', 'gomti nagar', 'vibhuti khand', 'vipin khand', 'patrakarpuram', 'sushant golf', 'indira nagar', 'munshipulia', 'bhootnath', 'aliganj', 'mahanagar', 'kapoorthala', 'nirala nagar', 'nishatganj', 'polytechnic', 'takrohi'];
    const widerLucknowTerms = ['226001', '226002', '226003', '226004', '226005', '226011', '226012', '226014', '226017', '226018', '226020', '226021', '226022', '226023', '226025', '226029', '226030', '226031', 'hazratganj', 'alambagh', 'ashiyana', 'jankipuram', 'vikas nagar', 'kursi road', 'kanpur road', 'rajajipuram', 'vrindavan', 'telibagh', 'charbagh', 'aminabad', 'krishna nagar', 'transport nagar', 'shaheed path', 'para', 'tedhi pulia', 'chowk', 'thakurganj', 'lucknow'];

    const isPrimaryHub = primaryHubTerms.some(t => lowerVal.includes(t));
    const isFastHub = fastHubTerms.some(t => lowerVal.includes(t));
    const isLucknowPin = /^2260\d{2}$/.test(lowerVal.replace(/\s+/g, '')) || widerLucknowTerms.some(t => lowerVal.includes(t));

    resultBox.style.display = 'flex';
    resultBox.className = 'pincode-result available';

    const hi = isHiLang();
    if (isPrimaryHub) {
      resultBox.innerHTML = hi
        ? `
          <span>⚡ <strong>"${escapeHtml(val)}" के लिए मुख्य कार्यालय ज़ोन सक्रिय!</strong> ए-401 जुग्गौर, तिवारीगंज हब से सीधा डिस्पैच। लक्ष्य आगमन: <strong>20–30 मिनट</strong>।</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">30-मिनट प्राथमिकता स्लॉट बुक करें</button>
        `
        : `
          <span>⚡ <strong>Head Office Zone Active for "${escapeHtml(val)}"!</strong> Dispatched directly from our A-401 Juggaur, Tiwariganj hub. Target arrival: <strong>20 - 30 mins</strong>.</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">Book 30-Min Priority Slot</button>
        `;
      if (!isSilent) showToast(hi ? `${val} के लिए 30-मिनट प्राथमिकता सेवा उपलब्ध है!` : `Priority 30-min coverage verified for ${val}!`);
    } else if (isFastHub) {
      resultBox.innerHTML = hi
        ? `
          <span>⚡ <strong>"${escapeHtml(val)}" में सक्रिय हब सेवा!</strong> प्यूरोफिक्स इंजीनियर आपके पास ही मौजूद हैं। लक्ष्य आगमन: <strong>~30 मिनट</strong>।</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">30-मिनट विज़िट बुक करें</button>
        `
        : `
          <span>⚡ <strong>Active Hub Service in "${escapeHtml(val)}"!</strong> Purofix field engineers nearby. Target arrival: <strong>~30 mins</strong> (subject to traffic).</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">Book 30-Min Visit</button>
        `;
      if (!isSilent) showToast(hi ? `${val} में तेज़ हब सेवा सत्यापित!` : `Fast hub coverage verified for ${val}!`);
    } else if (isLucknowPin) {
      resultBox.innerHTML = hi
        ? `
          <span>⚡ <strong>"${escapeHtml(val)}" में डोरस्टेप सेवा सक्रिय!</strong> प्यूरोफिक्स इंजीनियर पूरे लखनऊ में प्रतिदिन कार्यरत हैं। आगमन: <strong>30–45 मिनट</strong>।</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">डोरस्टेप विज़िट बुक करें</button>
        `
        : `
          <span>⚡ <strong>Doorstep Coverage Active in "${escapeHtml(val)}"!</strong> Purofix engineers operate daily across Lucknow. Typical arrival: <strong>30 - 45 mins</strong>.</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">Book Doorstep Visit</button>
        `;
      if (!isSilent) showToast(hi ? `${val} के लिए लखनऊ सेवा उपलब्ध!` : `Lucknow coverage verified for ${val}!`);
    } else {
      resultBox.innerHTML = hi
        ? `
          <span>📍 <strong>"${escapeHtml(val)}" की सेवा जांच के लिए:</strong> कृपया डोरस्टेप उपलब्धता की पुष्टि हेतु अश्वनी तिवारी को कॉल या मैसेज करें।</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">कॉलबैक अनुरोध करें</button>
        `
        : `
          <span>📍 <strong>Not sure if "${escapeHtml(val)}" is inside Lucknow Municipal Zone?</strong> Message or call Ashwani Tiwari directly to confirm doorstep availability.</span>
          <button class="btn btn-sm btn-primary" onclick="window.ROApp.openBookingModalWithArea('${escapeHtml(val)}')">Request Callback</button>
        `;
      if (!isSilent) showToast(hi ? `${val} की उपलब्धता जांचने के लिए कॉलबैक बुक करें।` : `Request callback to verify coverage for ${val}.`);
    }
  }

  function openBookingModalWithArea(area) {
    openBookingModal();
    const areaInput = document.getElementById('modalAddress');
    if (areaInput) areaInput.value = area;
  }

  // Price Estimator
  function calculateEstimate() {
    const brand = document.getElementById('estBrand')?.value || 'Kent';
    const service = document.getElementById('estService')?.value || 'general';

    const priceEl = document.getElementById('estPriceDisplay');
    const noteEl = document.getElementById('estNoteDisplay');
    const timeEl = document.getElementById('estTimeDisplay');
    const warrantyEl = document.getElementById('estWarrantyDisplay');

    let price = '₹199';
    let note = '₹199 Visit Fee • Rate discussed & agreed on visit';
    let time = 'Target Under 30 Mins';
    let warranty = '30 Days 100% Satisfaction';

    switch (service) {
      case 'inspection':
        price = '₹199';
        note = '100% Waived if repair/service availed';
        time = 'Target Under 30 Mins';
        warranty = '30-Day Service Guarantee';
        break;
      case 'general':
        price = '₹199 Visit';
        note = 'Full service charge agreed directly on-site';
        time = '30 - 45 Mins Arrival';
        warranty = '30 Days Service Guarantee';
        break;
      case 'filters':
        price = 'Quote on Visit';
        note = 'Genuine filter kit options discussed with you';
        time = 'Target Under 30 Mins';
        warranty = 'Full Manufacturer Filter Warranty';
        break;
      case 'membrane':
        price = 'Quote on Visit';
        note = 'High-rejection membrane suited to your water TDS';
        time = 'Target Under 30 Mins';
        warranty = '12 Months Rejection Warranty';
        break;
      case 'pump':
        price = 'Quote on Visit';
        note = 'Tested on-site; heavy copper motor options';
        time = 'Target Under 30 Mins';
        warranty = '12 Months Heavy Motor Warranty';
        break;
      case 'installation':
        price = 'Quote on Visit';
        note = 'Surveyed on-site based on plumbing location';
        time = 'Target Under 30 Mins';
        warranty = '30 Days Leak-Free Guarantee';
        break;
      default:
        price = '₹199';
        note = '₹199 Visit Fee • Rate agreed on visit';
        time = 'Target Under 30 Mins';
        warranty = '30 Days Service Guarantee';
        break;
    }

    if (priceEl) priceEl.textContent = price;
    if (noteEl) noteEl.textContent = note;
    if (timeEl) timeEl.textContent = time;
    if (warrantyEl) warrantyEl.textContent = warranty;
  }

  function bookEstimatedService() {
    const serviceMap = {
      'inspection': 'Doorstep Diagnostic Inspection Visit (₹199)',
      'general': 'RO General Service & Sanitization',
      'filters': 'Filter & Membrane Replacement',
      'membrane': 'RO Membrane Replacement',
      'pump': 'Booster Pump & Motor Breakdown',
      'installation': 'RO Installation / Relocation'
    };
    const serviceKey = document.getElementById('estService')?.value || 'general';
    openBookingModal(serviceMap[serviceKey] || 'Doorstep RO Service');
  }

  // Interactive TDS Tool
  function updateTdsTool(value) {
    if (!tdsNumber) return;
    tdsNumber.textContent = value;
    tdsStatusPill.classList.remove('warning', 'danger');

    if (value < 100) {
      tdsStatusPill.textContent = tI18n('tds.low.pill', 'Very Low Minerals (50-100 PPM)');
      tdsStatusPill.className = 'result-status-pill warning';
      tdsCategoryTitle.textContent = tI18n('tds.low.title', 'Demineralized Water');
      tdsDescription.textContent = tI18n('tds.low.desc', 'Water below 100 PPM lacks essential minerals (calcium, magnesium). Prolonged consumption may cause taste flatness and lack essential daily electrolytes.');
      tdsAdvice.textContent = tI18n('tds.low.advice', 'Recommended: Install a Mineral Cartridge or Alkaline Booster to enrich vital minerals back into your water.');
    } else if (value <= 300) {
      tdsStatusPill.textContent = tI18n('tds.good.pill', 'Optimal Drinking Range (100-300 PPM)');
      tdsStatusPill.className = 'result-status-pill';
      tdsCategoryTitle.textContent = tI18n('tds.good.title', 'Excellent & Balanced Drinking Water');
      tdsDescription.textContent = tI18n('tds.good.desc', 'This is the gold standard for drinking water as per WHO & BIS guidelines. It has high clarity, crisp taste, and optimal biological mineral balance.');
      tdsAdvice.textContent = tI18n('tds.good.advice', 'Technician Advice: Your system is working ideally. Keep standard 90-day pre-filter replacement schedule.');
    } else if (value <= 600) {
      tdsStatusPill.textContent = tI18n('tds.warn.pill', 'Fair / High Mineral (300-600 PPM)');
      tdsStatusPill.className = 'result-status-pill warning';
      tdsCategoryTitle.textContent = tI18n('tds.warn.title', 'Hard / Moderately High TDS in Lucknow');
      tdsDescription.textContent = tI18n('tds.warn.desc', 'Common in Gomti Nagar & Chinhat borewell lines. Causes scaling and bad taste. Membrane pore inspection advised.');
      tdsAdvice.textContent = tI18n('tds.warn.advice', 'Recommended: Inspect your RO membrane. Membrane pores may have choked, letting dissolved solids bypass.');
    } else {
      tdsStatusPill.textContent = tI18n('tds.danger.pill', 'Poor Quality / Unsafe (600-1500+ PPM)');
      tdsStatusPill.className = 'result-status-pill danger';
      tdsCategoryTitle.textContent = tI18n('tds.danger.title', 'Very Hard / Hazardous Water');
      tdsDescription.textContent = tI18n('tds.danger.desc', 'Exceeds safe limits. Heavy salt & mineral burden. High scaling risk for kidneys and appliances.');
      tdsAdvice.textContent = tI18n('tds.danger.advice', 'Urgent: Complete RO overhaul required. Choked membrane replacement and pump pressure calibration needed immediately.');
    }
  }

  if (tdsSlider) {
    tdsSlider.addEventListener('input', (e) => {
      updateTdsTool(parseInt(e.target.value, 10));
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (btn && answer) {
      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(other => {
          other.classList.remove('active');
          const otherAnswer = other.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        });

        if (!isActive) {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Sync configurable contact numbers, review link, address & SEO metadata from Admin Settings
  function syncPublicSettings() {
    if (!window.PurofixCore || typeof window.PurofixCore.getSettings !== 'function') return;
    const s = window.PurofixCore.getSettings();
    if (!s) return;

    const cleanPhone = String(s.primaryPhone || '9250332918').replace(/[^0-9]/g, '').slice(-10) || '9250332918';
    const cleanWa = String(s.whatsappNumber || cleanPhone).replace(/[^0-9]/g, '').slice(-10) || cleanPhone;
    const formattedPhone = `+91 ${cleanPhone}`;

    document.querySelectorAll('a[href^="tel:+9192503"], a[data-sync-phone="primary"]').forEach(el => {
      el.setAttribute('href', `tel:+91${cleanPhone}`);
      const label = el.querySelector('.sync-phone-text') || (el.classList.contains('header-pill-phone') || el.classList.contains('btn-bottom-phone') ? el.querySelector('span') : null);
      if (label) label.textContent = formattedPhone;
    });

    document.querySelectorAll('.sync-phone-text').forEach(el => {
      el.textContent = formattedPhone;
    });

    document.querySelectorAll('a[href*="wa.me/"]').forEach(el => {
      const href = el.getAttribute('href') || '';
      const qIndex = href.indexOf('?text=');
      const query = qIndex !== -1 ? href.slice(qIndex) : '';
      el.setAttribute('href', `https://wa.me/91${cleanWa}${query}`);
    });

    if (s.googleReviewUrl) {
      document.querySelectorAll('a[data-review-link="google"], .google-reviews-count-link, .btn-google-review').forEach(el => {
        el.setAttribute('href', s.googleReviewUrl);
      });
    }

    if (s.address) {
      document.querySelectorAll('.sync-address').forEach(el => {
        el.textContent = s.address;
      });
    }

    if (s.metaTitle && localStorage.getItem('purofix_settings_db_v2')) {
      document.title = s.metaTitle;
    }
    if (s.metaDescription && localStorage.getItem('purofix_settings_db_v2')) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', s.metaDescription);
    }
    if (s.metaKeywords && localStorage.getItem('purofix_settings_db_v2')) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metaKeywords.setAttribute('content', s.metaKeywords);
    }
  }

  const LUCKNOW_MAP_HUBS = {
    tiwariganj: {
      badge: '📍 HEAD OFFICE HUB • FASTEST DISPATCH',
      title: 'Tiwariganj, Juggaur & Chinhat (226028)',
      desc: 'Central operations base led by Ashwani Tiwari. Engineers dispatch directly from A-401 Juggaur with spare filters, membranes & digital TDS meters.',
      eta: '20–30 Minutes',
      pincodes: '226028, 226019',
      areas: 'A-401 Juggaur, Tiwariganj, Chinhat Chauraha, Matiyari, BBD University, Kamta, Deva Rd',
      address: 'A-401, Juggaur, Tiwariganj, Lucknow 226028',
      bookArea: 'Tiwariganj & Juggaur (226028)',
      pageUrl: 'ro-service-tiwariganj-chinhat.html',
      gmapsUrl: 'https://www.google.com/maps/search/?api=1&query=26.8924,81.0543'
    },
    gomti: {
      badge: '⚡ HIGH-DEMAND ZONE HUB',
      title: 'Gomti Nagar & Extension (226010)',
      desc: 'Dedicated doorstep RO repair & annual filter maintenance across all Gomti Nagar Khands, Shaheed Path & Amar Shaheed Path apartments.',
      eta: '~30 Minutes',
      pincodes: '226010, 226030',
      areas: 'Vibhuti Khand, Vipin Khand, Patrakarpuram, Vishal Khand, Virat Khand, Vijayant Khand, Sushant Golf City',
      address: 'Active Zone Coverage from Faizabad Rd & Shaheed Path',
      bookArea: 'Gomti Nagar (226010)',
      pageUrl: 'ro-service-gomti-nagar.html',
      gmapsUrl: 'https://www.google.com/maps/search/?api=1&query=Gomti+Nagar+Lucknow+226010'
    },
    indira: {
      badge: '🔵 ACTIVE RESIDENTIAL ZONE',
      title: 'Indira Nagar & Ring Road (226016)',
      desc: 'Fast RO pump, adapter & pre-filter servicing near Munshipulia, Bhootnath Market & Polytechnic Chauraha.',
      eta: '~30 Minutes',
      pincodes: '226016',
      areas: 'Munshipulia, Bhootnath Market, Polytechnic Chauraha, Sector A-D, Lekhraj, Takrohi, Ismailganj',
      address: 'Ring Road & Ayodhya Road Corridor, Indira Nagar',
      bookArea: 'Indira Nagar (226016)',
      pageUrl: 'ro-service-indira-nagar.html',
      gmapsUrl: 'https://www.google.com/maps/search/?api=1&query=Indira+Nagar+Lucknow+226016'
    },
    aliganj: {
      badge: '🔵 NORTH LUCKNOW ZONE',
      title: 'Aliganj, Jankipuram & Mahanagar',
      desc: 'Borewell TDS calibration, genuine Filmtec/Toray membrane changes & tank sanitization across North Lucknow sectors.',
      eta: '30–40 Minutes',
      pincodes: '226024, 226021, 226022, 226006',
      areas: 'Aliganj Sectors, Jankipuram Vistar, Vikas Nagar, Kursi Road, Kapoorthala, Tedhi Pulia, Mahanagar',
      address: 'Ring Road & Kursi Road Corridor, North Lucknow',
      bookArea: 'Aliganj & Jankipuram, Lucknow',
      pageUrl: 'ro-service-aliganj-jankipuram.html',
      gmapsUrl: 'https://www.google.com/maps/search/?api=1&query=Aliganj+Lucknow+226024'
    },
    alambagh: {
      badge: '🔵 SOUTH LUCKNOW ZONE',
      title: 'Alambagh, Ashiyana & Charbagh',
      desc: 'Same-day technician visits along Kanpur Road, LDA Colony, Vrindavan Yojna & Ashiyana Sectors with upfront rate card.',
      eta: '30–45 Minutes',
      pincodes: '226005, 226012, 226017, 226002, 226029',
      areas: 'Alambagh, Ashiyana, Krishna Nagar, Vrindavan Yojna, Telibagh, Rajajipuram, Transport Nagar',
      address: 'Shaheed Path & Kanpur Road Corridor, South Lucknow',
      bookArea: 'Alambagh & Ashiyana, Lucknow',
      pageUrl: 'ro-service-alambagh-ashiyana.html',
      gmapsUrl: 'https://www.google.com/maps/search/?api=1&query=Alambagh+Lucknow+226005'
    },
    hazratganj: {
      badge: '🔵 CENTRAL LUCKNOW ZONE',
      title: 'Hazratganj, Chowk & Central Lucknow',
      desc: 'Complete domestic & commercial RO repair, installation & leakage checks across Central Lucknow daily 8 AM to 9 PM.',
      eta: '30–45 Minutes',
      pincodes: '226001, 226003, 226004, 226018, 226020',
      areas: 'Hazratganj, Aminabad, Lalbagh, Gokhale Marg, Butler Palace, Chowk, Nishatganj, Sadar Cantt',
      address: 'Central Lucknow Coverage Corridor',
      bookArea: 'Hazratganj & Central Lucknow',
      pageUrl: 'ro-service-gomti-nagar.html',
      gmapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hazratganj+Lucknow+226001'
    }
  };

  let activeMapHubKey = 'tiwariganj';

  function selectMapHub(hubKey) {
    const hub = LUCKNOW_MAP_HUBS[hubKey];
    if (!hub) return;
    activeMapHubKey = hubKey;

    document.querySelectorAll('.map-hub-btn, .map-pin-btn').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-hub') === hubKey);
    });

    const hiHub = (window.PurofixI18n && typeof window.PurofixI18n.getMapHubTranslation === 'function')
      ? window.PurofixI18n.getMapHubTranslation(hubKey)
      : null;

    const settings = window.PurofixCore ? window.PurofixCore.getSettings() : null;
    const badgeEl = document.getElementById('mapHubBadge');
    const titleEl = document.getElementById('mapHubTitle');
    const descEl = document.getElementById('mapHubDesc');
    const etaEl = document.getElementById('mapHubEta');
    const pinEl = document.getElementById('mapHubPincodes');
    const areasEl = document.getElementById('mapHubAreas');
    const addrEl = document.getElementById('mapHubAddress');
    const bookBtn = document.getElementById('mapHubBookBtn');
    const pageLink = document.getElementById('mapHubPageLink');
    const gmapsLink = document.getElementById('mapHubGmapsLink');

    if (badgeEl) badgeEl.textContent = (hiHub && hiHub.badge) || hub.badge;
    if (titleEl) titleEl.textContent = (hiHub && hiHub.title) || hub.title;
    if (descEl) descEl.textContent = (hiHub && hiHub.desc) || hub.desc;
    if (etaEl) etaEl.textContent = (hiHub && hiHub.eta) || hub.eta;
    if (pinEl) pinEl.textContent = hub.pincodes;
    if (areasEl) areasEl.textContent = (hiHub && hiHub.areas) || hub.areas;
    if (addrEl) addrEl.textContent = (hubKey === 'tiwariganj' && settings && settings.address) ? settings.address : hub.address;
    if (bookBtn) {
      bookBtn.setAttribute('onclick', `window.ROApp.openBookingModalWithArea('${hub.bookArea.replace(/'/g, "\\'")}')`);
    }
    if (pageLink) pageLink.setAttribute('href', hub.pageUrl);
    if (gmapsLink) gmapsLink.setAttribute('href', hub.gmapsUrl);
  }

  let deferredPwaPrompt = null;

  function openPwaInstallModal() {
    let dialog = document.getElementById('pwaInstallDialog');
    const ua = navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const lang = (window.PurofixI18n && typeof window.PurofixI18n.getLang === 'function')
      ? window.PurofixI18n.getLang()
      : 'en';
    const hi = lang === 'hi';

    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'pwaInstallDialog';
      dialog.className = 'pwa-install-dialog';
      dialog.addEventListener('click', (ev) => {
        if (ev.target === dialog && typeof dialog.close === 'function') dialog.close();
      });
      document.body.appendChild(dialog);
    }

    if (dialog.dataset.lang !== lang) {
      dialog.dataset.lang = lang;
      const stepsHtml = isIos
        ? (hi
            ? `
              <div class="pwa-step-row"><span class="pwa-step-num">1</span><span>Safari के नीचे या ऊपर <strong>शेयर आइकन (□↑)</strong> पर टैप करें।</span></div>
              <div class="pwa-step-row"><span class="pwa-step-num">2</span><span>नीचे स्क्रॉल करके <strong>"Add to Home Screen"</strong> और फिर <strong>Add</strong> पर टैप करें।</span></div>
            `
            : `
              <div class="pwa-step-row"><span class="pwa-step-num">1</span><span>Tap the <strong>Share icon (□↑)</strong> in Safari's bottom or top bar.</span></div>
              <div class="pwa-step-row"><span class="pwa-step-num">2</span><span>Scroll slightly and tap <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong>.</span></div>
            `)
        : isAndroid
          ? (hi
              ? `
                <div class="pwa-step-row"><span class="pwa-step-num">1</span><span>स्क्रीन के ऊपर दाईं ओर Chrome मेनू <strong>(⋮)</strong> पर टैप करें।</span></div>
                <div class="pwa-step-row"><span class="pwa-step-num">2</span><span>फोन में 1-क्लिक बुकिंग के लिए <strong>"Install app"</strong> या <strong>"Add to Home screen"</strong> पर टैप करें।</span></div>
              `
              : `
                <div class="pwa-step-row"><span class="pwa-step-num">1</span><span>Tap Chrome menu <strong>(⋮)</strong> in the top-right corner of your screen.</span></div>
                <div class="pwa-step-row"><span class="pwa-step-num">2</span><span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> for instant 1-tap booking on your phone.</span></div>
              `)
          : (hi
              ? `
                <div class="pwa-step-row"><span class="pwa-step-num">1</span><span>Chrome/Edge एड्रेस बार के दाईं ओर <strong>इंस्टॉल आइकन (⊕)</strong> दबाएं या <strong>(⋮) → Cast, save, and share → Install Purofix RO</strong> चुनें।</span></div>
                <div class="pwa-step-row"><span class="pwa-step-num">2</span><span>अपने Android फोन में Chrome पर वेबसाइट खोलकर 1-क्लिक में ऐप जोड़ने के लिए <strong>+ ऐप इंस्टॉल करें</strong> दबाएं।</span></div>
              `
              : `
                <div class="pwa-step-row"><span class="pwa-step-num">1</span><span>Click the <strong>Install icon (⊕)</strong> on the right side of Chrome/Edge address bar, or open menu <strong>(⋮) → Cast, save, and share → Install Purofix RO</strong>.</span></div>
                <div class="pwa-step-row"><span class="pwa-step-num">2</span><span>On your Android phone, open <strong>purofix.com</strong> in Chrome and tap <strong>+ Install App</strong> for one-click app setup.</span></div>
              `);

      dialog.innerHTML = `
        <div class="pwa-install-card">
          <div class="pwa-install-head">
            <img src="assets/pwa-icon-192.png" alt="Purofix Mobile App Icon">
            <div>
              <h3>${escapeHtml(tI18n('pwa.title', 'Install Purofix RO Mobile App'))}</h3>
              <p>${escapeHtml(tI18n('pwa.sub', 'Fast 30-Min Booking, Map, TDS Check & App Alerts Offline-Ready'))}</p>
            </div>
            <button type="button" class="pwa-install-close-btn" id="pwaDialogCloseBtn" aria-label="Close install dialog">&times;</button>
          </div>
          <div class="pwa-install-steps">${stepsHtml}</div>
          <div class="pwa-install-actions">
            <button type="button" class="btn-mockup-blue" id="pwaDialogCopyBtn" style="width:100%;">
              <span>${escapeHtml(tI18n('pwa.copyBtn', '📋 Copy App Link (Open in Mobile Chrome)'))}</span>
            </button>
            <button type="button" class="btn btn-outline" id="pwaDialogDoneBtn" style="width:100%;">${escapeHtml(tI18n('pwa.doneBtn', 'Got It'))}</button>
          </div>
        </div>
      `;
      dialog.querySelector('#pwaDialogCloseBtn')?.addEventListener('click', () => dialog.close?.());
      dialog.querySelector('#pwaDialogDoneBtn')?.addEventListener('click', () => dialog.close?.());
      dialog.querySelector('#pwaDialogCopyBtn')?.addEventListener('click', () => {
        const shareUrl = window.location.href.split('#')[0];
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast(isHiLang()
              ? '✅ प्यूरोफिक्स ऐप लिंक कॉपी हो गया! इंस्टॉल करने के लिए मोबाइल Chrome में खोलें।'
              : '✅ Purofix App link copied! Paste in Chrome on your mobile to install.');
          }).catch(() => showToast((isHiLang() ? 'ℹ️ शेयर लिंक: ' : 'ℹ️ Share URL: ') + shareUrl));
        } else {
          showToast((isHiLang() ? 'ℹ️ लिंक: ' : 'ℹ️ URL: ') + shareUrl);
        }
      });
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  async function promptPwaInstall() {
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (isStandalone) {
      showToast(isHiLang()
        ? '✅ प्यूरोफिक्स ऐप आपकी होम स्क्रीन पर पहले से इंस्टॉल है!'
        : '✅ Purofix App is already installed on your home screen!');
      return;
    }
    const hasGesture = !navigator.userActivation || navigator.userActivation.isActive;
    if (deferredPwaPrompt && hasGesture) {
      try {
        await deferredPwaPrompt.prompt();
        const choice = await deferredPwaPrompt.userChoice;
        deferredPwaPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          showToast(isHiLang()
            ? '📲 प्यूरोफिक्स आरओ ऐप आपकी होम स्क्रीन पर इंस्टॉल हो रहा है!'
            : '📲 Installing Purofix RO App to your home screen!');
        }
        return;
      } catch (e) {
        deferredPwaPrompt = null;
      }
    }
    openPwaInstallModal();
  }

  function renderCustomReviews() {
    const grid = document.getElementById('reviewsGrid');
    if (!window.PurofixCore || typeof window.PurofixCore.getReviews !== 'function') return;

    const hi = isHiLang();
    const customReviews = window.PurofixCore.getReviews() || [];
    const total = customReviews.length;
    const avg = total
      ? (customReviews.reduce((sum, r) => sum + (Math.min(5, Math.max(1, parseInt(r.rating || 5, 10) || 5))), 0) / total).toFixed(1)
      : null;

    // Sync Honest Summary Banner & Hero Proof Card
    const sumScore = document.getElementById('reviewsSummaryScore');
    const sumStars = document.getElementById('reviewsSummaryStars');
    const sumCount = document.getElementById('reviewsSummaryCount');
    if (sumScore) sumScore.textContent = avg || '—';
    if (sumStars) sumStars.textContent = avg ? '★'.repeat(Math.round(parseFloat(avg))) : tI18n('rev.verifiedLocal', 'Verified Local Service');
    if (sumCount) {
      sumCount.textContent = total
        ? (hi
            ? `लखनऊ में ${total} असली ग्राहक समीक्षा${total > 1 ? 'ओं' : ''} पर आधारित`
            : `Based on ${total} real customer review${total > 1 ? 's' : ''} across Lucknow`)
        : tI18n('rev.emptyCount', 'No website reviews posted yet — be the first Lucknow customer to review Purofix!');
    }

    const socialScore = document.getElementById('socialReviewScore');
    const socialStars = document.getElementById('socialReviewStars');
    const socialCountLabel = document.getElementById('socialReviewCountLabel');
    if (socialScore) socialScore.textContent = avg || '—';
    if (socialStars) socialStars.textContent = avg ? '★'.repeat(Math.round(parseFloat(avg))) : tI18n('rev.verifiedShort', 'Verified');
    if (socialCountLabel) {
      socialCountLabel.textContent = total
        ? (hi ? `रेटिंग दें / ${total} समीक्षा` : `Rate Us / ${total} Review${total > 1 ? 's' : ''}`)
        : tI18n('rev.rateGoogle', 'Rate Us on Google');
    }

    if (!grid) return;
    grid.innerHTML = '';

    if (!total) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'reviews-empty-state';
      emptyEl.innerHTML = `
        <h3>${escapeHtml(tI18n('rev.emptyTitle', 'Genuine Customer Reviews Appear Here'))}</h3>
        <p>${escapeHtml(tI18n('rev.emptyDesc', 'We display only real customer feedback submitted here or verified by Ashwani Tiwari. Had your RO serviced recently?'))}</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="window.ROApp.toggleReviewForm()">${escapeHtml(tI18n('rev.emptyBtn', '✍️ Share Your First Real Review'))}</button>
      `;
      grid.appendChild(emptyEl);
      return;
    }

    const fragment = document.createDocumentFragment();
    customReviews.forEach(rev => {
      const card = document.createElement('div');
      card.className = 'review-card custom-user-review';
      const initials = (rev.name || 'LR')
        .split(/\s+/)
        .slice(0, 2)
        .map(part => (part[0] || '').toUpperCase())
        .join('') || 'LR';
      const starsCount = Math.min(5, Math.max(1, parseInt(rev.rating || 5, 10) || 5));
      const stars = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);
      const badgeLabel = rev.source === 'Admin Verified'
        ? tI18n('rev.badgeAdmin', '✓ Admin Logged Review')
        : tI18n('rev.badgeCust', '✓ Customer Submitted');

      card.innerHTML = `
        <div class="review-card-top">
          <div class="customer-avatar-initials blue">${escapeHtml(initials)}</div>
          <div class="customer-info-box">
            <strong class="customer-name">${escapeHtml(rev.name)}</strong>
            <span class="customer-loc">📍 ${escapeHtml(rev.locality)}</span>
          </div>
          <span class="verified-badge">${escapeHtml(badgeLabel)}</span>
        </div>
        <div class="review-stars">${stars}</div>
        <p class="review-text">"${escapeHtml(rev.text)}"</p>
        <div class="review-tag">⚡ ${escapeHtml(rev.serviceTag || 'RO Service')}${rev.createdAt ? ' • ' + escapeHtml(rev.createdAt) : ''}</div>
      `;
      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
  }

  function toggleReviewForm() {
    const panel = document.getElementById('publicReviewComposer');
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      const input = document.getElementById('revCustName');
      if (input) input.focus();
    }
  }

  function handlePublicReviewSubmit(e) {
    e.preventDefault();
    if (!window.PurofixCore || typeof window.PurofixCore.addReview !== 'function') return;

    const name = document.getElementById('revCustName')?.value.trim();
    const locality = document.getElementById('revCustLocality')?.value.trim();
    const rating = document.getElementById('revCustRating')?.value || '5';
    const serviceTag = document.getElementById('revCustService')?.value.trim() || 'RO Service';
    const text = document.getElementById('revCustText')?.value.trim();

    if (!name || !locality || !text) {
      alert(isHiLang() ? 'कृपया अपना नाम, लखनऊ क्षेत्र और अनुभव लिखें।' : 'Please enter your name, Lucknow area, and feedback.');
      return;
    }

    window.PurofixCore.addReview({
      name,
      locality,
      rating,
      serviceTag,
      text,
      source: 'Customer Submitted'
    });

    e.target.reset();
    const panel = document.getElementById('publicReviewComposer');
    if (panel) panel.style.display = 'none';

    renderCustomReviews();
    showToast(isHiLang() ? '✅ धन्यवाद! आपकी असली समीक्षा प्रकाशित हो गई है।' : '✅ Thank you! Your real review has been published & synced.');
  }

  function trackWhatsAppClicks() {
    document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
      link.addEventListener('click', () => {
        try {
          const count = parseInt(localStorage.getItem('purofix_wa_clicks_v2') || '0', 10) + 1;
          localStorage.setItem('purofix_wa_clicks_v2', String(count));
        } catch (err) {
          // Ignore storage quota errors
        }
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'inline-flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
      installBtn.classList.add('installed');
      installBtn.innerHTML = isHiLang() ? '<span>✓ ऐप इंस्टॉल हो गया</span>' : '<span>✓ App Installed</span>';
    }
    showToast(isHiLang() ? '✅ प्यूरोफिक्स आरओ ऐप आपके डिवाइस पर इंस्टॉल हो गया!' : '✅ Purofix RO App installed on your device!');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  function refreshLocalizedWidgets() {
    renderCustomReviews();
    if (document.getElementById('lucknowServiceMap')) {
      selectMapHub(activeMapHubKey);
    }
    if (tdsSlider) {
      updateTdsTool(parseInt(tdsSlider.value, 10));
    }
    const pinInput = document.getElementById('pincodeInput');
    const pinResult = document.getElementById('pincodeResult');
    if (pinInput && pinInput.value.trim() && pinResult && pinResult.style.display !== 'none') {
      checkPincode(null, true);
    }
  }

  // Global Public App Object
  window.ROApp = {
    openBookingModal,
    openBookingModalWithArea,
    closeBookingModal,
    closeDrawer,
    handleHeroFormSubmit,
    handleModalFormSubmit,
    checkPincode,
    calculateEstimate,
    bookEstimatedService,
    syncPublicSettings,
    renderCustomReviews,
    toggleReviewForm,
    handlePublicReviewSubmit,
    selectMapHub,
    promptPwaInstall,
    refreshLocalizedWidgets
  };

  function initScrollAnimations() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const selectors = [
      '.mockup-service-card',
      '.mockup-plan-card',
      '.social-card',
      '.brand-showcase-card',
      '.lucknow-map-shell',
      '.lucknow-zone-card',
      '.tds-result-card',
      '.amc-card',
      '.faq-item',
      '.closing-brand-banner'
    ];
    const targets = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!targets.length) return;

    const revealIfInView = (el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.96) {
        el.classList.add('is-visible');
        return true;
      }
      return false;
    };

    targets.forEach((el, idx) => {
      el.classList.add('reveal-on-scroll');
      el.style.setProperty('--reveal-delay', `${(idx % 4) * 65}ms`);
      revealIfInView(el);
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.06,
      rootMargin: '0px 0px -24px 0px'
    });

    targets.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });

    let scrollCheckTimer = null;
    window.addEventListener('scroll', () => {
      if (scrollCheckTimer) return;
      scrollCheckTimer = setTimeout(() => {
        scrollCheckTimer = null;
        targets.forEach((el) => {
          if (!el.classList.contains('is-visible') && revealIfInView(el)) {
            observer.unobserve(el);
          }
        });
      }, 80);
    }, { passive: true });
  }

  function initProofCounters() {
    const numEls = Array.from(document.querySelectorAll('.hero-proof-card .proof-number[data-count-to], .closing-proof-num[data-count-to]'));
    if (!numEls.length) return;

    const formatVal = (el, val) => {
      const prefix = el.getAttribute('data-count-prefix') || '';
      const suffix = el.getAttribute('data-count-suffix') || '';
      return `${prefix}${Math.round(val).toLocaleString('en-IN')}${suffix}`;
    };

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof window.requestAnimationFrame !== 'function') {
      numEls.forEach((el) => {
        const target = parseInt(el.getAttribute('data-count-to') || '0', 10);
        el.textContent = formatVal(el, target);
        el.classList.add('is-counted');
        el.closest('.hero-proof-card')?.classList.add('is-counted');
      });
      return;
    }

    const animateCounter = (el) => {
      if (el.dataset.animated === '1') return;
      el.dataset.animated = '1';
      const target = Math.max(1, parseInt(el.getAttribute('data-count-to') || '1', 10));
      const isLarge = target >= 1000;
      const duration = target >= 10000 ? 2950 : isLarge ? 2550 : target >= 100 ? 1850 : 1450;
      const warmLimit = isLarge ? Math.min(48, Math.max(18, Math.round(target * 0.008))) : Math.min(8, Math.max(3, Math.round(target * 0.2)));
      const splitPoint = isLarge ? 0.24 : 0.2;

      let startTime = null;
      let finished = false;
      let timerId = null;

      el.classList.add('is-counting');
      el.textContent = formatVal(el, 1);

      const finalize = () => {
        if (finished) return;
        finished = true;
        if (timerId) clearInterval(timerId);
        el.classList.remove('is-counting');
        el.textContent = formatVal(el, target);
        el.classList.add('is-counted');
        el.closest('.hero-proof-card')?.classList.add('is-counted');
      };

      const computeValueAt = (p) => {
        if (p <= 0) return 1;
        if (p >= 1) return target;
        // Phase 1: visible 1, 2, 3, 4... opening count so users watch it start from 1
        if (p <= splitPoint) {
          const u = p / splitPoint;
          const v = 1 + Math.floor(Math.pow(u, 1.55) * (warmLimit - 1));
          return Math.max(1, Math.min(warmLimit, v));
        }
        // Phase 2: smooth S-curve climb that gently brakes right into the final value
        const q = (p - splitPoint) / (1 - splitPoint);
        const eased = q < 0.35
          ? 2.4 * Math.pow(q, 2.25)
          : 1 - Math.pow(1 - q, 3.05) * (1 - 2.4 * Math.pow(0.35, 2.25)) / Math.pow(0.65, 3.05);
        const clampedEase = Math.max(0, Math.min(1, eased));
        return Math.max(warmLimit, Math.min(target, warmLimit + (target - warmLimit) * clampedEase));
      };

      const updateStep = () => {
        if (finished) return false;
        if (startTime === null) startTime = performance.now();
        const elapsed = performance.now() - startTime;
        const progress = Math.max(0, Math.min(1, elapsed / duration));
        el.textContent = formatVal(el, computeValueAt(progress));
        if (progress >= 1) {
          finalize();
          return false;
        }
        return true;
      };

      const renderFrame = () => {
        if (updateStep()) requestAnimationFrame(renderFrame);
      };

      // Brief beat at "1" so 1 -> 2 -> 3 progression is unmistakable without feeling stalled
      setTimeout(() => {
        if (finished) return;
        startTime = performance.now();
        timerId = setInterval(updateStep, 28);
        requestAnimationFrame(renderFrame);
      }, 45);
    };

    if (!('IntersectionObserver' in window)) {
      numEls.forEach(animateCounter);
      return;
    }

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    numEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.98) {
        animateCounter(el);
      } else {
        obs.observe(el);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.remove('js-proof-init');
    syncPublicSettings();
    renderCustomReviews();
    trackWhatsAppClicks();
    initProofCounters();
    initScrollAnimations();
    if (document.getElementById('lucknowServiceMap')) {
      selectMapHub('tiwariganj');
    }
    if (tdsSlider) updateTdsTool(parseInt(tdsSlider.value, 10));
    calculateEstimate();
    if (window.PurofixCore && typeof window.PurofixCore.syncFromCloud === 'function') {
      const pullMode = window.PurofixCore.isOwnerAlertsEnabled && window.PurofixCore.isOwnerAlertsEnabled() ? 'admin' : 'public';
      window.PurofixCore.syncFromCloud(pullMode).then((data) => {
        if (data) {
          syncPublicSettings();
          renderCustomReviews();
        }
      });
    }
    if (window.PurofixCore && typeof window.PurofixCore.onSync === 'function') {
      window.PurofixCore.onSync(() => {
        syncPublicSettings();
        renderCustomReviews();
      });
    }
    if (window.PurofixCore && typeof window.PurofixCore.onEnquiryAlert === 'function') {
      window.PurofixCore.onEnquiryAlert(({ lead, notification, unreadCount }) => {
        if (window.PurofixCore.isOwnerAlertsEnabled && window.PurofixCore.isOwnerAlertsEnabled()) {
          window.PurofixCore.playNotificationChime();
          showWebsiteEnquiryAlert({ lead, notification, mode: 'owner', unreadCount });
        }
      });
    }
    // Keep installed Owner PWA synced for cross-device bookings when Owner Alerts are enabled
    setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        window.PurofixCore &&
        typeof window.PurofixCore.isOwnerAlertsEnabled === 'function' &&
        window.PurofixCore.isOwnerAlertsEnabled() &&
        typeof window.PurofixCore.syncFromCloud === 'function'
      ) {
        window.PurofixCore.syncFromCloud('admin');
      }
    }, 25000);
  });

})();
