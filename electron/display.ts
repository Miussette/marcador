import path from 'node:path'
import { BrowserWindow, app, screen } from 'electron'
import type {
  DesignItem,
  DisplayInfo,
  DisplayState,
  DisplaySyncState,
  OverlayPayload,
  ScoreboardDesign,
  ScoreboardLayout,
} from '../src/types'
import { getMatch, getSetting } from './repository'
import { PlaybackQueue } from './playback'
import { pushOverlayToClients, pushToClients } from './obsServer'

/* ------------------------------------------------------------------ *
 *  Ventana DISPLAY: segundo monitor / TV / proyector / LED
 * ------------------------------------------------------------------ */

let displayWindow: BrowserWindow | null = null
let lastState: DisplaySyncState | null = null
let currentOverlay: OverlayPayload | null = null
let overlayEndsAt = 0
export const playback = new PlaybackQueue(item => {
  currentOverlay = item ? { ...item, id: String(Date.now()) + '-' + Math.random().toString(36).slice(2) } : null
  overlayEndsAt = item ? Date.now() + item.durationMs : 0
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('display:overlay', currentOverlay)
  }
  pushOverlayToClients(currentOverlay)
})
export function getOverlay(): OverlayPayload | null {
  return currentOverlay ? { ...currentOverlay, durationMs: Math.max(0, overlayEndsAt - Date.now()) } : null
}

const VALID_LAYOUTS: ScoreboardLayout[] = ['classic', 'modern', 'minimal', 'broadcast']

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

export function isDisplayOpen(): boolean {
  return displayWindow !== null && !displayWindow.isDestroyed()
}

/** Tamaño por defecto de la ventana Display al abrir (se puede mover y redimensionar). */
const DEFAULT_WINDOW_SIZE = { width: 1280, height: 720 }

/**
 * Bounds "sin bordes" centrados en el monitor elegido.
 * Se respeta el tamaño actual de la ventana si ya existía (por ejemplo al
 * reabrirla en otro monitor), para no perder la preferencia del operador.
 */
function windowedBoundsOn(
  target: Electron.Display,
  keepSize?: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const area = target.workArea
  const width = Math.min(keepSize?.width ?? DEFAULT_WINDOW_SIZE.width, area.width)
  const height = Math.min(keepSize?.height ?? DEFAULT_WINDOW_SIZE.height, area.height)
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    width,
    height,
  }
}

export function listDisplays(): DisplayInfo[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label || `Monitor ${d.id}`,
    primary: d.id === screen.getPrimaryDisplay().id,
    width: d.bounds.width,
    height: d.bounds.height,
    bounds: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height },
  }))
}

export function openDisplay(options?: { displayId?: number; fullscreen?: boolean }): {
  ok: boolean
  error?: string
} {
  try {
    // Si el partido del último estado fue borrado (p. ej. se eliminó su
    // proyecto), se limpia para no reabrir la pantalla con datos fantasma.
    if (lastState?.matchId && !getMatch(lastState.matchId)) lastState = null

    const displays = screen.getAllDisplays()
    const target =
      (options?.displayId !== undefined && displays.find((d) => d.id === options.displayId)) ||
      screen.getPrimaryDisplay()

    if (isDisplayOpen() && displayWindow) {
      // Reubica la ventana en el monitor elegido conservando su tamaño.
      const previous = displayWindow.getBounds()
      if (displayWindow.isFullScreen()) displayWindow.setFullScreen(false)
      displayWindow.setBounds(windowedBoundsOn(target, previous))
      displayWindow.setFullScreen(options?.fullscreen === true)
      displayWindow.show()
      displayWindow.focus()
      broadcastState()
      return { ok: true }
    }

    const bounds = windowedBoundsOn(target)
    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      // Sin bordes y en ventana: se puede arrastrar (barra de la UI Display)
      // y pasar a pantalla completa con F11 o el botón de la propia ventana.
      fullscreen: options?.fullscreen === true,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      backgroundColor: '#05070A',
      title: 'Marcador Pro — Pantalla',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    displayWindow = win

    // Avisa a la UI de la ventana Display cuando entra o sale de pantalla completa
    // (F11, botones o atajos del sistema). Se lee el estado en el siguiente tick:
    // en Windows el evento se emite antes de que isFullScreen() se actualice.
    const notifyFullscreen = (): void => {
      setTimeout(() => {
        if (!win.isDestroyed()) win.webContents.send('display:fullscreen', win.isFullScreen())
      }, 60)
    }
    win.on('enter-full-screen', notifyFullscreen)
    win.on('leave-full-screen', notifyFullscreen)

    if (!app.isPackaged) {
      win.webContents.on('console-message', (details) => {
        if (details.level !== 'error' && details.level !== 'warning') return
        console.log(`[display:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`)
      })
    }
    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) win.show()
    })
    win.on('closed', () => {
      displayWindow = null
    })

    loadPage(win, 'display.html')
    broadcastState()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function closeDisplay(): void {
  if (isDisplayOpen() && displayWindow) displayWindow.close()
  displayWindow = null
}

