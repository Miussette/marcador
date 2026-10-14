import { registerControlWindow, closeLive } from './screens'
import path from 'node:path'
import { BrowserWindow, Menu, app, dialog } from 'electron'
import { flushSync, initDatabase } from './db'
import { registerIpcHandlers } from './ipc'
import { playback, closeDisplay } from './display'
import { stopServer } from './obsServer'
import { configureSerialAccess } from './serial'
import { ensureExampleProjects } from './examples'

let controlWindow: BrowserWindow | null = null

function devServerUrl(): string {
  const raw = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

function loadPage(win: BrowserWindow, page: string, attempt = 0): void {
  if (win.isDestroyed()) return
  if (!app.isPackaged) {
    const url = `${devServerUrl()}${page}`
    win.loadURL(url).catch(() => {
      if (win.isDestroyed() || attempt > 40) return
      setTimeout(() => loadPage(win, page, attempt + 1), 400)
    })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', page)).catch(() => {
      if (win.isDestroyed() || attempt > 10) return
      setTimeout(() => loadPage(win, page, attempt + 1), 400)
    })
  }
}

function createControlWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#0B0F14',
    title: 'Marcador Pro',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      partition: 'persist:control',
    },
  })

  if (!app.isPackaged) {
    // Reenvía los errores de la consola del renderer al terminal del desarrollador.
    win.webContents.on('console-message', (details) => {
      if (details.level !== 'error' && details.level !== 'warning') return
      console.log(`[renderer:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`)
    })

    win.webContents.on('render-process-gone', (_event, gone) => {
      console.error(`[renderer] Proceso eliminado: ${gone.reason}`)
    })
  }

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show()
  })
  win.on('closed', () => {
    controlWindow = null
  })

  configureSerialAccess(win)
  loadPage(win, 'index.html')
  controlWindow = win
  registerControlWindow(win)
}

async function bootstrap(): Promise<void> {
  try {
    await initDatabase()
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
    ensureExampleProjects(today)
    console.log('[main] Base de datos lista.')
  } catch (err) {
    dialog.showErrorBox(
      'No se pudo iniciar la base de datos',
      err instanceof Error ? err.message : String(err),
    )
    app.quit()
    return
  }

  Menu.setApplicationMenu(null)
  registerIpcHandlers()
  createControlWindow()
}

// Depuración (solo desarrollo): MP_DEBUG_PORT=9222 npm run dev
// Permite inspeccionar la app con CDP (DevTools remotos).
if (!app.isPackaged && process.env.MP_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.MP_DEBUG_PORT)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (controlWindow) {
      if (controlWindow.isMinimized()) controlWindow.restore()
      controlWindow.focus()
    }
  })

  app.whenReady().then(() => void bootstrap()).catch((err: unknown) => {
    dialog.showErrorBox('Error al iniciar Marcador Pro', err instanceof Error ? err.message : String(err))
    app.quit()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    playback.stop()
    closeDisplay()
    closeLive()
    stopServer()
    flushSync()
  })

  app.on('quit', () => {
    flushSync()
  })
}
