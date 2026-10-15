// PrimaPorts — application de bureau (processus principal Electron).
'use strict';
const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, nativeImage, shell, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { Core } = require('./core');
const I18N = require('../ui/i18n.js');

const ROOT = path.join(__dirname, '..');
const START_HIDDEN = process.argv.includes('--hidden');
const BAR_HEIGHT = 60;
const THEMES = {
  light: { bg: '#f5f5f2', ink: '#16181d' },
  dark: { bg: '#0f1114', ink: '#ecebe7' },
};

// Version publiée : refuse les options de débogage à distance (inspection du code et de la page)
if (app.isPackaged && ['remote-debugging-port', 'remote-debugging-pipe', 'inspect', 'inspect-brk'].some(s => app.commandLine.hasSwitch(s))) {
  app.exit(1);
  return;
}
if (!app.requestSingleInstanceLock()) { app.quit(); return; }
app.setAppUserModelId('fr.primatoria.primaports');
Menu.setApplicationMenu(null);

let win, tray, core, quitting = false, toldAboutTray = false, theme = 'light';
let L = I18N.create('fr');   // textes de la langue courante (menu de l'icône, notifications)
const applyLang = () => { L = I18N.create(I18N.resolve(core.settings.lang, app.getLocale())); };

const collectorDir = () => app.isPackaged ? path.join(process.resourcesPath, 'collector') : path.join(ROOT, 'collector');
const asset = name => path.join(__dirname, 'assets', name);

// ------------------------------------------------------------------ taille, position et zoom de la fenêtre
// Premier lancement : taille et zoom calculés d'après l'écran, puis hauteur ajustée au contenu.
// Ensuite : on rouvre comme l'utilisateur l'a laissée (taille, position, plein écran, zoom).
const windowFile = () => path.join(app.getPath('userData'), 'window.json');
let layout = null;          // réglages mémorisés, null tant que rien n'a été enregistré
let zoom = 1;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const barHeight = () => Math.round(BAR_HEIGHT * zoom) - 1;

function loadLayout() {
  try {
    const l = JSON.parse(fs.readFileSync(windowFile(), 'utf8'));
    // Ignore une position tombée hors des écrans actuels (écran externe débranché…)
    const visible = screen.getAllDisplays().some(({ workArea: a }) =>
      l.x < a.x + a.width - 80 && l.x + l.width > a.x + 80 && l.y >= a.y - 10 && l.y < a.y + a.height - 80);
    return visible ? l : { ...l, x: undefined, y: undefined };
  } catch { return null; }
}

function initialBounds() {
  const wa = screen.getPrimaryDisplay().workArea;
  // Petits écrans (portables à 125-150 %) : interface un peu plus dense pour tout voir sans défiler
  zoom = layout?.zoom ?? clamp(Math.round((wa.height / 900) * 20) / 20, 0.8, 1);
  if (layout) return { x: layout.x, y: layout.y, width: layout.width, height: layout.height };
  const width = Math.min(Math.round(1240 * zoom + 40), wa.width - 64);
  const height = Math.min(Math.round(wa.height * 0.92), 900);
  return { x: wa.x + Math.round((wa.width - width) / 2), y: wa.y + Math.round((wa.height - height) / 2), width, height };
}

let saveTimer;
function saveLayout() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  layout = { ...b, maximized: win.isMaximized(), zoom };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(windowFile(), JSON.stringify(layout), () => {}), 400);
}

function setZoom(z) {
  zoom = clamp(Math.round(z * 20) / 20, 0.7, 1.5);
  win.webContents.setZoomFactor(zoom);
  win.setTitleBarOverlay({ color: THEMES[theme].bg, symbolColor: THEMES[theme].ink, height: barHeight() });
  saveLayout();
}

// Hauteur du contenu mesurée par l'interface (pixels CSS) : au premier lancement, la fenêtre s'y ajuste
function fitToContent(cssHeight) {
  if (layout || win.isMaximized()) return;
  const wa = screen.getDisplayMatching(win.getBounds()).workArea;
  const [w] = win.getContentSize();
  const h = clamp(Math.ceil(cssHeight * zoom), 480, wa.height - 24);
  win.setContentSize(w, h);
  const b = win.getBounds();
  win.setPosition(b.x, clamp(wa.y + Math.round((wa.height - b.height) / 2), wa.y, wa.y + wa.height - b.height));
  saveLayout();
}

