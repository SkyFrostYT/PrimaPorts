'use strict';

// ------------------------------------------------------------------ icônes
// Catégories d'appareils (24×24)
const ICONS = {
  storage: '<path d="M8 3h8v6H8z"/><path d="M6 9h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M10 5.5h1M13 5.5h1"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3"/>',
  gamepad: '<path d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.4a2.5 2.5 0 0 1-4.2 1.2L14.5 15h-5l-2.5 2.6a2.5 2.5 0 0 1-4.2-1.2L2.1 13A5 5 0 0 1 7 7z"/><path d="M7.5 10v3M6 11.5h3"/><circle cx="15.5" cy="10.5" r=".6"/><circle cx="17.5" cy="12.5" r=".6"/>',
  audio: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  camera: '<circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="2"/><path d="M8 20h8M12 16v4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  network: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  power: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
  usb: '<path d="M12 2v14"/><path d="m9 5 3-3 3 3"/><path d="M12 13 7 10V7.5M12 11l5-2V6.5"/><circle cx="12" cy="18.5" r="2.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>',
};
// Connecteurs physiques (34×22)
const GLYPHS = {
  'usb-a': '<rect x="3" y="5" width="28" height="12" rx="1.5"/><rect x="7" y="8.5" width="20" height="4" rx=".6"/>',
  'usb-c': '<rect x="4" y="6" width="26" height="10" rx="5"/><path d="M11 11h12"/>',
  hdmi: '<path d="M3 6h28v6l-4 4H7l-4-4z"/><path d="M9 10h16"/>',
  dp: '<path d="M3 6h28v10H8l-5-4z"/><path d="M10 11h15"/>',
  dvi: '<path d="M4 6h26l-3 10H7z"/><path d="M11 10h.01M15 10h.01M19 10h.01M23 10h.01"/>',
  video: '<rect x="5" y="4" width="24" height="14" rx="2"/>',
  wireless: '<path d="M9 9a12 12 0 0 1 16 0M12 12.5a7 7 0 0 1 10 0"/><circle cx="17" cy="16" r=".8"/>',
  jack: '<circle cx="17" cy="11" r="6.5"/><circle cx="17" cy="11" r="2.2"/>',
  ethernet: '<rect x="8" y="3" width="18" height="15" rx="2"/><path d="M13 18v2h8v-2M12.5 7v3M15.5 7v3M18.5 7v3M21.5 7v3"/>',
  power: '<path d="M14 2v5M20 2v5M10.5 7h13v4a6.5 6.5 0 0 1-13 0z"/><path d="M17 17.5V21"/>',
  bluetooth: '<path d="m12 6.5 10 9-5 4.5V2l5 4.5-10 9"/>',
};
GLYPHS.vga = GLYPHS.dvi;
GLYPHS['wireless-display'] = GLYPHS.wireless;
GLYPHS['ethernet-usb'] = GLYPHS.ethernet;
const icon = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICONS[n] || ICONS.usb}</svg>`;
const glyph = t => `<svg viewBox="0 0 34 22" aria-hidden="true">${GLYPHS[t] || GLYPHS.video}</svg>`;

const ORDER = ['storage', 'display', 'keyboard', 'mouse', 'gamepad', 'audio', 'camera', 'phone', 'network', 'printer', 'power', 'usb'];

// ------------------------------------------------------------------ état
const api = window.primaports;
const $ = s => document.querySelector(s);
const state = { snap: null, history: [], q: '', open: new Set(), fresh: new Set(), langPref: 'auto', openAtLogin: false, dirty: false };
let L = I18N.create(I18N.resolve('auto', navigator.language));   // textes de la langue courante
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const time = iso => new Date(iso).toLocaleTimeString(L.locale, { hour: '2-digit', minute: '2-digit' });
const portOf = d => state.snap?.ports.find(p => p.id === d.portRef) || (d.portType ? { type: d.portType } : null);
const portName = d => L.portLabel(portOf(d)) || L.connLabel(d.connection);

function matches(d) {
  if (!state.q) return true;
  const hay = [L.deviceName(d), d.vendor, portName(d), L.category(d.category), ...L.infoRows(d, state.snap.ports).map(r => r[1])].join(' ').toLowerCase();
  return state.q.split(/\s+/).every(w => hay.includes(w));
}

// ------------------------------------------------------------------ langue
function applyLang() {
  document.documentElement.lang = L.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = L.t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = L.t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', L.t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = L.t(el.dataset.i18nPlaceholder);
  $('#langBtn').textContent = L.lang.toUpperCase();
  applyTheme();
  render(); renderHistory();
}

// ------------------------------------------------------------------ rendu
function render() {
  const s = state.snap;
  if (!s) return;
  // Fenêtre cachée dans la zone de notification : on redessinera au retour
  if (document.hidden) { state.dirty = true; return; }
  state.dirty = false;
  $('#machine').textContent = `${s.computer.name} · ${s.computer.model || ''}`;
  renderSockets(s);
  renderDevices(s);
  renderPower(s.power || {});
}

// Prises : les connecteurs USB du PC occupés, plus les liaisons actives non USB (vidéo, jack, Ethernet, secteur, Bluetooth).
function renderSockets(s) {
  const byId = new Map(s.devices.map(d => [d.id, d]));
  const tiles = s.ports.filter(p => p.deviceId && byId.has(p.deviceId))
    .map(p => ({ type: p.type, label: L.portLabel(p), sub: L.portStandard(p), device: byId.get(p.deviceId) }));
  for (const d of s.devices) {
    if (!d.portType || d.portRef || d.portType === 'bluetooth') continue;
    const sub = {
      power: d.watts ? L.t('ports.toBattery', { w: L.num(d.watts) }) : L.t('ports.ac'),
      jack: L.t('ports.analog'),
      ethernet: d.speedMbps ? L.rate(d.speedMbps) : L.t('ports.wired'),
    }[d.portType] || L.t('ports.videoOut');
    tiles.push({ type: d.portType, label: L.portLabel({ type: d.portType }), sub, device: d });
  }
  const bt = s.devices.filter(d => d.portType === 'bluetooth');
  if (bt.length) tiles.push({ type: 'bluetooth', label: 'Bluetooth', sub: L.t('ports.wireless'), device: bt.length === 1 ? bt[0] : null, many: bt.length });

  const used = s.ports.filter(p => p.deviceId && byId.has(p.deviceId)).length;
  $('#portsSummary').textContent = s.ports.length ? L.t(used > 1 ? 'ports.usedMany' : 'ports.used', { n: used, total: s.ports.length }) : '';

  if (!tiles.length) {
    $('#sockets').innerHTML = `<div class="empty"><b>${L.t('ports.none')}</b>${L.t('ports.noneHint')}</div>`;
    return;
  }
  $('#sockets').innerHTML = tiles.map(t => {
    const who = t.device ? L.deviceName(t.device) : L.t('ports.many', { n: t.many });
    return `<button class="socket on ${t.device && state.fresh.has(t.device.id) ? 'flash' : ''}" type="button"
        data-goto="${t.device ? esc(t.device.id) : 'bt'}">
      <span class="glyph">${glyph(t.type)}</span>
      <span><b>${esc(t.label)}</b><small>${esc(t.sub)}</small></span>
      <span class="who">${esc(who)}</span>
    </button>`;
  }).join('');
}

function renderDevices(s) {
  const list = s.devices.filter(matches).sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || L.deviceName(a).localeCompare(L.deviceName(b), L.locale));
  $('#devTitle').textContent = L.t('dev.title', { n: s.devices.length });
  if (!list.length) {
    $('#devices').innerHTML = state.q
      ? `<div class="empty"><b>${L.t('dev.noResult')}</b>${esc(L.t('dev.noResultHint', { q: state.q }))}</div>`
      : `<div class="empty"><b>${L.t('dev.empty')}</b>${L.t('dev.emptyHint')}</div>`;
    return;
  }
  $('#devices').innerHTML = list.map(row).join('');
}

function row(d) {
  const name = L.deviceName(d);
  const facts = [`<span class="chip port">${glyph(d.portType || 'video')}${esc(portName(d))}</span>`];
  if (d.speedMbps && d.category !== 'network') facts.push(`<span class="chip soft">${esc(L.rate(d.speedMbps))}</span>`);
  if (d.watts != null && d.category !== 'power') facts.push(`<span class="chip soft" title="${esc(L.t('dev.maxPower'))}">${L.num(d.watts)} W</span>`);
  if (d.battery != null) facts.push(`<span class="chip soft" title="${esc(L.t('dev.battery'))}">${icon('battery')}${d.battery} %</span>`);
  const sub = [d.vendor, L.category(d.category)].filter(Boolean).join(' · ');
  const rows = L.infoRows(d, state.snap.ports);
  return `
  <div class="dev ${state.fresh.has(d.id) ? 'is-new' : ''}" id="dev-${esc(d.id)}" data-id="${esc(d.id)}" aria-expanded="${state.open.has(d.id)}">
    <button class="dev-main" type="button" aria-label="${esc(L.t('dev.details', { name }))}">
      <span class="tile">${icon(d.category)}</span>
      <span class="name"><b>${esc(name)}</b><span>${esc(sub)}</span></span>
      <span class="facts">${facts.join('')}</span>
      ${icon('chevron', 'chev')}
    </button>
    <div class="details"><dl>
      ${rows.map(([k, v, mono]) => `<div><dt>${esc(k)}</dt><dd${mono ? ' class="mono"' : ''}>${esc(v)}</dd></div>`).join('')}
    </dl></div>
  </div>`;
}

function renderPower(p) {
  const t = L.t, num = L.num;
  $('#powerState').textContent = p.onAC ? (p.charging ? t('power.charging') : t('power.onAC')) : p.hasBattery ? t('power.onBattery') : '';
  if (state.editingCharger) return;   // ne pas écraser la saisie en cours

  const charge = p.charging && p.chargeW ? p.chargeW : 0;
  const pc = p.pcEstimateW || 0;
  const when = p.pcEstimateAt ? new Date(p.pcEstimateAt).toLocaleString(L.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  let head, bar = '', hint = '';

  if (!p.onAC) {
    // Sur batterie : Windows mesure la consommation réelle du PC
    head = `<div class="watts"><b>${p.drawW ? num(p.drawW) : '—'}</b><span>W</span></div>
      <p class="watts-cap">${p.drawW ? t('power.drawCap') : t('power.measuring')}</p>`;
  } else if (pc) {
    // Sur secteur : PC (estimé d'après les mesures sur batterie) + recharge, rapportés au chargeur
    const total = pc + charge, max = p.chargerW || total;
    const w = v => `${Math.min(100, (v / max) * 100).toFixed(1)}%`;
    head = `<div class="watts"><b>≈ ${num(total, 0)}</b><span>W</span>${p.chargerW ? `<em>${t('power.of', { w: num(p.chargerW, 0) })}</em>` : ''}</div>
      <p class="watts-cap">${t('power.estCap')}</p>`;
    bar = `<div class="split" role="img" aria-label="${esc(t('power.pc', { w: num(pc) }) + ', ' + t('power.recharge', { w: num(charge) }))}">
        <i class="pc" style="width:${w(pc)}"></i><i class="bat" style="width:${w(charge)}"></i></div>
      <div class="legend"><span><i class="pc"></i>${t('power.pc', { w: num(pc) })}</span><span><i class="bat"></i>${t('power.recharge', { w: num(charge) })}</span>
        ${p.chargerW ? `<span><i></i>${t('power.margin', { w: num(Math.max(0, p.chargerW - total), 0) })}</span>` : ''}</div>`;
  } else {
    head = `<div class="watts"><b>${charge ? num(charge) : '—'}</b><span>W</span></div>
      <p class="watts-cap">${charge ? t('power.chargeCap') : t('power.fullCap')}</p>`;
    hint = `<p class="hint">${t('power.hint')}</p>`;
  }

  const chargerRow = p.chargerW
    ? `${t('power.chargerMax', { w: num(p.chargerW, 0) })} <button class="link" type="button" data-edit-charger>${t('power.edit')}</button>`
    : `<button class="link accent" type="button" data-edit-charger>${t('power.set')}</button>`;
  const rows = [
    [t('power.charger'), p.onAC ? chargerRow : `${t('power.unplugged')}${p.chargerW ? ' · ' + t('power.chargerMax', { w: num(p.chargerW, 0) }) : ''}`],
    p.onAC && [t('power.rechargeRow'), charge ? `${num(charge)} W` : t('power.idle')],
    p.onAC && [t('power.pcRow'), pc ? `≈ ${num(pc)} W<small>${esc(t('power.measuredOn', { when }))}</small>` : t('power.notMeasured')],
    [t('power.usbRow'), `${num(p.usbW || 0)} W`],
  ].filter(Boolean);

  const pct = p.batteryPercent ?? 0;
  const runtime = p.remainingMinutes ? `${Math.floor(p.remainingMinutes / 60)} h ${String(p.remainingMinutes % 60).padStart(2, '0')}` : null;
  const batRows = [
    p.capacityWh && [t('power.energy'), `${num(p.remainingWh)} / ${num(p.capacityWh)} Wh`],
    p.voltage && [t('power.voltage'), `${num(p.voltage, 2)} V`],
    runtime && [t('power.runtime'), runtime],
  ].filter(Boolean);

  $('#power').innerHTML = `
    ${head}${bar}${hint}
    <dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${p.hasBattery ? `<div class="battery">
      <div class="battery-top"><span>${t('power.battery')}</span><b>${pct} %</b></div>
      <div class="meter ${pct < 20 ? 'low' : ''} ${p.charging ? 'charging' : ''}"><i style="width:${pct}%"></i></div>
      <dl class="kv">${batRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </div>` : ''}`;
}

function editCharger() {
  state.editingCharger = true;
  const cell = document.querySelector('[data-edit-charger]').closest('dd');
  cell.innerHTML = `<form class="inline-form" id="chargerForm">
    <input type="number" min="5" max="300" step="1" value="${state.snap.power.chargerW ?? ''}" placeholder="45" aria-label="${esc(L.t('power.chargerInput'))}" required> W
    <button class="link accent" type="submit">${L.t('power.save')}</button><button class="link" type="button" data-cancel-charger>${L.t('power.cancel')}</button></form>`;
  cell.querySelector('input').focus();
}
async function saveCharger(value) {
  state.snap.power.chargerW = await api.setCharger(value);
  state.editingCharger = false;
  renderPower(state.snap.power);
}

function renderHistory() {
  const el = $('#history');
  if (!state.history.length) { el.innerHTML = `<li class="none">${L.t('log.empty')}</li>`; return; }
  el.innerHTML = state.history.slice(0, 40).map(e => {
    // Les anciens événements (version 1.0) ont une prise déjà sous forme de texte
    const port = typeof e.port === 'string' ? e.port : L.portLabel(e.port) || L.connLabel(e.connection);
    return `<li class="${e.type}"><i class="dot"></i>
      <span><b>${esc(L.deviceName(e))}</b><span>${L.t('ev.' + e.type)}${port ? ' · ' + esc(port) : ''}</span></span>
      <time datetime="${e.time}">${time(e.time)}</time></li>`;
  }).join('');
}

// ------------------------------------------------------------------ notifications internes
function toast(title, body, category = 'usb') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="tile">${icon(category)}</span><div><b>${esc(title)}</b><span>${esc(body)}</span></div>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 4000);
}
// Quand la fenêtre est cachée, c'est l'application qui envoie une notification Windows

// ------------------------------------------------------------------ données (via le processus principal)
async function load() {
  try {
    const s = await api.getState();
    state.snap = s.snapshot; state.history = s.history; state.openAtLogin = s.openAtLogin; state.langPref = s.langPref;
    L = I18N.create(s.lang);
    $('#live').classList.add('on');
    syncLoginItem();
    applyLang();
    // Laisse la fenêtre s'ajuster à la hauteur réelle du contenu (premier lancement)
    requestAnimationFrame(() => api.reportContentHeight(Math.ceil(document.querySelector('.page').getBoundingClientRect().bottom)));
  } catch (e) {
    $('#devices').innerHTML = `<div class="empty"><b>${L.t('dev.error')}</b>${esc(e.message)}</div>`;
  }
}

async function refresh() {
  const btn = $('#refreshBtn');
  btn.classList.add('spin');
  try { await api.refresh(); } catch (e) { toast(L.t('dev.error'), e.message); }
  finally { btn.classList.remove('spin'); }
}

api.onSnapshot(({ snapshot, events }) => {
  state.snap = snapshot;
  if (events.length) {
    state.history = events.concat(state.history);
    events.forEach(e => { if (e.type === 'added') state.fresh.add(e.id); });
    if (!document.hidden) {
      for (const e of events.slice(0, 4)) {
        const port = L.portLabel(e.port) || L.connLabel(e.connection);
        toast(L.deviceName(e), `${L.t('ev.' + e.type)}${port ? ' · ' + port : ''}`, e.category);
      }
    }
    setTimeout(() => state.fresh.clear(), 3500);
    renderHistory();
  }
  render();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.dirty) render(); });

// ------------------------------------------------------------------ exports
const sorted = () => state.snap.devices.slice().sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || L.deviceName(a).localeCompare(L.deviceName(b), L.locale));
async function download(name, text) {
  const ext = name.split('.').pop();
  const saved = await api.saveFile(name, text, [{ name: L.t('export.filter.' + ext), extensions: [ext] }]);
  if (saved) toast(L.t('ev.exported'), saved.split('\\').pop(), 'storage');
}
function report() {
  const s = state.snap, p = s.power || {}, t = L.t, num = L.num;
  const lines = [t('export.report', { name: s.computer.name }), `${s.computer.maker} ${s.computer.model}`,
    t('export.generated', { date: new Date(s.generatedAt).toLocaleString(L.locale) }), '', t('export.ports')];
  const byId = new Map(s.devices.map(d => [d.id, d]));
  for (const port of s.ports) {
    const d = byId.get(port.deviceId);
    lines.push(`  • ${L.portLabel(port)} (${L.portStandard(port)}) : ${d ? L.deviceName(d) : t('export.free')}`);
  }
  lines.push('', t('export.devices'));
  for (const d of sorted()) {
    const extra = [portName(d), d.speedMbps && L.rate(d.speedMbps), d.watts != null && `${num(d.watts)} W`, d.battery != null && `${d.battery} %`].filter(Boolean);
    lines.push(`  • ${L.deviceName(d)} — ${extra.join(' — ')}`);
  }
  lines.push('', t('export.power'), `  • ${p.onAC ? t('power.onAC') : t('power.onBattery')}, ${t('export.batteryAt', { p: p.batteryPercent ?? '?' })}`);
  if (p.chargeW) lines.push(`  • ${t('export.recharge', { w: num(p.chargeW) })}`);
  if (p.drawW) lines.push(`  • ${t('export.draw', { w: num(p.drawW) })}`);
  lines.push(`  • ${t('export.usb', { w: num(p.usbW || 0) })}`);
  return lines.join('\r\n');
}
function exportAs(kind) {
  const s = state.snap, stamp = new Date(s.generatedAt).toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const base = `primaports-${s.computer.name}-${stamp}`;
  if (kind === 'json') return download(base + '.json', JSON.stringify(s, null, 2));
  if (kind === 'txt') return download(base + '.txt', report());
  if (kind === 'copy') return navigator.clipboard.writeText(report()).then(() => toast(L.t('ev.copied'), L.t('ev.clipboard')));
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [L.t('export.cols').map(q).join(';'),
    ...sorted().map(d => [L.deviceName(d), L.category(d.category), d.vendor, portName(d), d.speedMbps ? L.rate(d.speedMbps) : '',
      d.watts != null ? L.num(d.watts) : '', d.battery ?? '', d.id].map(q).join(';'))].join('\r\n');
  download(base + '.csv', '﻿' + csv);
}

// ------------------------------------------------------------------ interactions
function closeMenu() { $('#moreMenu').hidden = true; $('#moreBtn').setAttribute('aria-expanded', 'false'); }
function openDevice(id) {
  const el = document.getElementById('dev-' + id);
  if (!el) return;
  state.open.add(id); el.setAttribute('aria-expanded', 'true');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function syncLoginItem() {
  document.querySelector('[data-login-item]').setAttribute('aria-checked', String(!!state.openAtLogin));
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-goto]');
  if (go) {
    const id = go.dataset.goto === 'bt' ? state.snap.devices.find(d => d.portType === 'bluetooth')?.id : go.dataset.goto;
    if (id) openDevice(id);
    return;
  }
  const dm = e.target.closest('.dev-main');
  if (dm) {
    const r = dm.parentElement, id = r.dataset.id;
    state.open.has(id) ? state.open.delete(id) : state.open.add(id);
    r.setAttribute('aria-expanded', state.open.has(id));
    return;
  }
  if (e.target.closest('[data-edit-charger]')) { editCharger(); return; }
  if (e.target.closest('[data-cancel-charger]')) { state.editingCharger = false; renderPower(state.snap.power); return; }
  if (e.target.closest('[data-login-item]')) {
    api.setOpenAtLogin(!state.openAtLogin).then(on => { state.openAtLogin = on; syncLoginItem(); });
    return;
  }
  if (e.target.closest('#langBtn')) {
    // Bascule FR ⇄ EN ; le choix est mémorisé (sinon la langue suit celle de Windows)
    api.setLang(L.lang === 'fr' ? 'en' : 'fr').then(r => { state.langPref = r.pref; L = I18N.create(r.lang); applyLang(); });
    return;
  }
  const ex = e.target.closest('[data-export]');
  if (ex) { exportAs(ex.dataset.export); closeMenu(); return; }
  if (e.target.closest('#moreBtn')) {
    const pop = $('#moreMenu'); pop.hidden = !pop.hidden; $('#moreBtn').setAttribute('aria-expanded', !pop.hidden); return;
  }
  if (!e.target.closest('.menu')) closeMenu();
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'chargerForm') return;
  e.preventDefault();
  const input = e.target.querySelector('input');
  saveCharger(Number(input.value)).catch(() => { input.setCustomValidity(L.t('power.range')); input.reportValidity(); input.setCustomValidity(''); });
});
$('#q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); if (state.snap) renderDevices(state.snap); });
$('#refreshBtn').addEventListener('click', refresh);
$('#clearHistory').addEventListener('click', () => api.clearHistory().then(h => { state.history = h; renderHistory(); }));
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); $('#q').select(); }
  if (e.key === 'F5') { e.preventDefault(); refresh(); }
  if (e.key === 'Escape') { closeMenu(); if (document.activeElement === $('#q')) { $('#q').value = ''; state.q = ''; renderDevices(state.snap); } }
});

// ------------------------------------------------------------------ thème
let theme = null; try { theme = localStorage.getItem('primaports.theme'); } catch {}
function applyTheme() {
  if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const btn = $('#themeBtn');
  btn.innerHTML = icon(dark ? 'sun' : 'moon');
  btn.title = L.t(dark ? 'bar.themeLight' : 'bar.themeDark');
  btn.setAttribute('aria-label', btn.title);
  api.setTheme(dark);   // accorde la barre de titre Windows au thème
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!theme) applyTheme(); });
$('#themeBtn').addEventListener('click', () => {
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('primaports.theme', theme); } catch {}
  applyTheme();
});

applyLang();
load();
