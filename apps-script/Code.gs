/**
 * Pasha Beauty Studio — website form backend
 * ------------------------------------------
 * Built from the Skill 03 house template (same structure as the Paša Berber script).
 * The booking form (rezervacije.html + home page) sends here. It also opens WhatsApp on the
 * visitor's phone with the same request; this script is the record (Google Sheet) and the
 * notification (one branded email).
 *
 * The site sends a GET with URL params (Apps Script 302-redirects POSTs and turns them into
 * GETs, which loses e.postData). doPost is kept for a JSON body in case the front end changes.
 */

/* ================= CONFIG ================= */

// Your own inbox while building and testing. Only change to the client's address
// (pashabeautystudioo@gmail.com) after sign-off, then redeploy a new version.
var NOTIFY_TO   = 'TVOJ-EMAIL@gmail.com';
var SENDER_NAME = 'Pasha Beauty Studio sajt';
var BRAND       = 'Pasha Beauty Studio';
// The leads sheet, linked at the foot of every notification. Empty hides it.
var SHEET_URL   = '';
// Leave empty when the script is bound to the sheet. Set when standalone.
var SHEET_ID    = '';

/* ================= PALETTE =================
   Light by default (house style). Brand tokens from the site's styles.css:
   gold #c9a23a (accent), gold-ink #8a6818 (gold text on white, AA), warm black #1b1512,
   cream #f6efe5. The primary button is gold with dark text, like the site's buttons. */

var C = {
  page:      '#F6EFE5', // site cream behind the card
  card:      '#FFFFFF', // the card itself
  panel:     '#FAF6F0', // the message panel
  line:      '#E9E1D5', // hairlines
  brand:     '#C9A23A', // accent: header rule, panel edge, primary button
  brandText: '#8A6818', // gold text on white (eyebrow)
  brandDark: '#C9A23A', // primary button background
  ink:       '#1B1512', // headings and values
  body:      '#3D3530', // message copy
  muted:     '#857A70', // labels, footer
  onBrand:   '#1B1512'  // text on the primary button
};

var RADIUS = '16px'; // the card
var RPILL  = '8px';  // panels and buttons

// One typeface throughout. Web fonts do not load in email.
var SANS = 'Helvetica,Arial,sans-serif';

/* ================= ENTRY POINTS ================= */

function doGet(e) {
  var d = readParams_(e);
  if (!d.name && !d.phone && !d.message && !d.service) {
    return json_({ ok: true, service: BRAND + ' form endpoint' });
  }
  return handle_(d);
}

function doPost(e) {
  var d = readParams_(e);
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      var mapped = readParams_({ parameter: body });
      for (var k in mapped) if (mapped[k]) d[k] = mapped[k];
    } catch (err) { /* not JSON, params already read */ }
  }
  return handle_(d);
}

function handle_(d) {
  var sheetErr = '';
  // Independent on purpose: a failed sheet write must never cost the lead.
  try { saveRow_(d); } catch (err) { sheetErr = String(err); }
  try {
    sendEmail_(d);
  } catch (err) {
    return json_({ ok: false, error: String(err), sheetError: sheetErr });
  }
  return json_({ ok: true, sheetError: sheetErr });
}

// The site's field names (Serbian) mapped to the keys used below.
function readParams_(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  return {
    name:     p.ime || p.name || '',
    phone:    p.telefon || p.phone || '',
    email:    p.email || '',
    category: p.kategorija || '',
    service:  p.usluga || p.type || '',
    extras:   p.dodaci || '',
    estimate: p.okvirno || '',
    when:     p.termin || '',
    message:  p.poruka || p.message || '',
    page:     p.stranica || p.page || ''
  };
}

/* ================= SHEET ================= */

function saveRow_(d) {
  var ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: bind the script or set SHEET_ID.');
  var sh = ss.getSheetByName('Rezervacije') || ss.insertSheet('Rezervacije');
  var head = ['Primljeno', 'Ime', 'Telefon', 'Email', 'Kategorija', 'Usluga', 'Dodaci', 'Okvirno', 'Kada', 'Poruka', 'Stranica'];
  if (sh.getLastRow() === 0) {
    sh.appendRow(head);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), d.name, d.phone, d.email, d.category, d.service, d.extras, d.estimate, d.when, d.message, d.page]);
}

/* ================= EMAIL ================= */

function sendEmail_(d) {
  MailApp.sendEmail(NOTIFY_TO, buildSubject_(d), buildPlain_(d), {
    name: SENDER_NAME,
    htmlBody: buildHtml_(d),
    replyTo: /.+@.+\..+/.test(String(d.email || '')) ? d.email : undefined
  });
}

function serviceLine_(d) {
  return [d.category, d.service].filter(function (x) { return x; }).join(', ');
}

