// Chromium's fake video device: does not access a real camera or microphone.
const electron = require('electron'), { app, BrowserWindow, ipcMain } = electron
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript'), { pathToFileURL } = require('node:url')
const root = path.resolve(__dirname, '..'), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'marcador-camera-')), cache = new Map()
app.setPath('userData', temporary); app.commandLine.appendSwitch('use-fake-device-for-media-stream')
process.env.VITE_DEV_SERVER_URL = pathToFileURL(path.join(root, 'dist') + path.sep).href
const resultFile = path.join(root, 'scripts/verify-live-result.json')
const errors = []; let win, db, screens, state
function load(file) {
  const filename = path.resolve(root, file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const req = name => {
    if (name === 'electron') return { ...electron, BrowserWindow: class { constructor(options) { win = new BrowserWindow({ ...options, webPreferences: { ...options.webPreferences, preload: path.join(root, 'dist-electron/preload.js') } }); win.show = () => {}; return win } } }
    if (name === '@/types') return load('src/types/index.ts')
    if (name === './display') return { openDisplay: () => ({ ok: true }) }
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')))
    return require(name)
  }
  new Function('require', 'module', 'exports', '__dirname', code)(req, module, module.exports, path.dirname(filename)); return module.exports
}
async function waitFor(expression) {
  const start = Date.now()
  while (Date.now() - start < 10000) { if (await win.webContents.executeJavaScript(expression)) return; await new Promise(resolve => setTimeout(resolve, 50)) }
  throw new Error('Timeout: ' + expression)
}
app.whenReady().then(async () => {
  db = load('electron/db.ts'); await db.initDatabase()
  const repo = load('electron/repository.ts')
  state = load('src/features/design/designModel.ts').previewState('tennis')
  state.homeScore = 7; state.awayScore = 3
  for (const [channel, handler] of Object.entries({ 'display:getState': () => state, 'display:getOverlay': () => null, 'settings:get': key => repo.getSetting(key), 'settings:set': (key, value) => repo.setSetting(key, value), 'screens:toggleLiveFullscreen': () => false, 'screens:closeLive': () => screens.closeLive() })) ipcMain.handle(channel, (_e, ...args) => handler(...args))
  screens = load('electron/screens.ts'); assert.equal(screens.openLive().ok, true)
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message) })
  await new Promise(resolve => win.webContents.once('did-finish-load', resolve))
  await waitFor("document.body.innerText.includes('Iniciar cámara')")
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('video').srcObject === null"), true)
  await win.webContents.executeJavaScript("Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Iniciar cámara').click()")
  await waitFor("document.querySelector('video').readyState >= 2 && document.body.innerText.includes('Cámara activa')")
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('video').srcObject.getAudioTracks().length"), 0)
  await waitFor("document.body.innerText.includes('7 – 3')")
  state.homeScore = 8; win.webContents.send('display:state', state)
  await waitFor("document.body.innerText.includes('8 – 3')")
  await win.webContents.executeJavaScript("window.testTrack = document.querySelector('video').srcObject.getVideoTracks()[0]; Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Detener cámara').click()")
  await waitFor("window.testTrack.readyState === 'ended' && document.querySelector('video').srcObject === null")
  const denied = await win.webContents.executeJavaScript("navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { s.getTracks().forEach(t => t.stop()); return false }, () => true)")
  assert.equal(denied, true)
  assert.deepEqual(errors, [])
  fs.writeFileSync(resultFile, JSON.stringify({ status: 'passed', checks: ['camera-off-initially', 'video-no-audio', 'live-score-sync', 'stop-releases-camera', 'microphone-denied'], errors }))
}).catch(error => { fs.writeFileSync(resultFile, JSON.stringify({ status: 'failed', error: error.stack, errors })); process.exitCode = 1 }).finally(async () => { win?.destroy(); if (db) await db.closeDatabase(); app.exit(process.exitCode ?? 0) })