export function toggleFullscreen(): boolean {
  if (!isDisplayOpen() || !displayWindow) return false
  const next = !displayWindow.isFullScreen()
  displayWindow.setFullScreen(next)
  return next
}

export function isDisplayFullscreen(): boolean {
  return Boolean(displayWindow && !displayWindow.isDestroyed() && displayWindow.isFullScreen())
}

/** Minimiza la ventana Display (queda en la barra de tareas). */
export function minimizeDisplay(): void {
  if (isDisplayOpen() && displayWindow) displayWindow.minimize()
}

/**
 * Redimensiona la ventana Display sin bordes (gesto de la esquina inferior
 * derecha en la UI). Se limita al área de trabajo del monitor actual.
 */
export function setDisplaySize(size: { width?: number; height?: number }): void {
  if (!isDisplayOpen() || !displayWindow) return
  const current = displayWindow.getBounds()
  const area = screen.getDisplayMatching(current).workArea
  const width = Math.max(320, Math.min(Math.round(size.width ?? current.width), area.width))
  const height = Math.max(240, Math.min(Math.round(size.height ?? current.height), area.height))
  displayWindow.setBounds({ x: current.x, y: current.y, width, height })
}

function currentLayout(): ScoreboardLayout {
  const stored = getSetting('scoreboard.layout')
  return VALID_LAYOUTS.includes(stored as ScoreboardLayout) ? (stored as ScoreboardLayout) : 'broadcast'
}

/**
 * Diseño personalizado guardado en settings (`scoreboard.design`).
 * Devuelve null cuando no existe o el JSON no es válido: en ese caso la
 * pantalla usa las plantillas nativas (classic/modern/minimal/broadcast).
 *
 * Se memoiza por texto: el estado se reemite a menudo y el diseño (que puede
 * llevar una imagen de fondo en data URL) no cambia en cada envío.
 */
let designCache: { raw: string; value: ScoreboardDesign | null } | null = null

function currentDesign(): ScoreboardDesign | null {
  const raw = getSetting('scoreboard.design') ?? ''
  if (designCache && designCache.raw === raw) return designCache.value
  const value = parseDesignJson(raw)
  designCache = { raw, value }
  return value
}

function parseDesignJson(raw: string): ScoreboardDesign | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Partial<ScoreboardDesign>
    if (!Array.isArray(candidate.items)) return null
    const items = candidate.items.filter((item): item is DesignItem => isDesignItem(item))
    if (items.length === 0) return null
    return {
      enabled: candidate.enabled !== false,
      preset: candidate.preset === 'fiba1' || candidate.preset === 'default' ? candidate.preset : undefined,
      sport: candidate.sport,
      background: typeof candidate.background === 'string' && candidate.background ? candidate.background : null,
      items,
    }
  } catch {
    return null
  }
}

function isDesignItem(value: unknown): value is DesignItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<DesignItem>
  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.x === 'number' &&
    typeof item.y === 'number' &&
    typeof item.w === 'number' &&
    typeof item.h === 'number'
  )
}

/** Reemite el estado cuando cambia una setting que afecta a la pantalla. */
export function broadcastForSetting(key: string): void {
  if (key === 'scoreboard.layout' || key === 'scoreboard.design') broadcastState()
}

export function syncDisplay(state: DisplaySyncState | null): void {
  lastState = state
  broadcastState()
}

export function broadcastState(): void {
  // null = limpiar la pantalla: la ventana Display vuelve a su pantalla de espera.
  const payload: DisplayState | null = lastState
    ? { ...lastState, layout: currentLayout(), design: currentDesign(), updatedAt: Date.now() }
    : null
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('display:state', payload)
  }
  // Empuja también a los clientes web (OBS Browser Source).
  pushToClients(payload)
}

export function getDisplayState(): DisplayState | null {
  if (!lastState) return null
  return { ...lastState, layout: currentLayout(), design: currentDesign(), updatedAt: Date.now() }
}

export function sendOverlay(payload: Omit<OverlayPayload, 'id'>): void {
  playback.play([payload], false)
}