function buildSubject_(d) {
  var who  = d.name || 'Nova klijentkinja';
  var what = d.service || d.category;
  return 'Nova rezervacija sa sajta ' + BRAND + ': ' + who + (what ? ' (' + what + ')' : '');
}

function buildPlain_(d) {
  var lines = [
    'NOVA REZERVACIJA, ' + BRAND.toUpperCase(),
    '',
    'Ime:        ' + (d.name || ''),
    'Telefon:    ' + (d.phone || ''),
    'Email:      ' + (d.email || ''),
    'Usluga:     ' + serviceLine_(d),
    'Dodaci:     ' + (d.extras || ''),
    'Okvirno:    ' + (d.estimate || '').replace(/^Okvirno:\s*/, ''),
    'Kada:       ' + (d.when || ''),
    '',
    'PORUKA',
    (d.message || '(bez poruke)'),
    '',
    'Poslato sa sajta ' + BRAND + (d.page ? ' (' + d.page + ')' : '') + '. Klijentkinji je otvoren i WhatsApp sa istom porukom.'
  ];
  return lines.join('\n');
}

// Local Serbian numbers (06x...) to international digits for wa.me.
function waDigits_(phone) {
  var n = String(phone || '').replace(/\D/g, '');
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.charAt(0) === '0') n = '381' + n.slice(1);
  return n;
}

/**
 * Rules baked in here, all deliberate. See reference/gotchas.md.
 *  - tables and inline styles only — no flex/grid, no web fonts, no images
 *  - !important on every colour + bgcolor on every block (Gmail / Outlook.com dark mode)
 *  - color-scheme meta stops Apple Mail auto-inverting
 *  - nothing load-bearing on border-radius (Outlook squares it off harmlessly)
 *  - buttons are padded table cells, not styled links
 */
