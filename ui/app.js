'use strict';

// ------------------------------------------------------------------ icônes
// Catégories d'appareils (24×24)
const ICONS = {
  storage: '<path d="M8 3h8v6H8z"/><path d="M6 9h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M10 5.5h1M13 5.5h1"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3"/>',
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
  vga: '<path d="M4 6h26l-3 10H7z"/><path d="M11 10h.01M15 10h.01M19 10h.01M23 10h.01"/>',
  video: '<rect x="5" y="4" width="24" height="14" rx="2"/>',
  wireless: '<path d="M9 9a12 12 0 0 1 16 0M12 12.5a7 7 0 0 1 10 0"/><circle cx="17" cy="16" r=".8"/>',
  jack: '<circle cx="17" cy="11" r="6.5"/><circle cx="17" cy="11" r="2.2"/>',
  ethernet: '<rect x="8" y="3" width="18" height="15" rx="2"/><path d="M13 18v2h8v-2M12.5 7v3M15.5 7v3M18.5 7v3M21.5 7v3"/>',
  power: '<path d="M14 2v5M20 2v5M10.5 7h13v4a6.5 6.5 0 0 1-13 0z"/><path d="M17 17.5V21"/>',
  bluetooth: '<path d="m12 6.5 10 9-5 4.5V2l5 4.5-10 9"/>',
};
const icon = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICONS[n] || ICONS.usb}</svg>`;
const glyph = t => `<svg viewBox="0 0 34 22" aria-hidden="true">${GLYPHS[t] || GLYPHS.video}</svg>`;

const CAT = {
  storage: 'Stockage', display: 'Écran', keyboard: 'Clavier', mouse: 'Souris', audio: 'Audio', camera: 'Caméra',
  phone: 'Téléphone', network: 'Réseau', printer: 'Imprimante', power: 'Alimentation', usb: 'Périphérique',
};
const ORDER = Object.keys(CAT);

// ------------------------------------------------------------------ état
const $ = s => document.querySelector(s);
const state = { snap: null, history: [], q: '', open: new Set(), fresh: new Set() };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 1) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d });
const time = iso => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function matches(d) {
  if (!state.q) return true;
  const hay = [d.name, d.vendor, d.port, d.connection, CAT[d.category], ...Object.values(d.details || {})].join(' ').toLowerCase();
  return state.q.split(/\s+/).every(w => hay.includes(w));
}

// ------------------------------------------------------------------ rendu
function render() {
  const s = state.snap;
  if (!s) return;
  const c = s.computer;
  $('#machine').textContent = `${c.name} · ${c.model || ''}`;
  renderSockets(s);
  renderDevices(s);
  renderPower(s.power || {});
}

// Prises : les connecteurs USB du PC, plus les liaisons actives non USB (vidéo, jack, Ethernet, secteur).
function renderSockets(s) {
  const byId = new Map(s.devices.map(d => [d.id, d]));
  const tiles = s.ports.map(p => ({
    type: p.type, label: p.label, sub: p.standard,
    device: p.deviceId && byId.get(p.deviceId) ? byId.get(p.deviceId) : null,
  }));
  for (const d of s.devices) {
    if (!d.portType || /^usb-/.test(d.portType) || d.portType === 'bluetooth') continue;
    const sub = { power: d.watts ? `${num(d.watts)} W vers la batterie` : 'Secteur', jack: 'Audio analogique', ethernet: d.speed || 'Réseau filaire' }[d.portType] || 'Sortie vidéo';
    tiles.push({ type: d.portType, label: d.port, sub, device: d });
  }
  const bt = s.devices.filter(d => d.portType === 'bluetooth');
  if (bt.length) tiles.push({ type: 'bluetooth', label: 'Bluetooth', sub: 'Sans fil', device: bt.length === 1 ? bt[0] : null, many: bt.length });

  const usedUsb = s.ports.filter(p => p.deviceId && byId.has(p.deviceId)).length;
  $('#portsSummary').textContent = s.ports.length ? `${usedUsb} prise${usedUsb > 1 ? 's' : ''} USB utilisée${usedUsb > 1 ? 's' : ''} sur ${s.ports.length}` : '';

  // Seules les prises occupées sont affichées
  const used = tiles.filter(t => t.device || t.many);
  if (!used.length) {
    $('#sockets').innerHTML = '<div class="empty"><b>Aucune prise utilisée</b>Branchez un appareil : sa prise apparaîtra ici.</div>';
    return;
  }
  $('#sockets').innerHTML = used.map(t => {
    const on = t.device || t.many;
    const who = t.many && !t.device ? `${t.many} appareils` : t.device ? t.device.name : 'Libre';
    return `<button class="socket ${on ? 'on' : ''} ${t.device && state.fresh.has(t.device.id) ? 'flash' : ''}" type="button"
        ${t.device ? `data-goto="${esc(t.device.id)}"` : t.many ? 'data-goto="bt"' : 'disabled'}>
      <span class="glyph">${glyph(t.type)}</span>
      <span><b>${esc(t.label)}</b><small>${esc(t.sub)}</small></span>
      <span class="who">${esc(who)}</span>
    </button>`;
  }).join('');
}

function renderDevices(s) {
  const list = s.devices.filter(matches).sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.name.localeCompare(b.name, 'fr'));
  $('#devTitle').textContent = `Appareils connectés · ${s.devices.length}`;
  if (!list.length) {
    $('#devices').innerHTML = `<div class="empty"><b>${state.q ? 'Aucun résultat' : 'Rien de branché'}</b>${state.q ? `Rien ne correspond à « ${esc(state.q)} ».` : 'Branchez un appareil : il apparaîtra ici.'}</div>`;
    return;
  }
  $('#devices').innerHTML = list.map(row).join('');
}

function row(d) {
  const facts = [];
  facts.push(`<span class="chip port">${glyph(d.portType || 'video')}${esc(d.port || d.connection)}</span>`);
  if (d.speed) facts.push(`<span class="chip soft">${esc(d.speed.replace(/^USB [\d.]+ · /, ''))}</span>`);
  if (d.watts != null && d.category !== 'power') facts.push(`<span class="chip soft" title="Puissance maximale déclarée">${num(d.watts)} W</span>`);
  if (d.battery != null) facts.push(`<span class="chip soft" title="Batterie de l'appareil">${icon('battery')}${d.battery} %</span>`);
  const sub = [d.vendor, CAT[d.category]].filter(Boolean).join(' · ');
  return `
  <div class="dev ${state.fresh.has(d.id) ? 'is-new' : ''}" id="dev-${esc(d.id)}" data-id="${esc(d.id)}" aria-expanded="${state.open.has(d.id)}">
    <button class="dev-main" type="button" aria-label="Détails de ${esc(d.name)}">
      <span class="tile">${icon(d.category)}</span>
      <span class="name"><b>${esc(d.name)}</b><span>${esc(sub)}</span></span>
      <span class="facts">${facts.join('')}</span>
      ${icon('chevron', 'chev')}
    </button>
    <div class="details"><dl>
      ${Object.entries(d.details || {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      <div><dt>Identifiant Windows</dt><dd class="mono">${esc(d.id)}</dd></div>
    </dl></div>
  </div>`;
}

function renderPower(p) {
  const st = p.onAC ? (p.charging ? 'Sur secteur · en charge' : 'Sur secteur') : p.hasBattery ? 'Sur batterie' : '';
  $('#powerState').textContent = st;

  if (state.editingCharger) return;   // ne pas écraser la saisie en cours

  const charge = p.charging && p.chargeW ? p.chargeW : 0;
  const pc = p.pcEstimateW || 0;
  const when = p.pcEstimateAt ? new Date(p.pcEstimateAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  let head = '', bar = '', hint = '';

  if (!p.onAC) {
    // Sur batterie : Windows mesure la consommation réelle du PC
    head = `<div class="watts"><b>${p.drawW ? num(p.drawW) : '—'}</b><span>W</span></div>
      <p class="watts-cap">${p.drawW ? 'consommés par le PC en ce moment (mesure réelle)' : 'Mesure en cours…'}</p>`;
  } else if (pc) {
    // Sur secteur : PC (estimé d'après les mesures sur batterie) + recharge, rapportés au chargeur
    const total = pc + charge, max = p.chargerW || total;
    const w = v => `${Math.min(100, (v / max) * 100).toFixed(1)}%`;
    head = `<div class="watts"><b>≈ ${num(total, 0)}</b><span>W</span>${p.chargerW ? `<em>sur ${num(p.chargerW, 0)} W</em>` : ''}</div>
      <p class="watts-cap">tirés du chargeur en ce moment (estimation)</p>`;
    bar = `<div class="split" role="img" aria-label="PC ${num(pc)} W, recharge ${num(charge)} W">
        <i class="pc" style="width:${w(pc)}"></i><i class="bat" style="width:${w(charge)}"></i></div>
      <div class="legend"><span><i class="pc"></i>PC ≈ ${num(pc)} W</span><span><i class="bat"></i>Recharge ${num(charge)} W</span>
        ${p.chargerW ? `<span><i></i>Marge ${num(Math.max(0, p.chargerW - total), 0)} W</span>` : ''}</div>`;
  } else {
    head = `<div class="watts"><b>${charge ? num(charge) : '—'}</b><span>W</span></div>
      <p class="watts-cap">${charge ? 'entrent dans la batterie (recharge seule)' : 'Batterie pleine : la recharge est au repos.'}</p>`;
    hint = `<p class="hint">Pour connaître la consommation du PC, débranchez le chargeur une dizaine de secondes : PrimaPorts la mesure et s'en sert ensuite comme estimation sur secteur.</p>`;
  }

  const chargerRow = p.chargerW
    ? `${num(p.chargerW, 0)} W max <button class="link" type="button" data-edit-charger>Modifier</button>`
    : `<button class="link accent" type="button" data-edit-charger>Indiquer sa puissance</button>`;
  const rows = [
    ['Chargeur', p.onAC ? chargerRow : `Débranché${p.chargerW ? ` · ${num(p.chargerW, 0)} W max` : ''}`],
    p.onAC && ['Recharge batterie', charge ? `${num(charge)} W` : 'Au repos'],
    p.onAC && ['PC (estimé)', pc ? `≈ ${num(pc)} W<small>mesuré sur batterie, ${esc(when)}</small>` : 'Pas encore mesuré'],
    ['Appareils USB (max déclaré)', `${num(p.usbW || 0)} W`],
  ].filter(Boolean);

  const pct = p.batteryPercent ?? 0;
  const batRows = [
    p.capacityWh && ['Énergie stockée', `${num(p.remainingWh)} / ${num(p.capacityWh)} Wh`],
    p.voltage && ['Tension', `${num(p.voltage, 2)} V`],
    typeof p.remainingTime === 'string' && ['Autonomie estimée', p.remainingTime],
  ].filter(Boolean);

  $('#power').innerHTML = `
    ${head}${bar}${hint}
    <dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${p.hasBattery ? `<div class="battery">
      <div class="battery-top"><span>Batterie</span><b>${pct} %</b></div>
      <div class="meter ${pct < 20 ? 'low' : ''} ${p.charging ? 'charging' : ''}"><i style="width:${pct}%"></i></div>
      <dl class="kv">${batRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </div>` : ''}`;
}

function editCharger() {
  state.editingCharger = true;
  const row = document.querySelector('[data-edit-charger]').closest('dd');
  row.innerHTML = `<form class="inline-form" id="chargerForm">
    <input type="number" min="5" max="300" step="1" value="${state.snap.power.chargerW ?? ''}" placeholder="45" aria-label="Puissance du chargeur en watts" required> W
    <button class="link accent" type="submit">OK</button><button class="link" type="button" data-cancel-charger>Annuler</button></form>`;
  row.querySelector('input').focus();
}
async function saveCharger(value) {
  state.snap.power.chargerW = await api.setCharger(value);
  state.editingCharger = false;
  renderPower(state.snap.power);
}

const EV = { added: 'Branché', removed: 'Débranché' };
function renderHistory() {
  const el = $('#history');
  if (!state.history.length) { el.innerHTML = '<li class="none">Branchez ou débranchez un appareil : il apparaîtra ici.</li>'; return; }
  el.innerHTML = state.history.slice(0, 40).map(e => `
    <li class="${e.type}"><i class="dot"></i>
      <span><b>${esc(e.name)}</b><span>${EV[e.type] || e.type} · ${esc(e.port || e.connection || '')}</span></span>
      <time datetime="${e.time}">${time(e.time)}</time></li>`).join('');
}

// ------------------------------------------------------------------ notifications
function toast(e) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="tile">${icon(e.category)}</span><div><b>${esc(e.name)}</b><span>${EV[e.type] || e.type}${e.port || e.connection ? ' · ' + esc(e.port || e.connection) : ''}</span></div>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 4000);
  // Quand la fenêtre est cachée, c'est l'application qui envoie une notification Windows
}