// ------------------------------------------------------------------ fenêtre
function createWindow() {
  layout = loadLayout();
  const bounds = initialBounds();
  win = new BrowserWindow({
    ...bounds, minWidth: 420, minHeight: 480,
    title: 'PrimaPorts',
    icon: asset('icon.png'),
    show: false,
    backgroundColor: THEMES[theme].bg,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: THEMES[theme].bg, symbolColor: THEMES[theme].ink, height: barHeight() },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: false, zoomFactor: zoom },
  });
  if (layout?.maximized) win.maximize();
  win.loadFile(path.join(ROOT, 'ui', 'index.html'));
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(zoom));
  win.once('ready-to-show', () => { if (!START_HIDDEN) win.show(); });
  for (const ev of ['resized', 'moved', 'maximize', 'unmaximize']) win.on(ev, saveLayout);

  // Ctrl + / Ctrl - / Ctrl 0 : zoom de l'interface, mémorisé
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !input.control) return;
    if (input.key === '+' || input.key === '=') { setZoom(zoom + 0.05); e.preventDefault(); }
    else if (input.key === '-') { setZoom(zoom - 0.05); e.preventDefault(); }
    else if (input.key === '0') { setZoom(1); e.preventDefault(); }
  });

  // Fermer = réduire dans la zone de notification ; « Quitter » est dans le menu de l'icône
  win.on('close', e => {
    saveLayout();
    if (quitting) return;
    e.preventDefault();
    win.hide();
    if (!toldAboutTray) {
      toldAboutTray = true;
      notify(L.t('notif.stillRunning'), L.t('notif.stillRunningBody'));
    }
  });
  // Liens externes éventuels : navigateur par défaut, jamais dans l'application
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ------------------------------------------------------------------ zone de notification
function createTray() {
  tray = new Tray(nativeImage.createFromPath(asset('tray.png')));
  tray.setToolTip('PrimaPorts');
  tray.on('click', () => (win.isVisible() && win.isFocused() ? win.hide() : showWindow()));
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const n = core?.snapshot?.devices.length;
  if (n != null) tray.setToolTip(L.t(n > 1 ? 'tray.tooltipMany' : 'tray.tooltip', { n }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: L.t('tray.open'), click: showWindow },
    { label: L.t('tray.refresh'), click: () => core.refresh().catch(() => {}) },
    { type: 'separator' },
    { label: L.t('tray.login'), type: 'checkbox', checked: openAtLogin(), click: m => setOpenAtLogin(m.checked) },
    { type: 'separator' },
    { label: L.t('tray.quit'), click: () => { quitting = true; app.quit(); } },
  ]));
}

const openAtLogin = () => app.getLoginItemSettings().openAtLogin;
function setOpenAtLogin(on) {
  app.setLoginItemSettings({ openAtLogin: on, args: ['--hidden'] });
  updateTrayMenu();
  return openAtLogin();
}

function notify(title, body) {
  if (Notification.isSupported()) new Notification({ title, body, icon: asset('icon.png'), silent: true }).show();
}

// ------------------------------------------------------------------ moteur
function initCore() {
  core = new Core({ collectorDir: collectorDir(), dataDir: app.getPath('userData') });
  applyLang();
  core.on('snapshot', payload => {
    win?.webContents.send('snapshot', payload);
    updateTrayMenu();
    // Notification Windows quand la fenêtre n'est pas sous les yeux
    if (!win?.isVisible() || !win.isFocused()) {
      for (const e of payload.events.slice(0, 3)) {
        const port = typeof e.port === 'string' ? e.port : L.portLabel(e.port) || L.connLabel(e.connection);
        notify(L.deviceName(e), `${L.t('ev.' + e.type)}${port ? ' · ' + port : ''}`);
      }
    }
  });
  core.on('error', () => { /* le collecteur redémarre seul ; l'interface affiche l'erreur à la demande */ });
}

function startCore() {
  core.start();

  // Filet de sécurité : Bluetooth et réseau ne déclenchent pas toujours d'événement Windows
  const tick = () => {
    core.refresh().catch(() => {});
    setTimeout(tick, win?.isVisible() ? 20000 : 60000);
  };
  setTimeout(tick, 20000);
}

// ------------------------------------------------------------------ IPC
ipcMain.handle('state', async () => ({
  snapshot: core.snapshot || await core.refresh(),
  history: core.history,
  openAtLogin: openAtLogin(),
  langPref: core.settings.lang,
  lang: L.lang,
  version: app.getVersion(),
}));
ipcMain.handle('set-lang', (_e, pref) => {
  core.setLang(pref);
  applyLang();
  updateTrayMenu();
  return { pref, lang: L.lang };
});
ipcMain.handle('refresh', () => core.refresh());
ipcMain.handle('set-charger', (_e, w) => core.setChargerW(w));
ipcMain.handle('clear-history', () => core.clearHistory());
ipcMain.handle('set-open-at-login', (_e, on) => setOpenAtLogin(!!on));
ipcMain.handle('set-theme', (_e, dark) => {
  theme = dark ? 'dark' : 'light';
  const t = THEMES[theme];
  win.setBackgroundColor(t.bg);
  win.setTitleBarOverlay({ color: t.bg, symbolColor: t.ink, height: barHeight() });
});
ipcMain.on('content-height', (_e, h) => fitToContent(h));
ipcMain.handle('save-file', async (_e, { name, content, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters });
  if (canceled || !filePath) return null;
  await fs.promises.writeFile(filePath, content, 'utf8');
  return filePath;
});

// ------------------------------------------------------------------ cycle de vie
app.on('second-instance', showWindow);
app.on('before-quit', () => { quitting = true; core?.stop(); });
app.on('window-all-closed', e => e.preventDefault());

app.whenReady().then(() => {
  initCore();
  createWindow();
  createTray();
  startCore();
});
