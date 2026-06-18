import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { IPC_CHANNELS } from './ipc-channels'
import { sshSessionManager } from './ssh/sshSessionManager'
import { registerConnectionHandlers } from './handlers/connectionHandler'
import { registerGroupHandlers } from './handlers/groupHandler'
import { registerSnippetHandlers } from './handlers/snippetHandler'
import { registerLogHandlers } from './handlers/logHandler'
import { registerSshHandlers } from './handlers/sshHandler'
import { registerSftpHandlers } from './handlers/sftpHandler'
import { registerPortForwardHandlers } from './handlers/portForwardHandler'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerAllHandlers(): void {
  registerConnectionHandlers(ipcMain)
  registerGroupHandlers(ipcMain)
  registerSnippetHandlers(ipcMain)
  registerLogHandlers(ipcMain)
  registerSshHandlers(ipcMain)
  registerSftpHandlers(ipcMain)
  registerPortForwardHandlers(ipcMain)
}

app.whenReady().then(() => {
  createWindow()
  registerAllHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow, sshSessionManager, IPC_CHANNELS }
