const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;

const isDev = process.env.NODE_ENV !== 'production';
let mainWindow;
const store = new Store();

const BIN_DIR = path.join(__dirname, 'bin');
const REQUIRED_BINARIES = [
  { name: 'N_m3u8DL-RE' },
  { name: 'ffmpeg' }
];

function getPlatformBinaryName(name) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return name + ext;
}

function checkRequiredBinaries() {
  const missingBinaries = [];

  console.log('Checking binaries in directory:', BIN_DIR);

  if (!fs.existsSync(BIN_DIR)) {
    console.log('Creating bin directory');
    fs.mkdirSync(BIN_DIR);
  }

  for (const binary of REQUIRED_BINARIES) {
    const binaryPath = path.join(BIN_DIR, getPlatformBinaryName(binary.name));
    console.log('Checking for binary:', binaryPath);

    if (!fs.existsSync(binaryPath) || !fs.statSync(binaryPath).isFile()) {
      console.log('Missing binary:', binary.name);
      missingBinaries.push(binary.name);
    } else {
      console.log('Found binary:', binaryPath);
    }
  }

  if (missingBinaries.length > 0) {
    console.log('Showing warning for missing binaries:', missingBinaries);
    const targetWindow = mainWindow ?? BrowserWindow.getFocusedWindow();

    dialog.showMessageBox(targetWindow, {
      type: 'warning',
      title: 'Missing Required Binaries',
      message: 'Some required binaries are missing',
      detail: `The following binaries are missing from the 'bin' directory:\n${missingBinaries.join('\n')}\n\nPlease download them from the official sources and place them in the 'bin' directory.`,
      buttons: ['OK']
    });
  } else {
    console.log('All required binaries are present');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:8080'
      : `file://${path.join(__dirname, 'dist/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    checkRequiredBinaries();
  });
}

// IPC Handlers
ipcMain.handle('settings:get', () => {
  return store.get('settings');
});

ipcMain.handle('settings:set', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow ?? BrowserWindow.getFocusedWindow(), {
    properties: ['openDirectory']
  });

  return result.canceled ? null : result.filePaths[0];
});

// App lifecycle
app.whenReady().then(() => {
  // Initialize default settings if they don't exist
  if (!store.has('settings')) {
    store.set('settings', {
      // General Settings
      downloadLocation: path.join(app.getPath('downloads')),
      defaultFormat: 'mp4',
      autoStart: false,
      
      // Advanced Settings
      concurrentDownloads: 2,
      timeout: 60,
      debugMode: false,
      
      // N_m3u8DL-RE Settings
      tmpDir: path.join(app.getPath('temp')),
      threadCount: 16,
      downloadRetryCount: 3,
      checkSegmentsCount: true,
      binaryMerge: false,
      useFfmpegConcatDemuxer: false,
      delAfterDone: true,
      noDateInfo: false,
      noLog: false,
      writeMetaJson: true,
      appendUrlParams: false,
      concurrentDownload: false,
      subOnly: false,
      subFormat: 'SRT',
      autoSubtitleFix: true,
      logLevel: 'INFO',
      useSystemProxy: true
    });
  }

  createWindow();

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
