const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { initDatabase, getDatabase } = require('./database');

const isDev = !app.isPackaged;

// Versão LOCAL de testes: pasta userData própria (localStorage, cache e banco SQLite),
// fixada aqui para nunca coincidir com a do sistema original, em dev ou instalado.
app.setName('Retifica Mendonca LOCAL');
app.setPath('userData', path.join(app.getPath('appData'), 'retifica-mendonca-local'));

const DEV_SERVER_URL = 'http://localhost:3210';

console.log('Modo:', isDev ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');
console.log('userData:', app.getPath('userData'));


// Register custom protocol scheme
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, bypassCSP: true, stream: true } }
]);

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, process.platform === 'win32' ? 'assets/icon.ico' : 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      zoomFactor: 1.0
    }
  });

  // Open window maximized while retaining standard titlebar and controls
  mainWindow.maximize();

  console.time('⏱️ [STARTUP TIME] Electron Window did-finish-load');

  // Block navigation away from the app's own local content and deny popup windows,
  // so a compromised renderer (e.g. future XSS) can't redirect the window or spawn
  // browser windows pointed at an attacker-controlled URL.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? url.startsWith(DEV_SERVER_URL)
      : url.startsWith('app://');
    if (!allowed) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Force 1:1 zoom limit to ensure sharp pixel rendering in desktop app
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    console.timeEnd('⏱️ [STARTUP TIME] Electron Window did-finish-load');
  });

  // Load the application
  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    // Open developer tools automatically in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the Next.js static exported HTML via custom protocol
    mainWindow.loadURL('app://localhost/index.html').catch((err) => {
      console.error('Failed to load URL via custom protocol:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Database IPC handlers
ipcMain.handle('db-query', async (event, sql, params = []) => {
  const db = getDatabase();
  try {
    const stmt = db.prepare(sql);
    return stmt.all(params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
});

ipcMain.handle('db-run', async (event, sql, params = []) => {
  const db = getDatabase();
  try {
    const stmt = db.prepare(sql);
    return stmt.run(params);
  } catch (error) {
    console.error('Database run error:', error);
    throw error;
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-db-path', () => {
  const { getDatabasePath } = require('./database');
  return getDatabasePath();
});

ipcMain.handle('print-window', async (event, options = {}) => {
  const webContents = event.sender;
  return new Promise((resolve) => {
    webContents.print(options, (success, failureReason) => {
      resolve({ success, failureReason });
    });
  });
});

ipcMain.handle('print-to-pdf', async (event, defaultName = 'relatorio.pdf') => {
  const webContents = event.sender;
  try {
    const data = await webContents.printToPDF({
      marginsType: 0,
      printBackground: true,
      printSelectionOnly: false,
      landscape: false,
      preferCSSPageSize: true
    });
    
    const { dialog } = require('electron');
    const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(webContents), {
      title: 'Salvar PDF',
      defaultPath: defaultName,
      filters: [{ name: 'Adobe PDF Document', extensions: ['pdf'] }]
    });
    
    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    await fs.promises.writeFile(filePath, data);
    return { success: true, filePath };
  } catch (error) {
    console.error('Failed to print to PDF:', error);
    throw error;
  }
});

app.whenReady().then(() => {
  // Register custom protocol handler to serve Next.js static files correctly
  protocol.handle('app', async (request) => {
    try {
      const url = new URL(request.url);
      const pathname = decodeURIComponent(url.pathname);
      const resolvedPath = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.join(__dirname, '..', 'out', resolvedPath);
      
      if (fs.existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).href);
      } else {
        console.warn('File not found in custom protocol:', filePath);
        // Fallback for SPA routing if it has no extension
        if (!path.extname(filePath)) {
          return net.fetch(pathToFileURL(path.join(__dirname, '..', 'out', 'index.html')).href);
        }
        return new Response('Not Found', { status: 404 });
      }
    } catch (err) {
      console.error('Custom protocol handler error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  console.time('⏱️ [STARTUP TIME] Electron initDatabase');
  initDatabase();
  console.timeEnd('⏱️ [STARTUP TIME] Electron initDatabase');

  console.time('⏱️ [STARTUP TIME] Electron createWindow');
  createWindow();
  console.timeEnd('⏱️ [STARTUP TIME] Electron createWindow');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
