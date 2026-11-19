const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 760,
    minHeight: 540,
    backgroundColor: '#111318',
    title: 'Corporate Tragedy',
    webPreferences: {
      webviewTag: true,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.removeMenu();
  if (!app.isPackaged) win.loadURL(process.env.CT_DEV_URL || 'http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });