import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getVideo } from './repository'
import { playback, getDisplayState, getOverlay } from './display'
import type { DisplayState, OverlayPayload } from '../src/types'

const DEFAULT_PORT = 4456
let server: http.Server | null = null
let port = DEFAULT_PORT
const clients = new Set<http.ServerResponse>()
export const isServerRunning = (): boolean => server !== null
export const getServerPort = (): number => port
export const getServerUrl = (): string | null => server ? 'http://localhost:' + port + '/' : null

export function startServer(requested = DEFAULT_PORT): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (server) return Promise.resolve({ ok: true, url: getServerUrl()! })
  return new Promise(resolve => {
    const candidate = http.createServer((req, res) => { void handleRequest(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }) })
    candidate.once('error', error => resolve({ ok: false, error: error.message }))
    candidate.listen(requested, '0.0.0.0', () => {
      server = candidate
      port = (candidate.address() as { port: number }).port
      resolve({ ok: true, url: getServerUrl()! })
    })
  })
}
export function stopServer(): void {
  for (const client of clients) client.end()
  clients.clear()
  const current = server
  server = null
  current?.close()
  current?.closeAllConnections()
}
function broadcast(event: string, payload: unknown): void {
  for (const client of clients) client.write('event: ' + event + '\ndata: ' + JSON.stringify(payload) + '\n\n')
}
export function pushToClients(state: DisplayState | null): void { broadcast('state', state) }
export function pushOverlayToClients(overlay: OverlayPayload | null): void { broadcast('overlay', overlay) }

const BRIDGE = `(() => {
  document.documentElement.dataset.browserDisplay = 'true';
  const events = new EventSource('/events');
  const listeners = { state: new Set(), overlay: new Set() };
  let state = null, overlay = null;
  for (const kind of ['state', 'overlay']) events.addEventListener(kind, event => {
    const value = JSON.parse(event.data);
    if (kind === 'overlay' && value && value.videoId) value.dataUrl = '/video/' + encodeURIComponent(value.videoId);
    if (kind === 'state') state = value; else overlay = value;
    for (const listener of listeners[kind]) listener(value);
  });
  const subscribe = (kind, listener) => { listeners[kind].add(listener); return () => listeners[kind].delete(listener); };
  window.api = { display: {
    getState: async () => state,
    getOverlay: async () => overlay,
    onState: listener => subscribe('state', listener),
    onOverlay: listener => subscribe('overlay', listener),
    onFullscreen: () => () => {},
    isFullscreen: async () => false,
    toggleFullscreen: async () => false,
    finishContent: async id => { await fetch('/finished/' + encodeURIComponent(id), { method: 'POST' }); },
    stopContent: async () => { overlay = null; for (const listener of listeners.overlay) listener(null); }
  }};
})();`

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname.startsWith('/finished/') && req.method === 'POST') {
    if (getOverlay()?.id === decodeURIComponent(url.pathname.slice(10))) playback.stop()
    res.writeHead(204); res.end(); return
  }
  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    res.write('retry: 1000\n\n')
    res.write('event: state\ndata: ' + JSON.stringify(getDisplayState()) + '\n\n')
    res.write('event: overlay\ndata: ' + JSON.stringify(getOverlay()) + '\n\n')
    clients.add(res)
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000)
    res.on('close', () => { clearInterval(heartbeat); clients.delete(res) })
    return
  }
  if (url.pathname === '/bridge.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end(BRIDGE); return
  }
  if (url.pathname.startsWith('/video/')) {
    const video = getVideo(decodeURIComponent(url.pathname.slice(7)))
    if (!video || !video.src.startsWith('file:')) { res.writeHead(404); res.end(); return }
    const file = fileURLToPath(video.src)
    const stat = await fs.promises.stat(file)
    const mime = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg' }[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    const range = req.headers.range
    const match = range?.match(/^bytes=(\d+)-(\d*)$/)
    if (range && !match) { res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }); res.end(); return }
    const start = match ? Number(match[1]) : 0
    const end = match && match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1
    if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }); res.end(); return }
    res.writeHead(match ? 206 : 200, { 'Content-Type': mime, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', ...(match ? { 'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size } : {}) })
    if (req.method === 'HEAD') { res.end(); return }
    const stream = fs.createReadStream(file, { start, end })
    stream.on('error', () => res.destroy())
    res.on('close', () => stream.destroy())
    stream.pipe(res)
    return
  }
  const root = path.resolve(__dirname, '../dist')
  if (['/', '/index.html', '/display.html', '/browser-display'].includes(url.pathname)) {
    const html = await fs.promises.readFile(path.join(root, 'display.html'), 'utf8')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html.replace('<head>', '<head><script src="/bridge.js"></script>'))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname))
    if (!target.startsWith(path.join(root, 'assets') + path.sep)) { res.writeHead(403); res.end(); return }
    const data = await fs.promises.readFile(target)
    res.writeHead(200, { 'Content-Type': target.endsWith('.js') ? 'application/javascript' : target.endsWith('.css') ? 'text/css' : 'application/octet-stream' })
    res.end(data); return
  }
  res.writeHead(404); res.end()
}