// ------------------------------------------------------------------ données (via le processus principal)
const api = window.primaports;

async function load() {
  try {
    const s = await api.getState();
    state.snap = s.snapshot; state.history = s.history; state.openAtLogin = s.openAtLogin;
    $('#live').classList.add('on');
    syncLoginItem();
    render(); renderHistory();
    // Laisse la fenêtre s'ajuster à la hauteur réelle du contenu (premier lancement)
    requestAnimationFrame(() => api.reportContentHeight(Math.ceil(document.querySelector('.page').getBoundingClientRect().bottom)));
  } catch (e) {
    $('#devices').innerHTML = `<div class="empty"><b>Analyse impossible</b>${esc(e.message)}</div>`;
  }
}

async function refresh() {
  const btn = $('#refreshBtn');
  btn.classList.add('spin');
  try { await api.refresh(); } catch (e) { toast({ type: 'Analyse impossible', name: e.message, category: 'usb' }); }
  finally { btn.classList.remove('spin'); }
}

function connectLive() {
  api.onSnapshot(({ snapshot, events }) => {
    state.snap = snapshot;
    if (events.length) {
      state.history = events.concat(state.history);
      events.forEach(e => { if (e.type === 'added') state.fresh.add(e.id); });
      events.slice(0, 4).forEach(toast);
      setTimeout(() => state.fresh.clear(), 3500);
      renderHistory();
    }
    render();
  });
}

