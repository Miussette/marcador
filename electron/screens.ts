import path from 'node:path'
import { app, BrowserWindow, screen } from 'electron'
import { getSetting, setSetting } from './repository'
import { openDisplay } from './display'
import type { ScreenAssignment } from '../src/types'

let controlWindow: BrowserWindow | null = null
let liveWindow: BrowserWindow | null = null
export function registerControlWindow(win: BrowserWindow): void { controlWindow = win }
export function liveIsOpen(): boolean { return !!liveWindow && !liveWindow.isDestroyed() }
export function getScreenAssignment(): ScreenAssignment {
  const displays = screen.getAllDisplays()
  const defaults: ScreenAssignment = { controlDisplayId: screen.getPrimaryDisplay().id, scoreboardDisplayId: displays[1]?.id ?? null, liveDisplayId: displays[2]?.id ?? null }
  try { return { ...defaults, ...JSON.parse(getSetting('screens.assignment') ?? '{}') } } catch { return defaults }
}
export function closeLive(): void { liveWindow?.close(); liveWindow = null }
export function toggleLiveFullscreen(): boolean {
  if (!liveIsOpen() || !liveWindow) return false
  const fullscreen = !liveWindow.isFullScreen(); liveWindow.setFullScreen(fullscreen); return fullscreen
}
export function openLive(displayId?: number, fullscreen = false): { ok: boolean; error?: string } {
  try {
    const target = displayId === undefined ? screen.getPrimaryDisplay() : screen.getAllDisplays().find(d => d.id === displayId)
    if (!target) throw new Error('El monitor de cámara ya no está conectado.')
    const bounds = target.workArea
    if (liveIsOpen() && liveWindow) {
      liveWindow.setFullScreen(false); liveWindow.setBounds(bounds); liveWindow.setFullScreen(fullscreen); liveWindow.show()
      return { ok: true }
    }
    const win = new BrowserWindow({ ...bounds, frame: false, show: false, fullscreen, backgroundColor: '#05070a', title: 'Marcador Pro — Cámara y OBS', webPreferences: { preload: path.join(__dirname, 'preload.js'), partition: 'persist:marcador-live', contextIsolation: true, nodeIntegration: false, sandbox: true } })
    liveWindow = win
    const trusted = (url: string) => {
      try { const parsed = new URL(url); return app.isPackaged ? parsed.protocol === 'file:' && path.resolve(decodeURIComponent(parsed.pathname).replace(/^\/(\w:)/, '$1')) === path.resolve(__dirname, '../dist/live.html') : url === new URL('live.html', process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173/').href } catch { return false }
    }
    win.webContents.session.setPermissionCheckHandler((contents, permission, _origin, details) => contents?.id === win.webContents.id && trusted(contents.getURL()) && permission === 'media' && details.mediaType !== 'audio')
    win.webContents.session.setPermissionRequestHandler((contents, permission, callback, details) => callback(contents.id === win.webContents.id && trusted(contents.getURL()) && permission === 'media' && 'mediaTypes' in details && !!details.mediaTypes && details.mediaTypes.length > 0 && details.mediaTypes.every(type => type === 'video')))
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault() })
    win.once('ready-to-show', () => { if (!win.isDestroyed()) win.show() })
    win.on('closed', () => { liveWindow = null })
    if (app.isPackaged) void win.loadFile(path.join(__dirname, '../dist/live.html'))
    else void win.loadURL(new URL('live.html', process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173/').href)
    return { ok: true }
  } catch (error) { return { ok: false, error: String(error) } }
}
export function applyScreenAssignment(assignment: ScreenAssignment): { ok: boolean; error?: string } {
  const displays = screen.getAllDisplays()
  const ids = [assignment.controlDisplayId, assignment.scoreboardDisplayId, assignment.liveDisplayId]
  if (ids.some(id => id === null || !Number.isInteger(id) || !displays.some(d => d.id === id))) return { ok: false, error: 'Selecciona tres monitores conectados.' }
  if (new Set(ids).size !== 3) return { ok: false, error: 'Cada salida debe tener un monitor diferente. También puedes abrir las ventanas por separado.' }
  if (!controlWindow || controlWindow.isDestroyed()) return { ok: false, error: 'La ventana de control no está disponible.' }
  const marker = openDisplay({ displayId: assignment.scoreboardDisplayId!, fullscreen: true })
  if (!marker.ok) return marker
  const live = openLive(assignment.liveDisplayId!, true)
  if (!live.ok) return live
  controlWindow.setFullScreen(false)
  controlWindow.setBounds(displays.find(d => d.id === assignment.controlDisplayId)!.workArea)
  controlWindow.show(); controlWindow.focus()
  setSetting('screens.assignment', JSON.stringify(assignment))
  return { ok: true }
}