function buildHtml_(d) {
  var name = d.name || 'Klijentkinja';

  // A button only appears when the value is actually usable.
  var digits   = String(d.phone || '').replace(/[^\d+]/g, '');
  var callable = digits.replace(/\D/g, '').length >= 6;
  var tel      = 'tel:' + esc_(digits);
  var wa       = 'https://wa.me/' + esc_(waDigits_(d.phone));
  var mailable = /.+@.+\..+/.test(String(d.email || ''));
  var estimate = String(d.estimate || '').replace(/^Okvirno:\s*/, '');

  var rows = [
    ['Ime',     d.name],
    ['Telefon', d.phone, callable ? tel : ''],
    ['Email',   d.email, mailable ? 'mailto:' + esc_(d.email) : ''],
    ['Usluga',  serviceLine_(d)],
    ['Dodaci',  d.extras],
    ['Okvirno', estimate],
    ['Kada',    d.when]
  ].filter(function (r) { return r[1]; }).map(function (r, i, all) {
    var border = (i === all.length - 1) ? '' : 'border-bottom:1px solid ' + C.line + ';';
    var shown = esc_(r[1]);
    var value = r[2]
      ? '<a href="' + r[2] + '" style="color:' + C.ink + ' !important;text-decoration:none;' +
        'border-bottom:1px solid ' + C.line + ';">' + shown + '</a>'
      : shown;
    return '<tr>' +
      '<td bgcolor="' + C.card + '" width="110" style="background-color:' + C.card + ' !important;' + border +
        'padding:15px 16px 15px 0;color:' + C.muted + ' !important;font:700 11px/1.35 ' + SANS + ';' +
        'letter-spacing:.13em;text-transform:uppercase;vertical-align:top;">' + r[0] + '</td>' +
      '<td bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' + border +
        'padding:13px 0;color:' + C.ink + ' !important;font:400 17px/1.45 ' + SANS + ';word-break:break-word;">' + value + '</td>' +
    '</tr>';
  }).join('');

  var panel =
    '<tr><td bgcolor="' + C.panel + '" style="background-color:' + C.panel + ' !important;' +
      'border-left:3px solid ' + C.brand + ';border-radius:' + RPILL + ';padding:20px 22px;">' +
      '<div style="color:' + C.muted + ' !important;font:700 11px/1.2 ' + SANS + ';letter-spacing:.13em;' +
        'text-transform:uppercase;padding-bottom:10px;">Poruka</div>' +
      '<div style="color:' + C.body + ' !important;font:400 16px/1.65 ' + SANS + ';white-space:pre-wrap;word-break:break-word;">' +
        esc_(d.message || 'Bez poruke.') + '</div>' +
    '</td></tr>';

  // Two actions: call (solid gold), WhatsApp (ghost). Only with a usable number.
  var solid = function (href, label) {
    return '<td bgcolor="' + C.brandDark + '" style="background-color:' + C.brandDark + ' !important;' +
      'border-radius:' + RPILL + ';padding:15px 30px;">' +
      '<a href="' + href + '" style="color:' + C.onBrand + ' !important;text-decoration:none;' +
      'font:700 13px/1 ' + SANS + ';letter-spacing:.1em;text-transform:uppercase;">' + label + '</a></td>';
  };
  var ghost = function (href, label) {
    return '<td bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
      'border:1px solid ' + C.line + ';border-radius:' + RPILL + ';padding:14px 28px;">' +
      '<a href="' + href + '" style="color:' + C.ink + ' !important;text-decoration:none;' +
      'font:700 13px/1 ' + SANS + ';letter-spacing:.1em;text-transform:uppercase;">' + label + '</a></td>';
  };

  var buttons = '';
  if (callable) {
    buttons = solid(tel, 'Pozovi') + '<td width="10" style="width:10px;">&nbsp;</td>' + ghost(wa, 'WhatsApp');
  } else if (mailable) {
    buttons = solid('mailto:' + esc_(d.email), 'Odgovori mejlom');
  }

  // No usable contact method: drop the row rather than leave an empty band.
  var actions = buttons
    ? '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;padding:28px 40px 38px;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' + buttons + '</tr></table>' +
      '</td></tr>'
    : '<tr><td bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;height:34px;font-size:0;line-height:0;">&nbsp;</td></tr>';

  var sub = serviceLine_(d);
  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light dark">' +
'<meta name="supported-color-schemes" content="light dark">' +
'<style>:root{color-scheme:light dark;supported-color-schemes:light dark;}' +
'@media (max-width:600px){.pad{padding-left:24px !important;padding-right:24px !important;}' +
'.hd{font-size:26px !important;}}</style></head>' +
'<body style="margin:0;padding:0;background-color:' + C.page + ' !important;" bgcolor="' + C.page + '">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
  'bgcolor="' + C.page + '" style="background-color:' + C.page + ' !important;">' +
'<tr><td align="center" style="padding:32px 12px 44px;">' +

  '<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'style="width:100%;max-width:600px;">' +

  '<tr><td style="padding:0;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
    'border:1px solid ' + C.line + ';border-radius:' + RADIUS + ';">' +

    '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
      'border-top:4px solid ' + C.brand + ';border-radius:' + RADIUS + ' ' + RADIUS + ' 0 0;padding:34px 40px 28px;">' +
      '<div style="color:' + C.brandText + ' !important;font:700 11px/1.2 ' + SANS + ';letter-spacing:.2em;' +
        'text-transform:uppercase;">' + esc_(BRAND) + '</div>' +
      '<div class="hd" style="color:' + C.ink + ' !important;font:700 32px/1.15 ' + SANS + ';' +
        'letter-spacing:-.01em;padding-top:14px;">Nova rezervacija</div>' +
      '<div style="color:' + C.muted + ' !important;font:400 15px/1.5 ' + SANS + ';padding-top:10px;word-break:break-word;">' +
        esc_(name) + (sub ? ' &middot; ' + esc_(sub) : '') + '</div>' +
    '</td></tr>' +

    (rows ? '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;padding:0 40px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        'bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;' +
        'border-top:1px solid ' + C.line + ';">' + rows + '</table>' +
    '</td></tr>' : '') +

    '<tr><td class="pad" bgcolor="' + C.card + '" style="background-color:' + C.card + ' !important;padding:26px 40px 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + panel + '</table>' +
    '</td></tr>' +

    actions +

  '</table></td></tr>' +

    '<tr><td class="pad" bgcolor="' + C.page + '" style="background-color:' + C.page + ' !important;padding:20px 40px 0;">' +
      '<div style="color:' + C.muted + ' !important;font:700 11px/1.7 ' + SANS + ';letter-spacing:.12em;' +
        'text-transform:uppercase;">Forma za zakazivanje' +
        (d.page ? ' &nbsp;&middot;&nbsp; ' + esc_(d.page) : '') + '</div>' +
      '<div style="color:' + C.muted + ' !important;font:400 12px/1.7 ' + SANS + ';padding-top:4px;">' +
        'Klijentkinji je otvoren i WhatsApp sa istom porukom.</div>' +
      (SHEET_URL ? '<div style="padding-top:8px;"><a href="' + esc_(SHEET_URL) + '" ' +
        'style="color:' + C.muted + ' !important;font:400 12px/1.7 ' + SANS + ';' +
        'text-decoration:underline;">Pogledaj sve upite u tabeli</a></div>' : '') +
    '</td></tr>' +

  '</table>' +
  '<!--[if mso]></td></tr></table><![endif]-->' +
'</td></tr></table></body></html>';
}

/* ================= HELPERS ================= */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
