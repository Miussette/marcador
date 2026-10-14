const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let monitors = [1, 2, 3].map((id, index) => ({ id, workArea: { x: index * 1920, y: 0, width: 1920, height: 1080 } }))
const settings = new Map(), opened = []
class Window {
  constructor(options) { this.options = options; this.fullscreen = options.fullscreen ?? false; this.bounds = options; this.handlers = {}; this.webContents = { id: 1, getURL: () => this.url, session: { setPermissionCheckHandler: handler => { this.check = handler }, setPermissionRequestHandler: handler => { this.permission = handler } }, setWindowOpenHandler: () => {}, on: () => {} }; opened.push(this) }
  isDestroyed() { return false }
  setFullScreen(value) { this.fullscreen = value }
  isFullScreen() { return this.fullscreen }
  setBounds(value) { this.bounds = value }
  show() {} focus() {}
  once() {} on(event, handler) { this.handlers[event] = handler }
  close() { this.handlers.closed?.() }
  loadURL(url) { this.url = url; return Promise.resolve() }
}
const moduleObject = { exports: {} }
let markerOptions
const req = name => name === 'electron' ? { BrowserWindow: Window, app: { isPackaged: false }, screen: { getAllDisplays: () => monitors, getPrimaryDisplay: () => monitors[0] } } : name === './repository' ? { getSetting: key => settings.get(key), setSetting: (key, value) => settings.set(key, value) } : name === './display' ? { openDisplay: options => { markerOptions = options; return { ok: true } } } : require(name)
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'electron/screens.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
new Function('require', 'module', 'exports', '__dirname', code)(req, moduleObject, moduleObject.exports, path.join(root, 'electron'))
const screens = moduleObject.exports, control = new Window({})
screens.registerControlWindow(control)
assert.equal(screens.applyScreenAssignment({ controlDisplayId: 1, scoreboardDisplayId: 1, liveDisplayId: 3 }).ok, false)
assert.equal(screens.applyScreenAssignment({ controlDisplayId: 1, scoreboardDisplayId: 2, liveDisplayId: 99 }).ok, false)
const assignment = { controlDisplayId: 1, scoreboardDisplayId: 2, liveDisplayId: 3 }
assert.equal(screens.applyScreenAssignment(assignment).ok, true)
assert.deepEqual(markerOptions, { displayId: 2, fullscreen: true })
assert.equal(control.bounds.x, 0)
assert.equal(opened[1].bounds.x, 3840)
assert.equal(opened[1].fullscreen, true)
assert.deepEqual(screens.getScreenAssignment(), assignment)
assert.equal(screens.openLive(2, false).ok, true)
assert.equal(opened.length, 2); assert.equal(opened[1].bounds.x, 1920); assert.equal(opened[1].fullscreen, false)
assert.equal(screens.toggleLiveFullscreen(), true)
let permission
opened[1].permission(opened[1].webContents, 'media', value => { permission = value }, { mediaTypes: ['video'] }); assert.equal(permission, true)
opened[1].permission(opened[1].webContents, 'media', value => { permission = value }, { mediaTypes: ['audio'] }); assert.equal(permission, false)
opened[1].url = 'https://example.com'; opened[1].permission(opened[1].webContents, 'media', value => { permission = value }, { mediaTypes: ['video'] }); assert.equal(permission, false)
screens.closeLive(); assert.equal(screens.liveIsOpen(), false)
monitors = monitors.slice(0, 1); assert.equal(screens.applyScreenAssignment(assignment).ok, false)
console.log('Screens: assignment, disconnected/duplicate monitors, reuse, fullscreen, camera permissions passed')