// ------------------------------------------------------------------ exports
const sorted = () => state.snap.devices.slice().sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.name.localeCompare(b.name, 'fr'));
const FILTERS = { csv: 'Tableur CSV', json: 'Données JSON', txt: 'Texte' };
async function download(name, text) {
  const ext = name.split('.').pop();
  const saved = await api.saveFile(name, text, [{ name: FILTERS[ext] || ext, extensions: [ext] }]);
  if (saved) toast({ type: 'Exporté', name: saved.split('\\').pop(), category: 'storage' });
}
function report() {
  const s = state.snap, p = s.power || {};
  const lines = [`PrimaPorts — ${s.computer.name}`, `${s.computer.maker} ${s.computer.model}`, `Généré le ${new Date(s.generatedAt).toLocaleString('fr-FR')}`, '', 'PRISES'];
  for (const port of s.ports) lines.push(`  • ${port.label} (${port.standard}) : ${port.deviceName || 'libre'}`);
  lines.push('', 'APPAREILS CONNECTÉS');
  for (const d of sorted()) {
    lines.push(`  • ${d.name} — ${d.port || d.connection}${d.speed ? ' — ' + d.speed : ''}${d.watts != null ? ' — ' + num(d.watts) + ' W' : ''}${d.battery != null ? ' — batterie ' + d.battery + ' %' : ''}`);
  }
  lines.push('', 'ALIMENTATION', `  • ${p.onAC ? 'Sur secteur' : 'Sur batterie'}, batterie ${p.batteryPercent ?? '?'} %`);
  if (p.chargeW) lines.push(`  • Recharge : ${num(p.chargeW)} W`);
  if (p.drawW) lines.push(`  • Consommation : ${num(p.drawW)} W`);
  lines.push(`  • Appareils USB (max déclaré) : ${num(p.usbW || 0)} W`);
  return lines.join('\r\n');
}
function exportAs(kind) {
  const s = state.snap, stamp = new Date(s.generatedAt).toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const base = `primaports-${s.computer.name}-${stamp}`;
  if (kind === 'json') return download(base + '.json', JSON.stringify(s, null, 2));
  if (kind === 'txt') return download(base + '.txt', report());
  if (kind === 'copy') return navigator.clipboard.writeText(report()).then(() => toast({ type: 'Rapport copié', name: 'Presse-papiers', category: 'usb' }));
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [['Appareil', 'Type', 'Marque', 'Prise', 'Vitesse', 'Puissance (W)', 'Batterie (%)', 'Identifiant'].map(q).join(';'),
    ...sorted().map(d => [d.name, CAT[d.category], d.vendor, d.port || d.connection, d.speed, d.watts != null ? num(d.watts) : '', d.battery ?? '', d.id].map(q).join(';'))].join('\r\n');
  download(base + '.csv', '﻿' + csv);
}

