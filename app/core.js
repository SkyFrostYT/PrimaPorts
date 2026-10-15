// PrimaPorts — moteur : collecte PowerShell, surveillance temps réel, journal et réglages.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

const PS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File'];
const WEEK = 7 * 24 * 3600e3;

// Port actif = appareil réellement connecté et externe au PC. Le collecteur ne remonte déjà que ceux-là ;
// ce filtre reste comme garde-fou.
const isActive = d => d.status !== 'paired' && !(d.tags || []).some(t => t === 'internal' || t === 'virtual');

class Core extends EventEmitter {
  constructor({ collectorDir, dataDir }) {
    super();
    this.collectorDir = collectorDir;
    this.dataDir = dataDir;
    this.historyFile = path.join(dataDir, 'history.json');
    this.settingsFile = path.join(dataDir, 'settings.json');
    fs.mkdirSync(dataDir, { recursive: true });

    this.snapshot = null;
    // Journal des versions 1.0 (textes en français) : le chargeur passe au format traduisible
    this.history = this.#read(this.historyFile, []).map(e => e.id === 'POWER:AC' && !e.nameKey
      ? { ...e, nameKey: 'charger', connection: 'ac', port: { type: 'power' } } : e);
    this.settings = { chargerW: null, draws: [], lang: 'auto', ...this.#read(this.settingsFile, {}) };
    this.inflight = null;
    this.again = false;
    this.stopped = false;
    this.pending = [];
    this.buf = '';
  }

  #read(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
  }
  #saveHistory() { fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 1), () => {}); }
  #saveSettings() { fs.writeFile(this.settingsFile, JSON.stringify(this.settings, null, 1), () => {}); }

  start() {
    this.#startWorker();
    this.#startWatcher();
    this.refresh().catch(e => this.emit('error', e));
  }

  stop() {
    this.stopped = true;
    for (const p of [this.worker, this.watcher]) { try { p.kill(); } catch { /* déjà arrêté */ } }
  }

  // ---------------------------------------------------------------- processus PowerShell
  #spawn(script) {
    return spawn('powershell.exe', [...PS, path.join(this.collectorDir, script)], { windowsHide: true });
  }

  #startWorker() {
    const w = this.worker = this.#spawn('worker.ps1');
    w.stdout.setEncoding('utf8');
    w.stdout.on('data', chunk => {
      this.buf += chunk;
      let i;
      while ((i = this.buf.indexOf('<<<END>>>')) !== -1) {
        const raw = this.buf.slice(0, i).trim().replace(/^﻿/, '');
        this.buf = this.buf.slice(i + 9).replace(/^\r?\n/, '');
        const p = this.pending.shift();
        if (!p) continue;
        try { p.resolve(JSON.parse(raw)); } catch (e) { p.reject(new Error('Réponse illisible du collecteur : ' + e.message)); }
      }
    });
    w.on('exit', () => {
      this.pending.splice(0).forEach(p => p.reject(new Error('Collecteur arrêté')));
      this.buf = '';
      if (!this.stopped) setTimeout(() => this.#startWorker(), 1000);
    });
  }

  #startWatcher() {
    const w = this.watcher = this.#spawn('watcher.ps1');
    w.stdout.setEncoding('utf8');
    w.stdout.on('data', d => {
      if (!d.includes('change')) return;
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.refresh().catch(() => {}), 1200);
      // Après un changement d'alimentation, Windows met quelques secondes à mesurer la puissance
      if (d.includes('power')) setTimeout(() => this.refresh().catch(() => {}), 8000);
    });
    w.on('exit', () => { if (!this.stopped) setTimeout(() => this.#startWatcher(), 2000); });
  }

  #collect() {
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.worker.stdin.write('collect\n');
    });
  }

  // ---------------------------------------------------------------- instantanés
  refresh() {
    if (this.inflight) { this.again = true; return this.inflight; }
    this.inflight = this.#collect().then(next => {
      if (next.error) throw new Error(next.error);
      next.devices = (next.devices || []).filter(isActive);
      next.ports = next.ports || [];
      next.power = this.#enrichPower(next.power || {});
      const events = this.snapshot ? this.#diff(this.snapshot, next) : [];
      this.snapshot = next;
      if (events.length) {
        this.history = events.concat(this.history).slice(0, 500);
        this.#saveHistory();
      }
      this.emit('snapshot', { snapshot: next, events });
      return next;
    }).finally(() => {
      this.inflight = null;
      if (this.again) { this.again = false; this.refresh().catch(() => {}); }
    });
    return this.inflight;
  }

  #diff(prev, next) {
    const before = new Map(prev.devices.map(d => [d.id, d]));
    const after = new Map(next.devices.map(d => [d.id, d]));
    // L'événement garde de quoi afficher la prise dans n'importe quelle langue, même après débranchement
    const ports = new Map([...prev.ports, ...next.ports].map(p => [p.id, p]));
    const ev = (type, d) => {
      const p = ports.get(d.portRef);
      return {
        time: next.generatedAt, type, id: d.id, name: d.name, nameKey: d.nameKey, category: d.category, connection: d.connection,
        port: p ? { type: p.type, usb3: p.usb3, n: p.n } : d.portType ? { type: d.portType } : null,
      };
    };
    return [
      ...[...after].filter(([id]) => !before.has(id)).map(([, d]) => ev('added', d)),
      ...[...before].filter(([id]) => !after.has(id)).map(([, d]) => ev('removed', d)),
    ];
  }

  // ---------------------------------------------------------------- alimentation
  // Windows ne donne ni la puissance du chargeur (saisie par l'utilisateur) ni la consommation du PC sur
  // secteur : on retient les consommations mesurées sur batterie pour l'estimer.
  #enrichPower(p, record = true) {
    if (record && !p.onAC && p.drawW > 0) {
      this.settings.draws = [...this.settings.draws, { w: p.drawW, at: Date.now() }].slice(-20);
      this.#saveSettings();
    }
    const recent = this.settings.draws.filter(d => Date.now() - d.at < WEEK).map(d => d.w).sort((a, b) => a - b);
    p.chargerW = this.settings.chargerW;
    if (recent.length) {
      p.pcEstimateW = Math.round(recent[Math.floor(recent.length / 2)] * 10) / 10;   // médiane
      p.pcEstimateAt = new Date(this.settings.draws[this.settings.draws.length - 1].at).toISOString();
    }
    return p;
  }

  setChargerW(w) {
    if (w !== null && !(Number.isFinite(w) && w >= 5 && w <= 300)) throw new Error('charger-range');
    this.settings.chargerW = w;
    this.#saveSettings();
    if (this.snapshot) {
      this.snapshot.power = this.#enrichPower(this.snapshot.power, false);
      this.emit('snapshot', { snapshot: this.snapshot, events: [] });
    }
    return w;
  }

  setLang(lang) {
    if (!['auto', 'fr', 'en'].includes(lang)) throw new Error('Unsupported language: ' + lang);
    this.settings.lang = lang;
    this.#saveSettings();
    return lang;
  }

  clearHistory() {
    this.history = [];
    this.#saveHistory();
    return [];
  }
}

module.exports = { Core };
