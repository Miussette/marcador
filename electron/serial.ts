import { app, dialog, type BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSetting, setSetting } from './repository'

export function configureSerialAccess(win: BrowserWindow): void {
  const trusted = (url: string): boolean => {
    try {
      if (app.isPackaged) return path.resolve(fileURLToPath(url)) === path.resolve(__dirname, '../dist/index.html')
      return new URL(url).origin === new URL(process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173/').origin
    } catch { return false }
  }
  const session = win.webContents.session
  session.setPermissionCheckHandler((contents, permission) => contents?.id === win.webContents.id && permission === 'serial' && trusted(contents.getURL()))
  session.setPermissionRequestHandler((contents, permission, callback) => callback(contents.id === win.webContents.id && permission === 'serial' && trusted(contents.getURL())))
  session.setDevicePermissionHandler(details => details.deviceType === 'serial' && !win.isDestroyed() && trusted(win.webContents.getURL()) && (details.origin === 'file://' || details.origin === new URL(win.webContents.getURL()).origin))
  session.on('select-serial-port', (event, ports, contents, callback) => {
    event.preventDefault()
    if (contents.id !== win.webContents.id || !trusted(contents.getURL())) { callback(''); return }
    const requested = getSetting('horn.port')?.trim()
    if (requested) {
      const port = ports.find(p => p.portName.toLowerCase() === requested.toLowerCase())
      if (port) callback(port.portId)
      else { callback(''); void dialog.showMessageBox(win, { type: 'error', message: `No se encontró ${requested}. Revisa el cable o deja el puerto vacío para elegir uno detectado.` }) }
      return
    }
    if (!ports.length) { callback(''); void dialog.showMessageBox(win, { message: 'No se detectaron puertos seriales. Conecta el dispositivo USB y vuelve a intentar.' }); return }
    void dialog.showMessageBox(win, { title: 'Puerto de la bocina', message: 'Selecciona el puerto COM del dispositivo', buttons: [...ports.map(p => p.portName), 'Cancelar'], cancelId: ports.length }).then(result => {
      const port = ports[result.response]
      if (!port || win.isDestroyed()) { callback(''); return }
      setSetting('horn.port', port.portName)
      callback(port.portId)
    }).catch(() => callback(''))
  })
}
