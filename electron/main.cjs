const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    title: 'SPIKE PANIC',
    icon: path.join(__dirname, '../public/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#0d0d1a',
    show: false,
    autoHideMenuBar: true,
  });

  // Load built game in production, dev server in development
  const devURL = 'http://localhost:3000/SpikePanic/';
  const prodFile = path.join(__dirname, '../dist/index.html');

  if (process.env.NODE_ENV === 'development' || !fs.existsSync(prodFile)) {
    mainWindow.loadURL(devURL);
  } else {
    mainWindow.loadFile(prodFile);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development') mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Steam achievements bridge (Greenworks or steam-native)
// Install: npm install greenworks  (requires Steamworks SDK)
// Then uncomment:
// try {
//   const greenworks = require('greenworks');
//   if (greenworks.initAPI()) {
//     ipcMain.handle('steam:activate-achievement', (_e, id) => {
//       greenworks.activateAchievement(id, () => {});
//     });
//     ipcMain.handle('steam:get-username', () => greenworks.getSteamId().getPersonaName());
//   }
// } catch (e) { console.log('Steam SDK not loaded (dev mode):', e.message); }

ipcMain.handle('toggle-fullscreen', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
