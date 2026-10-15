// PrimaPorts — passerelle sûre entre l'interface et le processus principal.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('primaports', {
  getState: () => ipcRenderer.invoke('state'),
  refresh: () => ipcRenderer.invoke('refresh'),
  setCharger: w => ipcRenderer.invoke('set-charger', w),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  setOpenAtLogin: on => ipcRenderer.invoke('set-open-at-login', on),
  setTheme: dark => ipcRenderer.invoke('set-theme', dark),
  setLang: pref => ipcRenderer.invoke('set-lang', pref),
  saveFile: (name, content, filters) => ipcRenderer.invoke('save-file', { name, content, filters }),
  reportContentHeight: h => ipcRenderer.send('content-height', h),
  onSnapshot: cb => ipcRenderer.on('snapshot', (_e, payload) => cb(payload)),
});
