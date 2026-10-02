const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database API
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  dbRun: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  
  // App info/helpers
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDatabasePath: () => ipcRenderer.invoke('get-db-path'),
  
  // Printing API
  print: (options) => ipcRenderer.invoke('print-window', options),
  printToPDF: (defaultName) => ipcRenderer.invoke('print-to-pdf', defaultName)
});