// ------------------------------------------------------------------ interactions
function closeMenu() { $('#exportMenu').hidden = true; $('#exportBtn').setAttribute('aria-expanded', 'false'); }
function openDevice(id) {
  const el = document.getElementById('dev-' + id);
  if (!el) return;
  state.open.add(id); el.setAttribute('aria-expanded', 'true');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const ex = e.target.closest('[data-export]');
  if (ex) { exportAs(ex.dataset.export); closeMenu(); return; }
  if (e.target.closest('#exportBtn')) {
    const pop = $('#exportMenu'); pop.hidden = !pop.hidden; $('#exportBtn').setAttribute('aria-expanded', !pop.hidden); return;
  }
  if (!e.target.closest('.menu')) closeMenu();
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'chargerForm') return;
  e.preventDefault();
  const input = e.target.querySelector('input');
  saveCharger(Number(input.value)).catch(err => { input.setCustomValidity(err.message); input.reportValidity(); input.setCustomValidity(''); });
});
$('#q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); if (state.snap) renderDevices(state.snap); });
$('#refreshBtn').addEventListener('click', refresh);
$('#clearHistory').addEventListener('click', () => api.clearHistory().then(h => { state.history = h; renderHistory(); }));
function syncLoginItem() {
  const b = document.querySelector('[data-login-item]');
  if (b) b.setAttribute('aria-checked', String(!!state.openAtLogin));
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); $('#q').select(); }
  if (e.key === 'F5') { e.preventDefault(); refresh(); }
  if (e.key === 'Escape') { closeMenu(); if (document.activeElement === $('#q')) { $('#q').value = ''; state.q = ''; renderDevices(state.snap); } }
});

// thème
let theme = null; try { theme = localStorage.getItem('primaports.theme'); } catch {}
function applyTheme() {
  if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#themeBtn').innerHTML = icon(dark ? 'sun' : 'moon');
  $('#themeBtn').title = dark ? 'Thème clair' : 'Thème sombre';
  api.setTheme(dark);   // accorde la barre de titre Windows au thème
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!theme) applyTheme(); });
$('#themeBtn').addEventListener('click', () => {
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('primaports.theme', theme); } catch {}
  applyTheme();
});
applyTheme();

load();
connectLive();
