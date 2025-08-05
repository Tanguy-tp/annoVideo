import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dialog } from 'electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, '../assets', 'icon.png'), 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });


  if (process.env.NODE_ENV === 'development') {
    // In dev, load Vite's dev server URL
    win.loadURL('http://localhost:5173');
  } else {
    // In prod, load the built index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.on('close', async (event) => {
    event.preventDefault();
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Quit Application',
      message: 'Are you sure you want to quit?',
      buttons: ['Cancel', 'Quit'],
      defaultId: 1,
      cancelId: 0,
    });

    if (response === 1) {
      win.destroy();
    }
  });
}


app.whenReady().then(() => {
  createWindow();
});