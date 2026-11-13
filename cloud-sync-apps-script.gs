/**
 * PUROFIX LUCKNOW — Free Cloud Backend (Google Apps Script + Google Sheets)
 * -------------------------------------------------------------------------
 * Deploy this file inside script.google.com attached to a blank Google Sheet:
 * 1. Create a Google Sheet -> Extensions -> Apps Script -> paste this code -> Save.
 * 2. Click Deploy -> New deployment -> Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Copy the Web App URL (https://script.google.com/macros/s/.../exec)
 * 4. Paste it into Purofix Admin -> Settings -> Cloud Sync / Backend URL & Save!
 *    Once set, all leads, reviews, technicians & SEO/business settings sync across phones & PCs.
 */

function getStoreSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('PUROFIX_STORE');
  if (!sheet) {
    sheet = ss.insertSheet('PUROFIX_STORE');
    sheet.getRange('A1:B1').setValues([['KEY', 'JSON_VALUE']]);
  }
  return sheet;
}

function getLeadsLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LEADS_READABLE');
  const headers = [[
    'Booking ID', 'Booking Date', 'Customer Name', 'Phone', 'Locality', 'Address',
    'RO Brand', 'Service', 'Status', 'Technician', 'Revenue (INR)', 'Amount Paid (INR)',
    'Pending Balance (INR)', 'Payment Status', 'Payment Mode', 'TDS Before', 'TDS After', 'Net Profit (INR)'
  ]];
  if (!sheet) {
    sheet = ss.insertSheet('LEADS_READABLE');
  }
  sheet.getRange('A1:R1').setValues(headers);
  return sheet;
}

function getCustomerLedgerSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CUSTOMER_LEDGER');
  const headers = [[
    'Customer Name', 'Phone', 'Locality', 'Services Taken', 'Completed (Okay)',
    'Pending / Continue', 'Total Billed (INR)', 'Amount Paid (INR)', 'Pending Balance (INR)'
  ]];
  if (!sheet) {
    sheet = ss.insertSheet('CUSTOMER_LEDGER');
  }
  sheet.getRange('A1:I1').setValues(headers);
  return sheet;
}

function computePay(l) {
  const billed = Math.max(0, parseFloat(l.revenue || 0) || 0);
  const hasPaid = l.amountPaid !== undefined && l.amountPaid !== null && l.amountPaid !== '';
  const paid = hasPaid ? Math.max(0, parseFloat(l.amountPaid) || 0) : (l.status === 'Completed' ? billed : 0);
  const pending = l.status === 'Cancelled' ? 0 : Math.max(0, billed - paid);
  const pStatus = l.status === 'Cancelled' ? 'Cancelled' : (billed > 0 && pending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));
  return { billed: billed, paid: paid, pending: pending, paymentStatus: pStatus };
}

function readKey(key, fallback) {
  const sheet = getStoreSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key && rows[i][1]) {
      return JSON.parse(rows[i][1]);
    }
  }
  return fallback;
}

function writeKey(key, value) {
  const sheet = getStoreSheet();
  const rows = sheet.getDataRange().getValues();
  const jsonStr = JSON.stringify(value);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(jsonStr);
      return;
    }
  }
  sheet.appendRow([key, jsonStr]);
}

function syncReadableLeads(leads) {
  const sheet = getLeadsLogSheet();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 18).clearContent();
  }
  if (!leads || !leads.length) {
    syncCustomerLedger([]);
    return;
  }
  const rows = leads.map((l) => {
    const pay = computePay(l);
    return [
      l.id || '', l.bookingDate || '', l.name || '', l.phone || '',
      l.locality || '', l.address || '', l.brand || '', l.serviceType || '',
      l.status || '', l.technician || '', pay.billed, pay.paid,
      pay.pending, pay.paymentStatus, l.paymentMode || 'Pending',
      l.tdsBefore || '', l.tdsAfter || '', l.profit || 0
    ];
  });
  sheet.getRange(2, 1, rows.length, 18).setValues(rows);
  syncCustomerLedger(leads);
}

function syncCustomerLedger(leads) {
  const sheet = getCustomerLedgerSheet();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).clearContent();
  }
  if (!leads || !leads.length) return;
  const map = {};
  leads.forEach((l) => {
    const digits = String(l.phone || l.whatsapp || '').replace(/[^0-9]/g, '');
    const key = digits.length >= 10 ? digits.slice(-10) : ('name:' + String(l.name || 'customer').toLowerCase());
    const pay = computePay(l);
    if (!map[key]) {
      map[key] = {
        name: l.name || 'Customer',
        phone: l.phone || '',
        locality: l.locality || 'Lucknow',
        total: 0,
        done: 0,
        active: 0,
        billed: 0,
        paid: 0,
        pending: 0
      };
    }
    const c = map[key];
    c.total += 1;
    if (l.status === 'Completed') c.done += 1;
    else if (l.status !== 'Cancelled') c.active += 1;
    if (l.status !== 'Cancelled') c.billed += pay.billed;
    c.paid += pay.paid;
    c.pending += pay.pending;
  });
  const rows = Object.keys(map).map((k) => {
    const c = map[k];
    return [c.name, c.phone, c.locality, c.total, c.done, c.active, c.billed, c.paid, c.pending];
  });
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'public';
  const settings = readKey('SETTINGS', {});
  const reviews = readKey('REVIEWS', []);

  if (action === 'admin_pull') {
    return jsonResponse({
      ok: true,
      settings: settings,
      reviews: reviews,
      leads: readKey('LEADS', []),
      technicians: readKey('TECHNICIANS', [])
    });
  }

  // Public bootstrap strips adminPin & webhook secrets
  const publicSettings = Object.assign({}, settings);
  delete publicSettings.adminPin;
  delete publicSettings.webhookUrl;

  return jsonResponse({
    ok: true,
    settings: publicSettings,
    reviews: reviews
  });
}

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  const event = body.event || '';

  if (event === 'new_lead' && body.lead) {
    const leads = readKey('LEADS', []);
    const exists = leads.some((l) => l.id === body.lead.id);
    if (!exists) leads.unshift(body.lead);
    writeKey('LEADS', leads);
    syncReadableLeads(leads);

    // Optional instant Owner Email Alert when ownerAlertEmail is saved in Admin Settings
    try {
      const settings = readKey('SETTINGS', {});
      const notifyEmail = String(settings.ownerAlertEmail || '').trim();
      if (!exists && notifyEmail && notifyEmail.indexOf('@') !== -1) {
        const l = body.lead;
        MailApp.sendEmail({
          to: notifyEmail,
          subject: '🔔 New Purofix Enquiry: ' + (l.name || 'Customer') + ' (' + (l.locality || 'Lucknow') + ') [' + (l.id || '') + ']',
          body:
            'New RO Service Enquiry Received!\n\n' +
            'Booking ID: ' + (l.id || '') + '\n' +
            'Customer: ' + (l.name || '') + '\n' +
            'Mobile / WhatsApp: ' + (l.phone || '') + '\n' +
            'Locality: ' + (l.locality || '') + '\n' +
            'RO Brand: ' + (l.brand || '') + '\n' +
            'Service: ' + (l.serviceType || '') + '\n' +
            'Quoted Amount: Rs.' + (l.revenue || 199) + '\n' +
            'Source: ' + (l.leadSource || 'Website') + '\n'
        });
      }
    } catch (mailErr) {}

    return jsonResponse({ ok: true, id: body.lead.id });
  }

  if (event === 'save_leads' && Array.isArray(body.leads)) {
    writeKey('LEADS', body.leads);
    syncReadableLeads(body.leads);
    return jsonResponse({ ok: true, count: body.leads.length });
  }

  if (event === 'new_review' && body.review) {
    const reviews = readKey('REVIEWS', []);
    const exists = reviews.some((r) => r.id === body.review.id);
    if (!exists) reviews.unshift(body.review);
    writeKey('REVIEWS', reviews);
    return jsonResponse({ ok: true, id: body.review.id });
  }

  if (event === 'save_reviews' && Array.isArray(body.reviews)) {
    writeKey('REVIEWS', body.reviews);
    return jsonResponse({ ok: true, count: body.reviews.length });
  }

  if (event === 'save_technicians' && Array.isArray(body.technicians)) {
    writeKey('TECHNICIANS', body.technicians);
    return jsonResponse({ ok: true });
  }

  if (event === 'save_settings' && body.settings) {
    writeKey('SETTINGS', body.settings);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'Unknown event' });
}
