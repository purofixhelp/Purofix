/**
 * PUROFIX - Admin CRM Controller
 * Handles Authentication, Leads Database, 90-Day Reminder Engine, Financials, Tech Dispatch
 */

(function () {
  'use strict';

  function getConfiguredPin() {
    if (window.PurofixCore && typeof window.PurofixCore.getSettings === 'function') {
      const s = window.PurofixCore.getSettings();
      if (s && s.adminPin) return String(s.adminPin).trim();
    }
    return 'purofix2026';
  }

  let activeTab = 'tab-dashboard';

  // DOM Elements
  const overlay = document.getElementById('adminLoginOverlay');
  const mainLayout = document.getElementById('adminMainLayout');
  const toastEl = document.getElementById('adminToast');
  const leadModal = document.getElementById('leadModal');
  const techModal = document.getElementById('techModal');

  function showToast(msg, duration = 3000) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('active');
    setTimeout(() => {
      toastEl.classList.remove('active');
    }, duration);
  }

  // Authentication
  function checkAuth() {
    const isAuth = sessionStorage.getItem('purofix_admin_logged_in') === 'true';
    const hintEl = document.getElementById('loginPinHint');
    if (hintEl) {
      hintEl.style.display = getConfiguredPin() === 'purofix2026' ? 'block' : 'none';
    }
    if (isAuth) {
      if (window.PurofixCore && typeof window.PurofixCore.setOwnerAlertsEnabled === 'function') {
        window.PurofixCore.setOwnerAlertsEnabled(true);
      }
      if (overlay) overlay.style.display = 'none';
      if (mainLayout) mainLayout.style.display = 'flex';
      initDashboard();
    } else {
      if (overlay) overlay.style.display = 'flex';
      if (mainLayout) mainLayout.style.display = 'none';
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    const pin = document.getElementById('adminPin').value.trim();
    if (pin === getConfiguredPin()) {
      sessionStorage.setItem('purofix_admin_logged_in', 'true');
      if (window.PurofixCore && typeof window.PurofixCore.setOwnerAlertsEnabled === 'function') {
        window.PurofixCore.setOwnerAlertsEnabled(true);
      }
      overlay.style.display = 'none';
      mainLayout.style.display = 'flex';
      showToast('✅ Authenticated successfully! Welcome Ashwani Tiwari.');
      initDashboard();
    } else {
      alert('Incorrect Admin PIN. Please verify your security PIN.');
    }
  }

  function logout() {
    sessionStorage.removeItem('purofix_admin_logged_in');
    window.location.reload();
  }

  // Tab Navigation
  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetNav) targetNav.classList.add('active');

    // Update Topbar Titles
    const titleEl = document.getElementById('pageHeading');
    const subEl = document.getElementById('pageSubHeading');

    switch (tabId) {
      case 'tab-dashboard':
        titleEl.textContent = 'Executive Performance Dashboard';
        subEl.textContent = 'Real-time overview of Lucknow RO bookings, revenue, and fleet operations.';
        renderDashboard();
        break;
      case 'tab-leads':
        titleEl.textContent = 'Leads & Service Bookings CRM';
        subEl.textContent = 'Full lifecycle database of Lucknow customer inquiries and work orders.';
        filterLeads();
        break;
      case 'tab-customers':
        titleEl.textContent = 'Customers & Payment Ledger';
        subEl.textContent = 'Track every customer\'s service history, amount paid, and pending balance.';
        renderCustomersLedger();
        break;
      case 'tab-reminders':
        titleEl.textContent = 'Automated 90-Day Retention Engine';
        subEl.textContent = 'Recurring filter and TDS maintenance reminders for Lucknow families.';
        renderReminders();
        break;
      case 'tab-finance':
        titleEl.textContent = 'Finances & Net Profit Management';
        subEl.textContent = 'Real-time accounting of customer payments, parts expenses, and margins.';
        renderFinances();
        break;
      case 'tab-technicians':
        titleEl.textContent = 'Technician Fleet & Dispatch Hub';
        subEl.textContent = 'Manage active field engineers across Tiwariganj, Juggaur, Gomti Nagar & all zones.';
        renderTechnicians();
        break;
      case 'tab-settings':
        titleEl.textContent = 'Local SEO & Business Operating Settings';
        subEl.textContent = 'Configure branding, response promises, Google review QR codes, and search meta.';
        loadSettingsForm();
        break;
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar && window.innerWidth <= 1024) {
      sidebar.classList.remove('open');
    }
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }

  let activeQueueFilter = 'all';

  function setTextIfExists(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatInr(amount) {
    const num = Math.round(parseFloat(amount) || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  function renderDashboardAnalytics(stats) {
    const workflowEl = document.getElementById('dashWorkflowAnalytics');
    if (workflowEl) {
      const total = Math.max(1, stats.totalEnquiries);
      const totalMoney = Math.max(1, stats.totalBilled);
      if (!stats.totalEnquiries) {
        workflowEl.innerHTML = `<p style="font-size:0.82rem; color:#94a3b8; margin:0;">Live breakdown populates automatically once bookings arrive.</p>`;
      } else {
        const rows = [
          { label: '🟡 Pending Enquiries', count: `${stats.pendingEnquiryCount} (${Math.round((stats.pendingEnquiryCount / total) * 100)}%)`, pct: (stats.pendingEnquiryCount / total) * 100, cls: 'amber' },
          { label: '🔵 Continue / Ongoing', count: `${stats.continueCount} (${Math.round((stats.continueCount / total) * 100)}%)`, pct: (stats.continueCount / total) * 100, cls: '' },
          { label: '🟢 Completed / Okay', count: `${stats.okayCompletedCount} (${Math.round((stats.okayCompletedCount / total) * 100)}%)`, pct: (stats.okayCompletedCount / total) * 100, cls: 'green' },
          { label: '💵 Collection Rate (Paid / Billed)', count: `${formatInr(stats.totalEarnedCollected)} / ${formatInr(stats.totalBilled)}`, pct: (stats.totalEarnedCollected / totalMoney) * 100, cls: 'green' },
          { label: '⏳ Payment Pending Balance', count: formatInr(stats.totalPaymentPending), pct: (stats.totalPaymentPending / totalMoney) * 100, cls: 'red' }
        ];
        workflowEl.innerHTML = rows.map(r => `
          <div class="bar-row">
            <div class="bar-row-head">
              <span>${r.label}</span>
              <strong>${r.count}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${r.cls}" style="width:${Math.min(100, Math.round(r.pct))}%"></div>
            </div>
          </div>
        `).join('');
      }
    }

    const locEl = document.getElementById('dashLocalityAnalytics');
    if (locEl) {
      if (!stats.byLocality.length) {
        locEl.innerHTML = `<p style="font-size:0.82rem; color:#94a3b8; margin:0;">Lucknow zone demand &amp; service mix charts appear as leads are logged.</p>`;
      } else {
        const maxCount = Math.max(1, ...stats.byLocality.map(x => x.count));
        const topZones = stats.byLocality.slice(0, 4).map(z => `
          <div class="bar-row">
            <div class="bar-row-head">
              <span>📍 ${escapeHtml(z.name)}</span>
              <strong>${z.count} jobs • ${formatInr(z.billed)} ${z.pending > 0 ? `(Due ${formatInr(z.pending)})` : '✓'}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((z.count / maxCount) * 100)}%"></div>
            </div>
          </div>
        `).join('');
        const topSvc = stats.byService.slice(0, 2).map(s => `
          <div class="bar-row">
            <div class="bar-row-head">
              <span>🔧 ${escapeHtml(s.name)}</span>
              <strong>${s.count} (${s.completed} done)</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill green" style="width:${Math.round((s.count / stats.totalEnquiries) * 100)}%"></div>
            </div>
          </div>
        `).join('');
        locEl.innerHTML = topZones + topSvc;
      }
    }

    const auditEl = document.getElementById('dashAuditFeed');
    if (auditEl) {
      const log = window.PurofixCore.getAuditLog().slice(0, 8);
      if (!log.length) {
        auditEl.innerHTML = `<p style="font-size:0.82rem; color:#94a3b8; margin:0;">No activity recorded yet. Every booking, status change &amp; payment writes to the audit ledger.</p>`;
      } else {
        auditEl.innerHTML = log.map(item => `
          <div class="audit-item">
            <strong>${escapeHtml(item.action)} ${item.leadId ? `• ${escapeHtml(item.leadId)}` : ''}</strong>
            <span>${escapeHtml(item.detail)}</span>
            <time>${new Date(item.timestamp).toLocaleString('en-IN')}</time>
          </div>
        `).join('');
      }
    }
  }

  // Dashboard Renderer
  function renderDashboard() {
    const leads = window.PurofixCore.getLeads();
    const settings = window.PurofixCore.getSettings();
    const stats = window.PurofixCore.getAnalyticsSummary();

    const todayStr = new Date().toISOString().split('T')[0];
    const completedLeads = leads.filter(l => l.status === 'Completed');
    const todayDone = completedLeads.filter(l => l.completedDate === todayStr).length;
    const activeDispatched = leads.filter(l => ['Technician Assigned', 'On The Way', 'In Progress', 'Confirmed'].includes(l.status)).length;
    const totalRevenue = completedLeads.reduce((acc, l) => acc + (parseFloat(l.revenue) || 0), 0);

    // Reminders Due
    const todayObj = new Date();
    const remindersDue = leads.filter(l => {
      if (l.status !== 'Completed' || !l.nextReminderDate) return false;
      const d = new Date(l.nextReminderDate);
      const diffDays = Math.ceil((d - todayObj) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;

    // Update KPIs (Honest real values from stored records)
    document.getElementById('kpiTotalLeads').textContent = stats.totalEnquiries;
    document.getElementById('kpiTodayLeads').textContent = stats.todayLeads;
    document.getElementById('kpiActiveServices').textContent = activeDispatched;
    document.getElementById('kpiTodayProfit').textContent = formatInr(stats.todayProfit);
    document.getElementById('kpiRemindersDue').textContent = remindersDue;
    document.getElementById('monthlyRevStat').textContent = formatInr(totalRevenue);

    // Badges in nav
    setTextIfExists('badgeLeadsCount', stats.totalEnquiries);
    setTextIfExists('badgeRemindersCount', remindersDue);
    setTextIfExists('badgeCustomersCount', stats.uniqueCustomersCount);

    // 6-Tile Pipeline & Payment Summary
    setTextIfExists('pipePendingCount', stats.pendingEnquiryCount);
    setTextIfExists('pipeContinueCount', stats.continueCount);
    setTextIfExists('pipeNotDoneCount', stats.notDoneCount);
    setTextIfExists('pipeOkayCount', stats.okayCompletedCount);
    setTextIfExists('pipeEarnedPaid', formatInr(stats.totalEarnedCollected));
    setTextIfExists('pipePendingAmount', formatInr(stats.totalPaymentPending));

    // Capacity Tracker (Actual completed jobs today vs configured daily capacity goal)
    const targetCapacity = settings.dailyTargetCapacity || 300;
    const capTargetEl = document.getElementById('targetCapDisplay');
    if (capTargetEl) capTargetEl.textContent = targetCapacity;
    document.getElementById('todayDoneCount').textContent = todayDone;
    const pct = Math.min(100, Math.round((todayDone / targetCapacity) * 100));
    const meterBar = document.getElementById('capacityMeterBar');
    if (meterBar) meterBar.style.width = `${todayDone > 0 ? Math.max(4, pct) : 0}%`;
    document.getElementById('capacityPercentage').textContent = `${pct}% of Daily Capacity Goal (${todayDone} / ${targetCapacity})`;

    renderDashboardAnalytics(stats);
    updateQueueBadges(stats, leads);

    // Recent Table
    const recent = leads.slice(0, 6);
    const tbody = document.getElementById('dashboardRecentTbody');
    if (tbody) {
      if (!recent.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #94a3b8;">No service leads booked yet. Live website bookings &amp; manual leads appear here automatically.</td></tr>`;
        return;
      }
      tbody.innerHTML = recent.map(l => {
        const pay = window.PurofixCore.getLeadPaymentSummary(l);
        const payBadge = pay.pending > 0
          ? `<div style="font-size:0.78rem;"><span class="text-success">Paid: ₹${pay.paid}</span><br><span class="text-danger font-bold">Due: ₹${pay.pending}</span></div>`
          : `<div class="text-success font-bold" style="font-size:0.8rem;">₹${pay.paid} Paid ✓</div>`;

        return `
        <tr>
          <td><strong>${l.id}</strong><div class="text-muted" style="font-size:0.75rem;">${l.bookingDate || 'Today'}</div></td>
          <td><strong>${escapeHtml(l.name)}</strong></td>
          <td>
            <a href="tel:${l.phone}" class="text-primary font-bold">📞 ${l.phone}</a>
          </td>
          <td>${escapeHtml(l.locality || 'Lucknow')}</td>
          <td><span class="badge-tag">${escapeHtml(l.serviceType)}</span></td>
          <td><em>${escapeHtml(l.technician || 'Unassigned')}</em></td>
          <td>${renderStatusPill(l.status)}</td>
          <td>${payBadge}</td>
          <td>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              ${pay.pending > 0 && l.status !== 'Cancelled' ? `<button class="btn btn-sm btn-primary" onclick="window.PurofixAdmin.markLeadPaid('${l.id}')" title="Mark Full Paid">✓ Paid</button>` : ''}
              <button class="btn btn-sm btn-outline" onclick="window.PurofixAdmin.openReceiptModal('${l.id}')" title="Invoice / Receipt">🧾</button>
              <button class="btn btn-sm btn-whatsapp" onclick="window.PurofixAdmin.openLeadWhatsApp('${l.id}')" title="WhatsApp Chat">💬</button>
              <button class="btn btn-sm btn-secondary" onclick="window.PurofixAdmin.openEditLeadModal('${l.id}')" title="Edit / Update">✏️</button>
            </div>
          </td>
        </tr>
      `;
      }).join('');
    }
  }

  function buildTechOptionsHtml(selectedName) {
    const techs = window.PurofixCore.getTechnicians() || [];
    const names = techs.map(t => t.name).filter(Boolean);
    if (selectedName && selectedName !== 'Unassigned' && !names.includes(selectedName)) {
      names.push(selectedName);
    }
    const opts = names.map(name => `<option value="${escapeHtml(name)}" ${selectedName === name ? 'selected' : ''}>${escapeHtml(name)}</option>`);
    opts.push(`<option value="Unassigned" ${!selectedName || selectedName === 'Unassigned' ? 'selected' : ''}>Unassigned</option>`);
    return opts.join('');
  }

  function updateQueueBadges(stats, leadsList) {
    const s = stats || window.PurofixCore.getAnalyticsSummary();
    const list = leadsList || window.PurofixCore.getLeads();
    const payPendingCount = list.filter(l => window.PurofixCore.getLeadPaymentSummary(l).pending > 0).length;
    setTextIfExists('qCountAll', s.totalEnquiries);
    setTextIfExists('qCountPending', s.pendingEnquiryCount);
    setTextIfExists('qCountContinue', s.continueCount);
    setTextIfExists('qCountNotDone', s.notDoneCount);
    setTextIfExists('qCountOkay', s.okayCompletedCount);
    setTextIfExists('qCountPayPending', payPendingCount);
  }

  function setQueueFilter(queue) {
    activeQueueFilter = queue || 'all';
    document.querySelectorAll('#crmQueueTabs .queue-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.queue === activeQueueFilter);
    });
    filterLeads();
  }

  function jumpToQueue(queue) {
    activeQueueFilter = queue || 'all';
    switchTab('tab-leads');
    setQueueFilter(activeQueueFilter);
  }

  // Leads Table Renderer
  function renderLeadsTable(filteredList = null) {
    const allLeads = window.PurofixCore.getLeads();
    updateQueueBadges(null, allLeads);
    const leads = filteredList || allLeads;
    const tbody = document.getElementById('crmFullTbody');
    if (!tbody) return;

    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #94a3b8;">No customer bookings found matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = leads.map(l => {
      const pay = window.PurofixCore.getLeadPaymentSummary(l);
      const payClass = pay.paymentStatus === 'Paid' ? 'paid' : (pay.paymentStatus === 'Partial' ? 'partial' : 'pending');
      return `
      <tr>
        <td>
          <strong>${l.id}</strong>
          <div style="font-size:0.75rem; color:#94a3b8;">${l.bookingDate || ''}</div>
          <span style="font-size:0.7rem; color:#38bdf8;">${escapeHtml(l.leadSource || 'Website')}</span>
        </td>
        <td>
          <strong>${escapeHtml(l.name)}</strong>
          <div><a href="tel:${l.phone}" style="color:#38bdf8; font-weight:600;">📞 ${l.phone}</a></div>
        </td>
        <td>
          <strong>${escapeHtml(l.locality || 'Lucknow')}</strong>
          <div style="font-size:0.75rem; color:#94a3b8; max-width:200px;">${escapeHtml(l.address || '')}</div>
        </td>
        <td>
          <span style="font-weight:600; color:#ffffff;">${escapeHtml(l.serviceType)}</span>
          <div style="font-size:0.75rem; color:#94a3b8;">Brand: <em>${escapeHtml(l.brand || 'Universal')}</em>${l.tdsAfter ? ` • TDS: ${escapeHtml(l.tdsBefore || '?')}→${escapeHtml(l.tdsAfter)}` : ''}</div>
        </td>
        <td>
          <select onchange="window.PurofixAdmin.changeTechnician('${l.id}', this.value)" style="background:#091024; border:1px solid #1e3a68; color:#fff; padding:0.3rem; border-radius:4px; font-size:0.8rem;">
            ${buildTechOptionsHtml(l.technician)}
          </select>
        </td>
        <td>
          <select onchange="window.PurofixAdmin.changeStatus('${l.id}', this.value)" style="background:#091024; border:1px solid #1e3a68; color:#fff; padding:0.3rem; border-radius:4px; font-size:0.8rem;">
            <option value="New Lead" ${l.status === 'New Lead' ? 'selected' : ''}>New Lead</option>
            <option value="Contacted" ${l.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Confirmed" ${l.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Technician Assigned" ${l.status === 'Technician Assigned' ? 'selected' : ''}>Tech Assigned</option>
            <option value="On The Way" ${l.status === 'On The Way' ? 'selected' : ''}>On The Way</option>
            <option value="In Progress" ${l.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${l.status === 'Completed' ? 'selected' : ''}>Completed ✓</option>
            <option value="Cancelled" ${l.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <div>Billed: <strong>₹${pay.billed}</strong> <span class="ledger-badge ${payClass}">${pay.paymentStatus}</span></div>
          <div style="font-size:0.78rem;">Paid: <strong class="text-success">₹${pay.paid}</strong> • Due: <strong class="${pay.pending > 0 ? 'text-danger' : 'text-success'}">₹${pay.pending}</strong></div>
          <div style="font-size:0.74rem; color:#94a3b8;">Profit: ₹${l.profit || 0}</div>
        </td>
        <td>
          <div style="display:flex; gap:0.32rem; flex-wrap:wrap;">
            ${pay.pending > 0 && l.status !== 'Cancelled' ? `<button class="btn btn-sm btn-primary" onclick="window.PurofixAdmin.markLeadPaid('${l.id}')" title="Mark Full Paid">✓</button>` : ''}
            <button class="btn btn-sm btn-outline" onclick="window.PurofixAdmin.openReceiptModal('${l.id}')" title="Receipt / Bill">🧾</button>
            <button class="btn btn-sm btn-call" onclick="window.location.href='tel:${l.phone}'" title="Call">📞</button>
            <button class="btn btn-sm btn-whatsapp" onclick="window.PurofixAdmin.openLeadWhatsApp('${l.id}')" title="WhatsApp">💬</button>
            <button class="btn btn-sm btn-secondary" onclick="window.PurofixAdmin.openEditLeadModal('${l.id}')" title="Edit">✏️</button>
            <button class="btn btn-sm btn-outline" onclick="window.PurofixAdmin.confirmDeleteLead('${l.id}')" title="Delete" style="color:#ef4444; border-color:#ef4444;">✕</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  function filterLeads() {
    const q = (document.getElementById('crmSearchInput')?.value || '').toLowerCase().trim();
    const status = document.getElementById('crmStatusFilter')?.value || '';
    const locality = document.getElementById('crmLocalityFilter')?.value || '';
    const service = document.getElementById('crmServiceFilter')?.value || '';

    const leads = window.PurofixCore.getLeads();
    const filtered = leads.filter(l => {
      const stage = window.PurofixCore.getWorkflowStage(l.status);
      const pay = window.PurofixCore.getLeadPaymentSummary(l);
      let matchQueue = true;
      if (activeQueueFilter === 'pending') matchQueue = stage === 'pending';
      else if (activeQueueFilter === 'continue') matchQueue = stage === 'continue';
      else if (activeQueueFilter === 'notdone') matchQueue = (stage === 'pending' || stage === 'continue');
      else if (activeQueueFilter === 'completed') matchQueue = stage === 'completed';
      else if (activeQueueFilter === 'payment_pending') matchQueue = pay.pending > 0;

      const matchQ = !q || (
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.locality || '').toLowerCase().includes(q) ||
        (l.id || '').toLowerCase().includes(q) ||
        (l.brand || '').toLowerCase().includes(q)
      );
      const matchStatus = !status || l.status === status;
      const matchLocality = !locality || (l.locality || '').toLowerCase().includes(locality.toLowerCase());
      const matchService = !service || (l.serviceType || '').toLowerCase().includes(service.toLowerCase());

      return matchQueue && matchQ && matchStatus && matchLocality && matchService;
    });

    renderLeadsTable(filtered);
  }

  function renderCustomersLedger() {
    const ledger = window.PurofixCore.getCustomerLedger();
    const totalCust = ledger.length;
    const repeatCust = ledger.filter(c => c.totalBookings > 1).length;
    const totalPaid = ledger.reduce((acc, c) => acc + c.totalPaid, 0);
    const totalPending = ledger.reduce((acc, c) => acc + c.totalPending, 0);

    setTextIfExists('custKpiTotal', totalCust);
    setTextIfExists('custKpiRepeat', repeatCust);
    setTextIfExists('custKpiPaid', formatInr(totalPaid));
    setTextIfExists('custKpiPending', formatInr(totalPending));

    const q = (document.getElementById('customerSearchInput')?.value || '').toLowerCase().trim();
    const payFilter = document.getElementById('customerPayFilter')?.value || '';

    const filtered = ledger.filter(c => {
      const matchQ = !q || (
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.locality || '').toLowerCase().includes(q) ||
        c.brands.join(' ').toLowerCase().includes(q)
      );
      let matchF = true;
      if (payFilter === 'pending_bal') matchF = c.totalPending > 0;
      else if (payFilter === 'active_service') matchF = c.notDoneCount > 0;
      else if (payFilter === 'repeat') matchF = c.totalBookings > 1;
      else if (payFilter === 'settled') matchF = c.totalPending === 0 && c.totalBilled > 0;
      return matchQ && matchF;
    });

    const tbody = document.getElementById('customersLedgerTbody');
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #94a3b8;">No customer ledger records found yet. Every booking automatically builds a unified customer history here.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const statusBadge = c.totalPending > 0
        ? `<span class="ledger-badge pending">Due: ₹${c.totalPending}</span>`
        : `<span class="ledger-badge paid">Clear ✓</span>`;
      const waText = `Hello ${c.name}, Purofix Lucknow service summary: ${c.completedCount} completed / ${c.totalBookings} total services. Paid: ₹${c.totalPaid}${c.totalPending > 0 ? `, Pending Balance: ₹${c.totalPending}` : ' (All Clear ✓)'}. Call 9250332918 for any help.`;
      const waUrl = window.PurofixCore.getWhatsAppUrl(c.whatsapp || c.phone, waText);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(c.name)}</strong>
            <div><a href="tel:${escapeHtml(c.phone)}" style="color:#38bdf8; font-weight:600;">📞 ${escapeHtml(c.phone)}</a></div>
          </td>
          <td>
            <strong>${escapeHtml(c.locality)}</strong>
            <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(c.brands.join(', ') || 'Universal RO')}</div>
          </td>
          <td>
            <div><strong>${c.totalBookings} Total Services</strong></div>
            <div style="font-size:0.76rem; color:#cbd5e1;">🟢 ${c.completedCount} Okay • 🟡 ${c.pendingEnquiryCount} Pending • 🔵 ${c.continueCount} Continue</div>
          </td>
          <td><strong>₹${c.totalBilled}</strong></td>
          <td class="text-success font-bold">₹${c.totalPaid}</td>
          <td>
            <strong class="${c.totalPending > 0 ? 'text-danger' : 'text-success'}">₹${c.totalPending}</strong>
            <div>${statusBadge}</div>
          </td>
          <td>
            <div style="font-size:0.8rem;">Last: <strong>${c.lastBookingDate || '—'}</strong></div>
            <div style="font-size:0.74rem; color:#94a3b8;">Due: ${c.nextReminderDate || '—'}</div>
          </td>
          <td>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              <button class="btn btn-sm btn-secondary" onclick="window.PurofixAdmin.openCustomerHistoryModal('${escapeHtml(c.customerKey)}')" title="View Full Service Ledger">📂 History</button>
              <a class="btn btn-sm btn-whatsapp" href="${waUrl}" target="_blank" rel="noopener" title="Send Summary / Balance on WhatsApp">💬</a>
              <button class="btn btn-sm btn-primary" onclick="window.PurofixAdmin.openNewBookingForCustomer('${escapeHtml(c.customerKey)}')" title="Book Another Service">+ Service</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openCustomerHistoryModal(customerKey) {
    const cust = window.PurofixCore.getCustomerLedger().find(c => c.customerKey === customerKey);
    if (!cust) return;
    setTextIfExists('chModalName', `${cust.name} — Customer Service & Payment Ledger`);
    setTextIfExists('chModalMeta', `📞 ${cust.phone} • 📍 ${cust.locality} • Brands: ${cust.brands.join(', ') || 'RO System'}`);

    const grid = document.getElementById('chSummaryGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="ch-stat-box"><span>Total Services Taken</span><strong>${cust.totalBookings} (${cust.completedCount} Okay / ${cust.notDoneCount} Active)</strong></div>
        <div class="ch-stat-box"><span>Total Billed</span><strong>₹${cust.totalBilled.toLocaleString('en-IN')}</strong></div>
        <div class="ch-stat-box"><span>Amount Paid</span><strong class="text-success">₹${cust.totalPaid.toLocaleString('en-IN')}</strong></div>
        <div class="ch-stat-box"><span>Pending Balance</span><strong class="${cust.totalPending > 0 ? 'text-danger' : 'text-success'}">₹${cust.totalPending.toLocaleString('en-IN')}</strong></div>
      `;
    }

    const tbody = document.getElementById('chHistoryTbody');
    if (tbody) {
      tbody.innerHTML = cust.history.map(h => {
        const pay = h.paymentSummary;
        return `
          <tr>
            <td><strong>${h.id}</strong><div style="font-size:0.75rem; color:#94a3b8;">${h.bookingDate || ''}</div></td>
            <td><strong>${escapeHtml(h.serviceType)}</strong><div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(h.brand)}</div></td>
            <td>${renderStatusPill(h.status)}</td>
            <td>₹${pay.billed}</td>
            <td class="text-success font-bold">₹${pay.paid}</td>
            <td class="${pay.pending > 0 ? 'text-danger font-bold' : 'text-success'}">₹${pay.pending}</td>
            <td>
              <div style="display:flex; gap:0.35rem;">
                ${pay.pending > 0 && h.status !== 'Cancelled' ? `<button class="btn btn-sm btn-primary" onclick="window.PurofixAdmin.markLeadPaid('${h.id}', '${escapeHtml(cust.customerKey)}')">✓ Paid</button>` : ''}
                <button class="btn btn-sm btn-outline" onclick="window.PurofixAdmin.openReceiptModal('${h.id}')">🧾 Bill</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    const actions = document.getElementById('chModalActions');
    if (actions) {
      const waText = `Hello ${cust.name}, your Purofix Lucknow ledger summary:\nTotal Services: ${cust.totalBookings} (${cust.completedCount} Completed)\nTotal Billed: ₹${cust.totalBilled}\nTotal Paid: ₹${cust.totalPaid}\nPending Balance: ₹${cust.totalPending}\nHelpline: 9250332918`;
      actions.innerHTML = `
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('customerHistoryModal').close()">Close</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('customerHistoryModal').close(); window.PurofixAdmin.openNewBookingForCustomer('${escapeHtml(cust.customerKey)}')">+ Add New Service</button>
        <a href="${window.PurofixCore.getWhatsAppUrl(cust.whatsapp || cust.phone, waText)}" target="_blank" rel="noopener" class="btn btn-whatsapp">📲 Send Ledger on WhatsApp</a>
      `;
    }

    const modal = document.getElementById('customerHistoryModal');
    if (modal) {
      if (modal.showModal) modal.showModal();
      else modal.setAttribute('open', '');
    }
  }

  function openNewBookingForCustomer(customerKey) {
    const cust = window.PurofixCore.getCustomerLedger().find(c => c.customerKey === customerKey);
    openAddLeadModal();
    if (!cust) return;
    document.getElementById('mCustName').value = cust.name || '';
    document.getElementById('mCustPhone').value = cust.phone || '';
    ensureSelectOption(document.getElementById('mCustLocality'), cust.locality || 'Tiwariganj');
    document.getElementById('mCustAddress').value = cust.address || '';
    if (cust.brands.length) ensureSelectOption(document.getElementById('mCustBrand'), cust.brands[0]);
    ensureSelectOption(document.getElementById('mCustSource'), 'Referral / Repeat');
    document.getElementById('mCustStatus').value = 'Confirmed';
  }

  // 90-Day Reminders Renderer
  let reminderFilter = 'all';

  function renderReminders() {
    const leads = window.PurofixCore.getLeads();
    const completed = leads.filter(l => l.status === 'Completed' && l.nextReminderDate);

    document.getElementById('remindersTotalCount').textContent = completed.length;
    const tbody = document.getElementById('remindersTbody');
    if (!tbody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = completed.filter(l => {
      const rDate = new Date(l.nextReminderDate);
      rDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));

      if (reminderFilter === 'overdue') return diffDays < 0;
      if (reminderFilter === 'week') return diffDays >= 0 && diffDays <= 7;
      if (reminderFilter === 'month') return diffDays >= 0 && diffDays <= 30;
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#94a3b8;">No maintenance reminders found for this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(l => {
      const rDate = new Date(l.nextReminderDate);
      const diffDays = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));

      let badge = '';
      if (diffDays < 0) {
        badge = `<span class="status-pill status-cancelled">Overdue by ${Math.abs(diffDays)} Days</span>`;
      } else if (diffDays <= 7) {
        badge = `<span class="status-pill status-assigned">Due in ${diffDays} Days</span>`;
      } else {
        badge = `<span class="status-pill status-new">Scheduled (${diffDays} Days)</span>`;
      }

      return `
        <tr>
          <td>
            <strong>${escapeHtml(l.name)}</strong>
            <div style="font-size:0.75rem; color:#94a3b8;">RO: ${escapeHtml(l.brand)}</div>
          </td>
          <td>
            <div>📞 ${l.phone}</div>
          </td>
          <td>${escapeHtml(l.locality)}</td>
          <td>${l.completedDate || '90 days ago'}</td>
          <td><strong>${l.nextReminderDate}</strong></td>
          <td>${badge}</td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-sm btn-whatsapp" onclick="window.PurofixAdmin.send90DayWhatsApp('${l.id}')">
                💬 Send Reminder WhatsApp
              </button>
              <button class="btn btn-sm btn-primary" onclick="window.PurofixAdmin.rebookService('${l.id}')" title="Re-book service">
                ⚡ Re-book
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterReminders(type, btn) {
    reminderFilter = type;
    document.querySelectorAll('.reminder-filters button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderReminders();
  }

  function send90DayWhatsApp(leadId) {
    const lead = window.PurofixCore.getLeads().find(l => l.id === leadId);
    if (!lead) return;

    const text = `Hello ${lead.name},

This is a friendly maintenance reminder from Purofix (Ashwani Tiwari & Team).

Your RO water purifier was last serviced on ${lead.completedDate || '90 days ago'}. In Lucknow's water conditions, filters should be flushed & checked every 3 months to prevent membrane choking and maintain safe TDS.

Would you like our engineer to visit today for a routine TDS checkup & filter clean?

Starting @ ₹199 only.

Please reply to confirm your preferred time.`;

    const url = window.PurofixCore.getWhatsAppUrl(lead.whatsapp || lead.phone, text);
    window.open(url, '_blank');
    window.PurofixCore.updateLead(leadId, { reminderContacted: true });
    showToast(`WhatsApp reminder dispatched for ${lead.name}!`);
    renderReminders();
  }

  function rebookService(leadId) {
    const lead = window.PurofixCore.getLeads().find(l => l.id === leadId);
    if (!lead) return;

    const newLead = window.PurofixCore.addLead({
      name: lead.name,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      locality: lead.locality,
      address: lead.address,
      brand: lead.brand,
      serviceType: 'RO General Service (90-Day Repeat)',
      status: 'Confirmed',
      technician: lead.technician || 'Ashwani Tiwari',
      leadSource: 'Referral / 90-Day Repeat'
    });

    showToast(`✅ New repeat booking ${newLead.id} created for ${lead.name}!`);
    switchTab('tab-leads');
  }

  // Finances Renderer
  function renderFinances() {
    const leads = window.PurofixCore.getLeads();
    const stats = window.PurofixCore.getAnalyticsSummary();
    const activeJobs = leads.filter(l => l.status !== 'Cancelled');
    const pendingJobs = activeJobs.filter(l => window.PurofixCore.getLeadPaymentSummary(l).pending > 0);

    setTextIfExists('finTotalRevenue', formatInr(stats.totalEarnedCollected));
    setTextIfExists('finPendingCollections', formatInr(stats.totalPaymentPending));
    setTextIfExists('finPartsCost', formatInr(stats.totalPartsCost));
    setTextIfExists('finTechPayouts', formatInr(stats.totalTechAndExp));
    setTextIfExists('finNetProfit', formatInr(stats.totalNetProfit));

    const pendingTbody = document.getElementById('finPendingTbody');
    if (pendingTbody) {
      if (!pendingJobs.length) {
        pendingTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; color: #34d399;">✓ Zero pending balances! All active bookings are settled.</td></tr>`;
      } else {
        pendingTbody.innerHTML = pendingJobs.map(l => {
          const pay = window.PurofixCore.getLeadPaymentSummary(l);
          const waBill = window.PurofixCore.getWhatsAppUrl(
            l.whatsapp || l.phone,
            `Hello ${l.name}, gentle payment reminder from Purofix Lucknow for Booking ${l.id} (${l.serviceType}). Total Bill: ₹${pay.billed}, Paid: ₹${pay.paid}, Pending Balance: ₹${pay.pending}. You can pay via UPI / Cash. Helpline: 9250332918`
          );
          return `
            <tr>
              <td><strong>${l.id}</strong><div style="font-size:0.75rem; color:#94a3b8;">${l.bookingDate || ''}</div></td>
              <td><strong>${escapeHtml(l.name)}</strong><div style="font-size:0.75rem;">📞 ${escapeHtml(l.phone)}</div></td>
              <td>${escapeHtml(l.serviceType)}<div>${renderStatusPill(l.status)}</div></td>
              <td><strong>₹${pay.billed}</strong></td>
              <td class="text-success">₹${pay.paid}</td>
              <td class="text-danger font-bold">₹${pay.pending}</td>
              <td>
                <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                  <button class="btn btn-sm btn-primary" onclick="window.PurofixAdmin.markLeadPaid('${l.id}')">✓ Mark Paid</button>
                  <button class="btn btn-sm btn-outline" onclick="window.PurofixAdmin.openReceiptModal('${l.id}')">🧾 Bill</button>
                  <a class="btn btn-sm btn-whatsapp" href="${waBill}" target="_blank" rel="noopener">💬</a>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    const tbody = document.getElementById('financeTbody');
    if (!tbody) return;

    if (!activeJobs.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #94a3b8;">No active or completed jobs recorded yet. Website &amp; manual bookings appear here automatically.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeJobs.map(l => {
      const pay = window.PurofixCore.getLeadPaymentSummary(l);
      const profit = parseFloat(l.profit) || 0;
      const margin = pay.billed > 0 ? Math.round((profit / pay.billed) * 100) : 0;

      return `
        <tr>
          <td><strong>${l.id}</strong><div style="font-size:0.74rem; color:#94a3b8;">${escapeHtml(l.status)}</div></td>
          <td>${escapeHtml(l.name)}</td>
          <td>${escapeHtml(l.serviceType)}</td>
          <td>
            <div><strong>₹${pay.billed}</strong></div>
            <div style="font-size:0.75rem;"><span class="text-success">Paid ₹${pay.paid}</span> • <span class="${pay.pending > 0 ? 'text-danger' : 'text-success'}">Due ₹${pay.pending}</span></div>
          </td>
          <td class="text-danger">₹${l.partsCost || 0}</td>
          <td>₹${l.techComm || 0}</td>
          <td>₹${l.expenses || 0}</td>
          <td class="text-success font-bold">₹${profit}</td>
          <td>
            <div style="display:flex; align-items:center; gap:0.35rem;">
              <span class="badge-tag">${margin}%</span>
              <button class="btn btn-sm btn-outline" onclick="window.PurofixAdmin.openReceiptModal('${l.id}')" title="Print / WhatsApp Bill">🧾</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function markLeadPaid(id, refreshCustKey) {
    const lead = window.PurofixCore.getLeads().find(l => l.id === id);
    if (!lead) return;
    const billed = Math.max(0, parseFloat(lead.revenue || 0) || 0);
    const nextStatus = lead.status === 'New Lead' || lead.status === 'Contacted' ? 'Completed' : lead.status;
    window.PurofixCore.updateLead(id, {
      amountPaid: billed,
      paymentStatus: 'Paid',
      paymentMode: lead.paymentMode && lead.paymentMode !== 'Pending' ? lead.paymentMode : 'UPI / Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      status: nextStatus
    });
    showToast(`✅ Payment ₹${billed} marked Paid for ${lead.name}!`);
    refreshActiveView();
    if (refreshCustKey) openCustomerHistoryModal(refreshCustKey);
  }

  function openReceiptModal(id) {
    const lead = window.PurofixCore.getLeads().find(l => l.id === id);
    if (!lead) return;
    const pay = window.PurofixCore.getLeadPaymentSummary(lead);
    const settings = window.PurofixCore.getSettings();
    const paper = document.getElementById('receiptPaperContent');
    if (paper) {
      paper.innerHTML = `
        <div class="receipt-head">
          <div>
            <strong style="font-size:1.25rem; color:#0284c7; display:block;">PUROFIX WATER CARE LUCKNOW</strong>
            <div style="font-size:0.8rem; color:#475569;">${escapeHtml(settings.address || 'A-401, Juggaur, Tiwariganj, Lucknow - 226028')}</div>
            <div style="font-size:0.8rem; color:#475569;">Helpline / WhatsApp: +91 ${escapeHtml(settings.primaryPhone || '9250332918')}</div>
          </div>
          <div style="text-align:right;">
            <strong style="display:block; color:#0f172a;">RECEIPT #${escapeHtml(lead.id)}</strong>
            <div style="font-size:0.8rem; color:#475569;">Date: ${escapeHtml(lead.completedDate || lead.bookingDate || new Date().toISOString().split('T')[0])}</div>
            <div style="font-size:0.78rem; font-weight:700; color:${pay.pending > 0 ? '#dc2626' : '#059669'};">${pay.paymentStatus.toUpperCase()}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:0.75rem;">
          <div>
            <strong style="display:block; color:#0f172a;">Billed To: ${escapeHtml(lead.name)}</strong>
            <div>Mobile: +91 ${escapeHtml(lead.phone)}</div>
            <div>Address: ${escapeHtml(lead.address || lead.locality || 'Lucknow')}</div>
          </div>
          <div style="text-align:right;">
            <div>Brand: <strong>${escapeHtml(lead.brand || 'Universal RO / ARO')}</strong></div>
            <div>Engineer: <strong>${escapeHtml(lead.technician || 'Ashwani Tiwari')}</strong></div>
            ${lead.tdsAfter ? `<div>Water TDS: <strong>${escapeHtml(lead.tdsBefore || '—')} → ${escapeHtml(lead.tdsAfter)} ppm</strong></div>` : ''}
          </div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Status</th>
              <th style="text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${escapeHtml(lead.serviceType)}</strong>${lead.notes ? `<div style="font-size:0.78rem; color:#475569;">${escapeHtml(lead.notes)}</div>` : ''}</td>
              <td>${escapeHtml(lead.status)}</td>
              <td style="text-align:right;"><strong>₹${pay.billed}</strong></td>
            </tr>
            <tr>
              <td colspan="2">Amount Paid (${escapeHtml(pay.paymentMode)})</td>
              <td style="text-align:right; color:#059669;"><strong>- ₹${pay.paid}</strong></td>
            </tr>
            <tr>
              <td colspan="2"><strong>Balance Pending</strong></td>
              <td style="text-align:right; color:${pay.pending > 0 ? '#dc2626' : '#059669'};"><strong>₹${pay.pending}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#475569; margin-top:0.85rem;">
          <span>✓ Genuine RO/ARO Spares • 30-Day Service Support</span>
          <span>Next Checkup Due: <strong>${escapeHtml(lead.nextReminderDate || '90 Days post-completion')}</strong></span>
        </div>
      `;
    }

    const waBtn = document.getElementById('receiptWhatsappBtn');
    if (waBtn) {
      const msg = `*PUROFIX LUCKNOW — SERVICE INVOICE*\nReceipt No: ${lead.id}\nCustomer: ${lead.name}\nService: ${lead.serviceType} (${lead.brand})\nEngineer: ${lead.technician || 'Ashwani Tiwari'}\nTotal Billed: ₹${pay.billed}\nPaid (${pay.paymentMode}): ₹${pay.paid}\nPending Balance: ₹${pay.pending}${lead.tdsAfter ? `\nTDS Level: ${lead.tdsBefore || '?'} -> ${lead.tdsAfter} ppm` : ''}\n\nThank you for choosing Purofix (+91 ${settings.primaryPhone || '9250332918'}).`;
      waBtn.href = window.PurofixCore.getWhatsAppUrl(lead.whatsapp || lead.phone, msg);
    }

    const modal = document.getElementById('receiptModal');
    if (modal) {
      if (modal.showModal) modal.showModal();
      else modal.setAttribute('open', '');
    }
  }

  // Technicians Renderer
  function renderTechnicians() {
    const techs = window.PurofixCore.getTechnicians();
    const leads = window.PurofixCore.getLeads();
    const container = document.getElementById('techCardsContainer');
    if (!container) return;

    container.innerHTML = techs.map(t => {
      const realCompleted = leads.filter(l => l.status === 'Completed' && l.technician === t.name).length;
      const realActive = leads.filter(l => !['Completed', 'Cancelled'].includes(l.status) && l.technician === t.name).length;
      const waHref = window.PurofixCore.getWhatsAppUrl(t.whatsapp || t.phone, `Hello ${t.name}, dispatch update from Purofix Admin.`);
      return `
        <div class="tech-card">
          <div class="tech-head">
            <div class="tech-avatar-box">${t.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <strong style="font-size:1.05rem; color:#fff;">${escapeHtml(t.name)}</strong>
              <div style="font-size:0.75rem; color:#38bdf8;">${escapeHtml(t.role)}</div>
            </div>
          </div>
          <div class="tech-details">
            <div>📱 <strong>${escapeHtml(t.phone)}</strong></div>
            <div>📍 Zones: <em>${escapeHtml(t.areas)}</em></div>
            <div>✅ Completed Services: <strong>${realCompleted}</strong> • 🛵 Active: <strong>${realActive}</strong></div>
            <div>🟢 Status: <span class="status-pill status-completed">${escapeHtml(t.status)}</span></div>
          </div>
          <div class="tech-footer">
            <a href="tel:${escapeHtml(t.phone)}" class="btn btn-sm btn-call" style="flex:1;">📞 Call</a>
            <a href="${waHref}" target="_blank" rel="noopener" class="btn btn-sm btn-whatsapp" style="flex:1;">💬 WhatsApp</a>
          </div>
        </div>
      `;
    }).join('');
  }

  function populateModalTechSelect(selectedValue) {
    const sel = document.getElementById('mCustTech');
    if (!sel) return;
    sel.innerHTML = buildTechOptionsHtml(selectedValue || 'Ashwani Tiwari');
  }

  // Settings Loader & Saver
  function loadSettingsForm() {
    const s = window.PurofixCore.getSettings();
    document.getElementById('setBizName').value = s.businessName || 'PUROFIX';
    document.getElementById('setOwnerName').value = s.ownerName || 'Ashwani Tiwari';
    document.getElementById('setOwnerTitle').value = s.ownerTitle || 'Founder & Lead RO Engineer';
    document.getElementById('setExperience').value = s.ownerExperience || '5 Years';
    document.getElementById('setPrimaryPhone').value = s.primaryPhone || '9250332918';
    document.getElementById('setWhatsapp').value = s.whatsappNumber || '9250332918';
    document.getElementById('setAddress').value = s.address || 'A-401, Juggaur, Tiwariganj, Lucknow, Uttar Pradesh – 226028';
    document.getElementById('setStartPrice').value = s.startingPrice || '199';
    document.getElementById('setPromise').value = s.responsePromise || 'Under 30 Minutes';
    document.getElementById('setReviewUrl').value = s.googleReviewUrl || '';
    const webhookInput = document.getElementById('setWebhookUrl');
    if (webhookInput) webhookInput.value = s.webhookUrl || '';
    const emailInput = document.getElementById('setOwnerAlertEmail');
    if (emailInput) emailInput.value = s.ownerAlertEmail || '';
    const soundSel = document.getElementById('setNotifySound');
    if (soundSel) soundSel.value = s.notifySound === false ? 'off' : 'on';
    const pinInput = document.getElementById('setAdminPin');
    if (pinInput) pinInput.value = '';
    document.getElementById('setMetaTitle').value = s.metaTitle || '';
    document.getElementById('setMetaDesc').value = s.metaDescription || '';
    const kwInput = document.getElementById('setMetaKeywords');
    if (kwInput) kwInput.value = s.metaKeywords || '';

    // Sidebar owner
    const sideOwner = document.getElementById('sidebarOwnerName');
    if (sideOwner) sideOwner.textContent = s.ownerName || 'Ashwani Tiwari';
    populateModalTechSelect();
    updateCloudBadge();
    renderAdminReviews();
  }

  function renderAdminReviews() {
    const listEl = document.getElementById('adminReviewsList');
    if (!listEl || !window.PurofixCore || typeof window.PurofixCore.getReviews !== 'function') return;
    const reviews = window.PurofixCore.getReviews() || [];
    if (!reviews.length) {
      listEl.innerHTML = '<div style="font-size:0.82rem; color:#94a3b8; padding:0.75rem; background:#091024; border:1px dashed #1e3a68; border-radius:8px;">No verified customer reviews yet. Approved reviews added here or submitted on the public site appear live on the home page.</div>';
      return;
    }
    listEl.innerHTML = reviews.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; padding:0.85rem 1rem; background:#091024; border:1px solid #1e3a68; border-radius:10px;">
        <div>
          <strong style="color:#fff;">${escapeHtml(r.name)}</strong>
          <span style="color:#38bdf8; font-size:0.8rem; margin-left:0.5rem;">📍 ${escapeHtml(r.locality)}</span>
          <span style="color:#fbbf24; font-size:0.85rem; margin-left:0.5rem;">${'★'.repeat(r.rating || 5)}</span>
          <div style="font-size:0.82rem; color:#cbd5e1; margin-top:0.3rem;">"${escapeHtml(r.text)}"</div>
          <div style="font-size:0.74rem; color:#94a3b8; margin-top:0.25rem;">${escapeHtml(r.serviceTag || 'RO Service')} • ${escapeHtml(r.source || 'Customer Submitted')} • ${escapeHtml(r.createdAt || '')}</div>
        </div>
        <button type="button" class="btn btn-sm btn-danger" onclick="window.PurofixAdmin.deleteAdminReview('${escapeHtml(r.id)}')">Delete</button>
      </div>
    `).join('');
  }

  function addAdminReview(e) {
    e.preventDefault();
    const name = document.getElementById('adminRevName')?.value.trim();
    const locality = document.getElementById('adminRevLocality')?.value.trim();
    const rating = document.getElementById('adminRevRating')?.value || '5';
    const serviceTag = document.getElementById('adminRevService')?.value.trim() || 'RO Service';
    const text = document.getElementById('adminRevText')?.value.trim();
    if (!name || !locality || !text) return;

    window.PurofixCore.addReview({
      name,
      locality,
      rating,
      serviceTag,
      text,
      source: 'Admin Verified'
    });

    e.target.reset();
    renderAdminReviews();
    showToast('✅ Customer review added & synced to website!');
  }

  function deleteAdminReview(id) {
    window.PurofixCore.deleteReview(id);
    renderAdminReviews();
    showToast('Review removed.');
  }

  function saveBusinessSettings(e) {
    e.preventDefault();
    const current = window.PurofixCore.getSettings();
    const newPin = document.getElementById('setAdminPin')?.value.trim() || '';
    if (newPin && newPin.length < 4) {
      alert('Security PIN must be at least 4 characters long.');
      return;
    }

    const updated = {
      ...current,
      businessName: document.getElementById('setBizName').value.trim(),
      ownerName: document.getElementById('setOwnerName').value.trim(),
      ownerTitle: document.getElementById('setOwnerTitle').value.trim(),
      ownerExperience: document.getElementById('setExperience').value.trim(),
      primaryPhone: document.getElementById('setPrimaryPhone').value.trim(),
      whatsappNumber: document.getElementById('setWhatsapp').value.trim(),
      address: document.getElementById('setAddress').value.trim(),
      startingPrice: document.getElementById('setStartPrice').value.trim(),
      responsePromise: document.getElementById('setPromise').value.trim(),
      googleReviewUrl: document.getElementById('setReviewUrl').value.trim(),
      webhookUrl: document.getElementById('setWebhookUrl')?.value.trim() || '',
      ownerAlertEmail: document.getElementById('setOwnerAlertEmail')?.value.trim() || '',
      notifySound: document.getElementById('setNotifySound')?.value !== 'off',
      adminPin: newPin || current.adminPin || 'purofix2026'
    };

    window.PurofixCore.saveSettings(updated);
    showToast('✅ Business settings saved & synced!');
    loadSettingsForm();
    renderNotificationCenter();
  }

  function saveSeoSettings(e) {
    e.preventDefault();
    const current = window.PurofixCore.getSettings();
    const updated = {
      ...current,
      metaTitle: document.getElementById('setMetaTitle').value.trim(),
      metaDescription: document.getElementById('setMetaDesc').value.trim(),
      metaKeywords: document.getElementById('setMetaKeywords')?.value.trim() || current.metaKeywords || ''
    };
    window.PurofixCore.saveSettings(updated);
    showToast('✅ Local SEO metadata updated!');
  }

  function ensureSelectOption(sel, value) {
    if (!sel || !value) return;
    const exists = Array.from(sel.options).some(opt => opt.value === value);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      sel.appendChild(opt);
    }
    sel.value = value;
  }

  // Modals Management
  function openAddLeadModal() {
    document.getElementById('leadModalForm').reset();
    document.getElementById('modalLeadId').value = '';
    document.getElementById('leadModalTitle').textContent = 'Add New Customer Booking Manually';
    const paidEl = document.getElementById('mCustPaid');
    const modeEl = document.getElementById('mCustPayMode');
    const tdsB = document.getElementById('mCustTdsBefore');
    const tdsA = document.getElementById('mCustTdsAfter');
    if (paidEl) paidEl.value = 0;
    if (modeEl) modeEl.value = 'Pending';
    if (tdsB) tdsB.value = '';
    if (tdsA) tdsA.value = '';
    populateModalTechSelect('Ashwani Tiwari');
    calcModalProfit();
    if (leadModal.showModal) leadModal.showModal();
    else leadModal.setAttribute('open', '');
  }

  function openEditLeadModal(id) {
    const lead = window.PurofixCore.getLeads().find(l => l.id === id);
    if (!lead) return;
    if (typeof window.PurofixCore.markNotificationsByLeadId === 'function') {
      window.PurofixCore.markNotificationsByLeadId(id);
      renderNotificationCenter();
    }
    const pay = window.PurofixCore.getLeadPaymentSummary(lead);

    document.getElementById('modalLeadId').value = lead.id;
    document.getElementById('leadModalTitle').textContent = `Edit Booking ${lead.id} - ${lead.name}`;
    document.getElementById('mCustName').value = lead.name || '';
    document.getElementById('mCustPhone').value = lead.phone || '';
    ensureSelectOption(document.getElementById('mCustLocality'), lead.locality || 'Tiwariganj');
    document.getElementById('mCustAddress').value = lead.address || '';
    ensureSelectOption(document.getElementById('mCustBrand'), lead.brand || 'Kent RO');
    ensureSelectOption(document.getElementById('mCustService'), lead.serviceType || 'RO General Service');
    document.getElementById('mCustStatus').value = lead.status || 'New Lead';
    populateModalTechSelect(lead.technician || 'Ashwani Tiwari');
    ensureSelectOption(document.getElementById('mCustSource'), lead.leadSource || 'Call Helpline');
    document.getElementById('mCustRevenue').value = pay.billed;
    if (document.getElementById('mCustPaid')) document.getElementById('mCustPaid').value = pay.paid;
    if (document.getElementById('mCustPayMode')) ensureSelectOption(document.getElementById('mCustPayMode'), pay.paymentMode || 'Pending');
    if (document.getElementById('mCustTdsBefore')) document.getElementById('mCustTdsBefore').value = lead.tdsBefore || '';
    if (document.getElementById('mCustTdsAfter')) document.getElementById('mCustTdsAfter').value = lead.tdsAfter || '';
    document.getElementById('mCustParts').value = lead.partsCost || 0;
    document.getElementById('mCustComm').value = lead.techComm || 0;
    document.getElementById('mCustNotes').value = lead.notes || '';

    calcModalProfit();
    if (leadModal.showModal) leadModal.showModal();
    else leadModal.setAttribute('open', '');
  }

  function closeLeadModal() {
    if (leadModal.close) leadModal.close();
    else leadModal.removeAttribute('open');
  }

  function fillModalFullPaid() {
    const rev = Math.max(0, parseFloat(document.getElementById('mCustRevenue')?.value || 0) || 0);
    const paidEl = document.getElementById('mCustPaid');
    const modeEl = document.getElementById('mCustPayMode');
    if (paidEl) paidEl.value = rev;
    if (modeEl && modeEl.value === 'Pending') modeEl.value = 'UPI / GPay / PhonePe';
    calcModalProfit();
  }

  function calcModalProfit() {
    const rev = Math.max(0, parseFloat(document.getElementById('mCustRevenue')?.value || 0) || 0);
    const paid = Math.max(0, parseFloat(document.getElementById('mCustPaid')?.value || 0) || 0);
    const parts = parseFloat(document.getElementById('mCustParts')?.value || 0) || 0;
    const comm = parseFloat(document.getElementById('mCustComm')?.value || 0) || 0;
    const profit = rev - (parts + comm);
    const pending = Math.max(0, rev - paid);

    const prev = document.getElementById('mProfitPreview');
    if (prev) {
      prev.textContent = `₹${profit}`;
      prev.className = profit >= 0 ? 'text-success' : 'text-danger';
    }

    const pendEl = document.getElementById('mPendingPreview');
    if (pendEl) {
      pendEl.textContent = pending === 0 ? '₹0 (Settled ✓)' : `₹${pending}`;
      pendEl.className = pending === 0 ? 'text-success' : 'text-danger';
    }
  }

  function handleLeadModalSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('modalLeadId').value;
    const name = document.getElementById('mCustName').value.trim();
    const phone = document.getElementById('mCustPhone').value.trim();
    const locality = document.getElementById('mCustLocality').value;
    const address = document.getElementById('mCustAddress').value.trim();
    const brand = document.getElementById('mCustBrand').value;
    const serviceType = document.getElementById('mCustService').value;
    const status = document.getElementById('mCustStatus').value;
    const technician = document.getElementById('mCustTech').value;
    const leadSource = document.getElementById('mCustSource').value;
    const revenue = Math.max(0, parseFloat(document.getElementById('mCustRevenue').value) || 0);
    const amountPaid = Math.max(0, parseFloat(document.getElementById('mCustPaid')?.value || 0) || 0);
    const paymentMode = document.getElementById('mCustPayMode')?.value || (amountPaid > 0 ? 'Cash / UPI' : 'Pending');
    const tdsBefore = (document.getElementById('mCustTdsBefore')?.value || '').trim();
    const tdsAfter = (document.getElementById('mCustTdsAfter')?.value || '').trim();
    const partsCost = parseFloat(document.getElementById('mCustParts').value) || 0;
    const techComm = parseFloat(document.getElementById('mCustComm').value) || 0;
    const notes = document.getElementById('mCustNotes').value.trim();

    if (id) {
      window.PurofixCore.updateLead(id, {
        name, phone, whatsapp: phone, locality, address, brand, serviceType,
        status, technician, leadSource, revenue, amountPaid, paymentMode,
        tdsBefore, tdsAfter, partsCost, techComm, notes
      });
      showToast(`Booking ${id} updated!`);
    } else {
      const created = window.PurofixCore.addLead({
        name, phone, whatsapp: phone, locality, address, brand, serviceType,
        status, technician, leadSource, revenue, amountPaid, paymentMode,
        tdsBefore, tdsAfter, partsCost, techComm, notes,
        _manualAdmin: true
      });
      showToast(`✅ New lead ${created.id} added!`);
    }

    closeLeadModal();
    refreshActiveView();
  }

  function changeStatus(id, newStatus) {
    window.PurofixCore.updateLead(id, { status: newStatus });
    showToast(`Status updated to "${newStatus}"!`);
    refreshActiveView();
  }

  function changeTechnician(id, tech) {
    window.PurofixCore.updateLead(id, { technician: tech });
    showToast(`Technician "${tech}" assigned!`);
  }

  function confirmDeleteLead(id) {
    if (confirm(`Are you sure you want to delete booking ${id}? This cannot be undone.`)) {
      window.PurofixCore.deleteLead(id);
      showToast(`Lead ${id} removed.`);
      refreshActiveView();
    }
  }

  function openLeadWhatsApp(id) {
    const lead = window.PurofixCore.getLeads().find(l => l.id === id);
    if (!lead) return;

    const text = `Hello ${lead.name},

Greetings from Purofix Lucknow!

Regarding your RO Service booking (${lead.id}):
*Service:* ${lead.serviceType}
*Brand:* ${lead.brand}
*Address:* ${lead.address || lead.locality}

Our technician (${lead.technician || 'Ashwani Tiwari'}) is preparing to dispatch. Please share your live Google Maps location if helpful.

Helpline: 9250332918`;

    const url = window.PurofixCore.getWhatsAppUrl(lead.whatsapp || lead.phone, text);
    window.open(url, '_blank');
  }

  function openAddTechModal() {
    document.getElementById('techModalForm').reset();
    if (techModal.showModal) techModal.showModal();
    else techModal.setAttribute('open', '');
  }

  function handleTechModalSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('techName').value.trim();
    const phone = document.getElementById('techPhone').value.trim();
    const role = document.getElementById('techRole').value.trim();
    const areas = document.getElementById('techAreas').value.trim();

    const techs = window.PurofixCore.getTechnicians();
    techs.push({
      id: 'tech-' + Date.now(),
      name, phone, whatsapp: phone, role, areas,
      status: 'Active',
      completedJobs: 0
    });
    window.PurofixCore.saveTechnicians(techs);

    if (techModal.close) techModal.close();
    else techModal.removeAttribute('open');

    showToast(`Technician ${name} added!`);
    populateModalTechSelect();
    renderTechnicians();
  }

  let syncSubscribed = false;
  let alertSubscribed = false;
  let cloudPollStarted = false;
  let liveBannerTimer = null;
  let deferredAdminPrompt = null;

  function formatRelativeTime(isoStr) {
    if (!isoStr) return 'Just now';
    const diffSec = Math.max(0, Math.round((Date.now() - new Date(isoStr).getTime()) / 1000));
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
    return String(isoStr).split('T')[0];
  }

  function renderNotificationCenter() {
    if (!window.PurofixCore || typeof window.PurofixCore.getNotifications !== 'function') return;
    const list = window.PurofixCore.getNotifications();
    const unread = list.filter((n) => n && !n.read).length;

    const bellBtn = document.getElementById('adminNotifBellBtn');
    const bellBadge = document.getElementById('notifBellBadge');
    if (bellBadge) {
      bellBadge.textContent = String(unread);
      bellBadge.style.display = unread > 0 ? 'inline-flex' : 'none';
    }
    if (bellBtn) {
      bellBtn.classList.toggle('has-unread', unread > 0);
    }

    const s = window.PurofixCore.getSettings();
    const soundBtn = document.getElementById('notifSoundToggleBtn');
    if (soundBtn) {
      const on = !(s && s.notifySound === false);
      soundBtn.textContent = on ? '🔊 On' : '🔇 Off';
    }

    const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
    const permText = document.getElementById('notifPermissionText');
    const enableBtn = document.getElementById('enableOsPushBtn');
    const barEnableBtn = document.getElementById('alertsBarEnableBtn');
    const barSummary = document.getElementById('alertsBarSummary');

    if (perm === 'granted') {
      if (permText) permText.textContent = 'Shortcut App & Browser Push: Active ✓';
      if (enableBtn) {
        enableBtn.textContent = '✓ Push Active';
        enableBtn.disabled = true;
      }
      if (barEnableBtn) {
        barEnableBtn.textContent = '✓ App Push Active';
        barEnableBtn.disabled = true;
      }
      if (barSummary) {
        barSummary.innerHTML = '<strong>Instant App &amp; Desktop Alerts Active ✓</strong> New enquiries ring here, flash an OS notification, and badge the installed Purofix shortcut icon.';
      }
    } else if (perm === 'denied') {
      if (permText) permText.textContent = 'Browser Push Blocked (In-App + Badge Active)';
      if (enableBtn) enableBtn.textContent = 'Blocked in Browser';
      if (barEnableBtn) barEnableBtn.textContent = 'Browser Alerts Blocked';
    } else {
      if (permText) permText.textContent = 'Shortcut App Push: Tap Enable for Popups';
      if (enableBtn) enableBtn.textContent = 'Enable App Push';
      if (barEnableBtn) barEnableBtn.textContent = '🔔 Enable App Push Alerts';
    }

    const listEl = document.getElementById('notifDrawerList');
    if (listEl) {
      if (!list.length) {
        listEl.innerHTML = '<div class="notif-empty">No enquiry notifications yet. New website enquiries appear here in real time.</div>';
      } else {
        listEl.innerHTML = list.map((n) => {
          const safeLead = escapeHtml(n.leadId || '');
          const cleanTel = escapeHtml(String(n.phone || '').replace(/[^0-9]/g, '').slice(-10));
          return `
            <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${escapeHtml(n.id)}">
              <div class="notif-item-top">
                <strong>${n.read ? '✓' : '🟢'} ${escapeHtml(n.customerName || 'Customer')} (${escapeHtml(n.locality || 'Lucknow')})</strong>
                <span class="notif-item-time">${formatRelativeTime(n.createdAt)}</span>
              </div>
              <div class="notif-item-msg">
                ${escapeHtml(n.serviceType || 'RO Service')} • ID: <strong>${safeLead || 'Alert'}</strong>${n.phone ? ' • 📞 ' + escapeHtml(n.phone) : ''}
              </div>
              <div class="notif-item-actions">
                ${safeLead && safeLead !== 'TEST-ALERT' ? `<button type="button" class="notif-mini-btn primary" onclick="window.PurofixAdmin.openNotificationLead('${escapeHtml(n.id)}', '${safeLead}')">View Lead</button>` : `<button type="button" class="notif-mini-btn" onclick="window.PurofixAdmin.markNotificationReadOnly('${escapeHtml(n.id)}')">Mark Read</button>`}
                ${cleanTel ? `<a href="tel:+91${cleanTel}" class="notif-mini-btn" style="text-decoration:none;">📞 Call</a>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (typeof window.PurofixCore.updatePwaAppBadge === 'function') {
      window.PurofixCore.updatePwaAppBadge(unread);
    }
  }

  function toggleNotifDrawer() {
    const drawer = document.getElementById('notifDrawer');
    if (!drawer) return;
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      renderNotificationCenter();
    }
  }

  function closeNotifDrawer() {
    const drawer = document.getElementById('notifDrawer');
    if (drawer) drawer.classList.remove('open');
  }

  function markAllNotificationsRead() {
    if (!window.PurofixCore) return;
    window.PurofixCore.markAllNotificationsRead();
    renderNotificationCenter();
    showToast('✓ All enquiry notifications marked read & App Badge cleared.');
  }

  function markNotificationReadOnly(notifId) {
    if (!window.PurofixCore) return;
    window.PurofixCore.markNotificationRead(notifId);
    renderNotificationCenter();
  }

  function openNotificationLead(notifId, leadId) {
    if (!window.PurofixCore) return;
    window.PurofixCore.markNotificationRead(notifId);
    closeNotifDrawer();
    hideLiveEnquiryBanner();
    renderNotificationCenter();
    switchTab('tab-leads');
    openEditLeadModal(leadId);
  }

  function toggleNotificationSound() {
    if (!window.PurofixCore) return;
    const s = window.PurofixCore.getSettings();
    const nextSound = s && s.notifySound === false ? true : false;
    window.PurofixCore.saveSettings({ ...s, notifySound: nextSound });
    if (nextSound) window.PurofixCore.playNotificationChime();
    renderNotificationCenter();
    loadSettingsForm();
    showToast(nextSound ? '🔊 Enquiry sound chime turned ON!' : '🔇 Enquiry sound chime muted.');
  }

  async function requestNotificationPermission() {
    if (window.PurofixCore && typeof window.PurofixCore.setOwnerAlertsEnabled === 'function') {
      window.PurofixCore.setOwnerAlertsEnabled(true);
    }
    if (typeof Notification === 'undefined') {
      showToast('ℹ️ System Push unsupported here — In-App Bell & Toast alerts remain active.');
      renderNotificationCenter();
      return 'unsupported';
    }
    let perm = Notification.permission;
    if (perm === 'default' && typeof Notification.requestPermission === 'function') {
      try {
        perm = await Notification.requestPermission();
      } catch (e) {}
    }
    renderNotificationCenter();
    if (perm === 'granted') {
      showToast('✅ Shortcut App & Browser Push Notifications enabled!');
      sendTestNotification();
    } else if (perm === 'denied') {
      showToast('⚠️ Browser notifications are blocked in Site Settings. In-App alerts still work!');
    }
    return perm;
  }

  function sendTestNotification() {
    if (!window.PurofixCore) return;
    window.PurofixCore.setOwnerAlertsEnabled(true);
    window.PurofixCore.dispatchEnquiryAlert({
      id: 'TEST-' + String(Date.now()).slice(-4),
      name: 'Test Customer Enquiry',
      phone: '9250332918',
      locality: 'Gomti Nagar, Lucknow',
      serviceType: 'RO General Service (₹399)',
      brand: 'Kent RO',
      revenue: 399,
      leadSource: 'Notification System Check'
    }, { force: true });
    showToast('🧪 Test enquiry notification fired (Popup + Bell + Chime + App Badge)!');
  }

  function hideLiveEnquiryBanner() {
    const banner = document.getElementById('liveEnquiryBanner');
    if (banner) banner.classList.remove('active');
    if (liveBannerTimer) {
      clearTimeout(liveBannerTimer);
      liveBannerTimer = null;
    }
  }

  function showLiveEnquiryBanner({ lead, notification, unreadCount }) {
    const banner = document.getElementById('liveEnquiryBanner');
    if (!banner || !lead) return;
    const isTest = String(lead.id || '').startsWith('TEST-');
    const cleanTel = String(lead.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const viewAction = isTest
      ? `<button type="button" class="btn btn-primary btn-sm" onclick="window.PurofixAdmin.hideLiveEnquiryBanner()">✓ Looks Good</button>`
      : `<button type="button" class="btn btn-primary btn-sm" onclick="window.PurofixAdmin.openNotificationLead('${escapeHtml(notification ? notification.id : '')}', '${escapeHtml(lead.id || '')}')">📋 View Lead</button>`;

    banner.innerHTML = `
      <div class="leb-head">
        <div>
          <div class="leb-title">🔔 NEW RO ENQUIRY RECEIVED! (${escapeHtml(lead.id || '')})</div>
          <div class="leb-meta">
            <strong>${escapeHtml(lead.name || 'Customer')}</strong> • ${escapeHtml(lead.locality || 'Lucknow')}<br>
            ${escapeHtml(lead.serviceType || 'RO Service')}${lead.phone ? ' • 📞 ' + escapeHtml(lead.phone) : ''} • ₹${Math.round(parseFloat(lead.revenue || 199) || 199)}
            ${unreadCount > 0 ? `<span style="color:#38bdf8; font-weight:700;"> • ${unreadCount} unread</span>` : ''}
          </div>
        </div>
        <button type="button" class="leb-close" aria-label="Dismiss alert" onclick="window.PurofixAdmin.hideLiveEnquiryBanner()">&times;</button>
      </div>
      <div class="leb-actions">
        ${viewAction}
        ${cleanTel ? `<a href="tel:+91${escapeHtml(cleanTel)}" class="btn btn-whatsapp btn-sm">📞 Call Customer</a>` : ''}
        <button type="button" class="btn btn-secondary btn-sm" onclick="window.PurofixAdmin.hideLiveEnquiryBanner()">Dismiss</button>
      </div>
    `;
    banner.classList.add('active');
    if (liveBannerTimer) clearTimeout(liveBannerTimer);
    liveBannerTimer = setTimeout(hideLiveEnquiryBanner, 15000);
  }

  function refreshActiveView() {
    renderDashboard();
    renderNotificationCenter();
    if (activeTab === 'tab-leads') filterLeads();
    else if (activeTab === 'tab-customers') renderCustomersLedger();
    else if (activeTab === 'tab-reminders') renderReminders();
    else if (activeTab === 'tab-finance') renderFinances();
    else if (activeTab === 'tab-technicians') renderTechnicians();
    else if (activeTab === 'tab-settings') loadSettingsForm();
  }

  async function syncCloudNow() {
    if (!window.PurofixCore) return;
    const s = window.PurofixCore.getSettings();
    if (!(s.webhookUrl || '').trim()) {
      refreshActiveView();
      showToast('ℹ️ Live browser tab sync active. Add your Apps Script URL in Settings for cross-device Cloud Sync.');
      return;
    }
    showToast('🔄 Pulling latest leads, reviews & settings from Cloud...');
    const res = await window.PurofixCore.syncFromCloud('admin');
    refreshActiveView();
    if (res) {
      showToast('✅ Cloud Sync completed!');
    } else {
      showToast('⚠️ Could not reach Cloud URL — local live sync remains active.');
    }
  }

  async function installAdminApp() {
    const hasGesture = !navigator.userActivation || navigator.userActivation.isActive;
    if (deferredAdminPrompt && hasGesture) {
      try {
        await deferredAdminPrompt.prompt();
        await deferredAdminPrompt.userChoice;
        deferredAdminPrompt = null;
        return;
      } catch (e) {
        deferredAdminPrompt = null;
      }
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    if (isIos) {
      showToast('📲 On iPhone: Tap Share icon -> "Add to Home Screen" to install Purofix Admin App.');
    } else {
      showToast('📲 Use your browser menu (⋮) -> "Install app" / "Add to Home screen" for Admin App.');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStatusPill(status) {
    switch (status) {
      case 'New Lead': return `<span class="status-pill status-new">New Lead</span>`;
      case 'Technician Assigned':
      case 'On The Way':
      case 'In Progress':
      case 'Confirmed': return `<span class="status-pill status-assigned">${status}</span>`;
      case 'Completed': return `<span class="status-pill status-completed">Completed ✓</span>`;
      case 'Cancelled': return `<span class="status-pill status-cancelled">Cancelled</span>`;
      default: return `<span class="status-pill status-new">${status}</span>`;
    }
  }

  function handleRestoreBackup(e) {
    const file = e.target && e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const ok = window.PurofixCore.importBackupJSON(evt.target.result);
      if (ok) {
        showToast('✅ Backup restored successfully!');
        initDashboard();
      } else {
        alert('Invalid backup JSON file.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function updateCloudBadge() {
    const badge = document.getElementById('cloudSyncStatusBadge');
    if (!badge || !window.PurofixCore) return;
    const s = window.PurofixCore.getSettings();
    const hasCloud = Boolean((s.webhookUrl || '').trim());
    badge.textContent = hasCloud ? '● Google Sheet Cloud Synced' : '● Browser Live Sync Active';
    badge.style.color = hasCloud ? '#10b981' : '#38bdf8';
  }

  function initDashboard() {
    renderDashboard();
    loadSettingsForm();
    updateCloudBadge();
    renderNotificationCenter();

    if (!syncSubscribed && window.PurofixCore && typeof window.PurofixCore.onSync === 'function') {
      syncSubscribed = true;
      window.PurofixCore.onSync(() => {
        if (sessionStorage.getItem('purofix_admin_logged_in') === 'true') {
          refreshActiveView();
        }
      });
    }

    if (!alertSubscribed && window.PurofixCore && typeof window.PurofixCore.onEnquiryAlert === 'function') {
      alertSubscribed = true;
      window.PurofixCore.onEnquiryAlert(({ lead, notification, unreadCount }) => {
        if (sessionStorage.getItem('purofix_admin_logged_in') === 'true') {
          window.PurofixCore.playNotificationChime();
          showLiveEnquiryBanner({ lead, notification, unreadCount });
          renderNotificationCenter();
          refreshActiveView();
        }
      });
    }

    if (!cloudPollStarted) {
      cloudPollStarted = true;
      document.addEventListener('click', (ev) => {
        const wrap = document.getElementById('adminNotifWrap');
        if (wrap && !wrap.contains(ev.target)) {
          closeNotifDrawer();
        }
      });
      setInterval(() => {
        if (
          document.visibilityState === 'visible' &&
          sessionStorage.getItem('purofix_admin_logged_in') === 'true' &&
          window.PurofixCore
        ) {
          const s = window.PurofixCore.getSettings();
          if ((s.webhookUrl || '').trim()) {
            window.PurofixCore.syncFromCloud('admin').then((data) => {
              if (data) refreshActiveView();
            });
          }
        }
      }, 20000);
    }

    if (window.PurofixCore && typeof window.PurofixCore.syncFromCloud === 'function') {
      window.PurofixCore.syncFromCloud('admin').then((data) => {
        if (data) refreshActiveView();
      });
    }

    // Handle deep link from clicked OS / Shortcut App notification (?lead=PFX-XXXX)
    try {
      const params = new URLSearchParams(window.location.search);
      const focusLeadId = params.get('lead');
      if (focusLeadId) {
        switchTab('tab-leads');
        openEditLeadModal(focusLeadId);
      }
    } catch (e) {}
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredAdminPrompt = e;
    const btn = document.getElementById('installAdminAppBtn');
    if (btn) btn.style.display = 'flex';
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event && event.data && event.data.type === 'FOCUS_LEAD' && event.data.leadId) {
        if (sessionStorage.getItem('purofix_admin_logged_in') === 'true') {
          switchTab('tab-leads');
          openEditLeadModal(event.data.leadId);
        }
      }
    });
  }

  // Global Admin Controller Export
  window.PurofixAdmin = {
    handleLogin,
    logout,
    switchTab,
    toggleSidebar,
    filterLeads,
    setQueueFilter,
    jumpToQueue,
    renderCustomersLedger,
    openCustomerHistoryModal,
    openNewBookingForCustomer,
    markLeadPaid,
    fillModalFullPaid,
    openReceiptModal,
    filterReminders,
    send90DayWhatsApp,
    rebookService,
    changeStatus,
    changeTechnician,
    openAddLeadModal,
    openEditLeadModal,
    closeLeadModal,
    calcModalProfit,
    handleLeadModalSubmit,
    confirmDeleteLead,
    openLeadWhatsApp,
    openAddTechModal,
    handleTechModalSubmit,
    saveBusinessSettings,
    saveSeoSettings,
    addAdminReview,
    deleteAdminReview,
    handleRestoreBackup,
    syncCloudNow,
    installAdminApp,
    toggleNotifDrawer,
    closeNotifDrawer,
    markAllNotificationsRead,
    markNotificationReadOnly,
    openNotificationLead,
    toggleNotificationSound,
    requestNotificationPermission,
    sendTestNotification,
    hideLiveEnquiryBanner
  };

  document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
  });

})();
