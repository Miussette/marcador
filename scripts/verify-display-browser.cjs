/* Render real de la salida OBS en una ventana oculta y con perfil temporal. */
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'marcador-display-'))
app.setPath('userData', temporary)
const cache = new Map()
let state = null, overlay = null, stopped = false
let server, win
const failures = []
const resultFile = path.join(root, 'scripts', 'verify-display-result.json')
fs.writeFileSync(resultFile, JSON.stringify({ status: 'starting' }))
const display = {
  getDisplayState: () => state,
  getOverlay: () => overlay,
  playback: { stop: () => { stopped = true; overlay = null; server.pushOverlayToClients(null) } },
}
function load(file) {
  const filename = path.resolve(root, file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const req = name => {
    if (name === './display') return display
    if (name === './repository') return { getVideo: () => ({ src: require('node:url').pathToFileURL(path.join(temporary, 'fixture.webm')).href }) }
    if (name === '@/types') return load('src/types/index.ts')
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')))
    return require(name)
  }
  new Function('require', 'module', 'exports', '__dirname', code)(req, module, module.exports, path.dirname(filename))
  return module.exports
}
async function waitFor(expression, timeout = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await win.webContents.executeJavaScript(expression)) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('No se cumplió: ' + expression)
}
app.whenReady().then(async () => {
  server = load('electron/obsServer.ts')
  const model = load('src/features/design/designModel.ts')
  state = model.previewState('basketball')
  state.timer = { running: false, startedAt: null, elapsed: 6000000 }
  state.design = model.defaultDesign('basketball')
  state.home.players = [{ id: 'p', firstName: 'Ana', lastName: 'Pérez', number: 7 }]
  state.away.players = []
  const started = await server.startServer(0)
  assert.equal(started.ok, true)
  win = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false, contextIsolation: true, nodeIntegration: false } })
  win.webContents.on('console-message', details => { if (details.level === 'error') failures.push(details.message) })
  await win.loadURL(started.url)
  await waitFor("document.body.innerText.includes('01:40:00')")
  assert.equal(await win.webContents.executeJavaScript("document.body.innerText.includes('Nombre jugador')"), false)
  state.showPlayers = true; server.pushToClients(state)
  await waitFor("document.body.innerText.includes('Ana Pérez')")
  state.showPlayers = false; server.pushToClients(state)
  await waitFor("!document.body.innerText.includes('Ana Pérez')")
  const previous = structuredClone(state)
  state.design = model.fiba1Design(); state.showPlayers = true
  state.timer.elapsed = 0; state.competition = 'FIBA 1 · Prueba'
  state.playerStats = { p: { points: 12, fouls: 3 } }; state.homeTimeouts = 2; state.possession = 'home'
  state.home.name = 'Argentina'; state.home.shortName = 'Argentina'
  state.away.name = 'Brasil'; state.away.shortName = 'Brasil'
  for (const side of ['home', 'away']) {
    const names = side === 'home' ? ['Scola', 'Aimar', 'González', 'Oberto', 'Juan', 'Sequeira', 'Delfino', 'Alfredo', 'Gutiérrez', 'Jasen', 'Federico'] : ['Machado', 'Santos', 'Becker', 'Neto', 'Garcia', 'Huertas', 'Barbosa', 'Varejao', 'Giovannoni', 'Batista', 'Marquinhos', 'Tiago']
    state[side].players = [...state[side].players, ...names.map((name, i) => ({ id: `${side}-${i}`, firstName: name, lastName: '', number: i + 4 }))].slice(0, 12)
  }
  server.pushToClients(state)
  await waitFor("document.querySelector('[data-player-row=p]')?.innerText.includes('Ana')")
  await waitFor("document.body.innerText.includes('0.0') && document.body.innerText.includes('FIBA 1')")
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('[data-player-row=p]').innerText.includes('12')"), true)
  assert.equal(await win.webContents.executeJavaScript("!!document.querySelector('[aria-label=\"3 faltas\"]') && !!document.querySelector('[aria-label=\"2 tiempos muertos utilizados\"]') && !!document.querySelector('[aria-label=\"Posesión local activa\"]')"), true)
  win.setContentSize(1280, 720)
  await new Promise(resolve => setTimeout(resolve, 100))
  fs.writeFileSync(path.join(root, 'docs/fiba1-preview.png'), (await win.webContents.capturePage()).toPNG())
  state.showPlayers = false; server.pushToClients(state)
  await waitFor("!document.querySelector('[data-player-row=p]')")
  state = previous; server.pushToClients(state)
  overlay = { id: 'message', kind: 'text', text: 'MENSAJE DE PRUEBA', dataUrl: null, durationMs: 10000 }
  server.pushOverlayToClients(overlay)
  await waitFor("document.body.innerText.includes('MENSAJE DE PRUEBA')")
  overlay = null; server.pushOverlayToClients(null)
  await waitFor("!document.body.innerText.includes('MENSAJE DE PRUEBA')")
  const sports = load('src/features/sports/rules.ts')
  state.sportState = sports.initialSportState('tennis')
  state.sportState.current.points = [4, 3]; state.sportState.current.games = [2, 1]
  server.pushToClients(state)
  await waitFor("document.body.innerText.includes('AD') && document.body.innerText.includes('Juegos 2')")
  state.sportState = sports.initialSportState('baseball'); state.sportState.current.balls = 2
  server.pushToClients(state)
  await waitFor("document.body.innerText.includes('Bolas 2') && !document.body.innerText.includes('AD')")
  state.sportState = sports.initialSportState('judo'); state.sportState.current.waza = [1, 0]
  state.timer.elapsed = 300000; server.pushToClients(state)
  await waitFor("document.body.innerText.includes('0/1/0')")
  await waitFor("document.body.innerText.includes('00:00')")
  state.sportState = sports.initialSportState('long_jump')
  state.sportState.current.results = [{ id: 'mark', name: 'TEST ATHLETE', attempts: [6.42], status: 'valid' }]
  server.pushToClients(state)
  await waitFor("document.body.innerText.includes('TEST ATHLETE') && document.body.innerText.includes('6.42')")
  state.sportState = null; server.pushToClients(state)
  await waitFor("!document.body.innerText.includes('TEST ATHLETE')")
  // Crear un clip válido en Chromium, sin descargar archivos externos.
  const encoded = await win.webContents.executeJavaScript(`(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d'); context.fillStyle = 'blue'; context.fillRect(0, 0, 64, 64);
    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const done = new Promise(resolve => recorder.onstop = resolve);
    let frame = 0;
    const drawing = setInterval(() => { context.fillStyle = frame++ % 2 ? 'red' : 'blue'; context.fillRect(0, 0, 64, 64); }, 50);
    recorder.start(); await new Promise(resolve => setTimeout(resolve, 2000)); recorder.stop(); await done; clearInterval(drawing);
    stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type: 'video/webm' });
    return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
  })()`)
  fs.writeFileSync(path.join(temporary, 'fixture.webm'), Buffer.from(encoded, 'base64'))
  await win.webContents.executeJavaScript("window.videoEvents = []; for (const kind of ['loadeddata', 'playing', 'ended', 'error']) document.addEventListener(kind, event => { if (event.target.tagName === 'VIDEO') window.videoEvents.push(kind); }, true)")
  overlay = { id: 'video', kind: 'video', videoId: 'fixture', text: 'Clip', dataUrl: 'unused', durationMs: 10000 }
  server.pushOverlayToClients(overlay)
  await waitFor("window.videoEvents.includes('playing')")
  await waitFor("!document.querySelector('video')")
  assert.equal(stopped, true)
  const videoEvents = await win.webContents.executeJavaScript('window.videoEvents')
  assert.equal(videoEvents.includes('error'), false)
  assert.equal(videoEvents.includes('ended'), true)
  assert.deepEqual(failures, [])
  fs.writeFileSync(resultFile, JSON.stringify({ status: 'passed', checks: ['clock', 'players', 'fiba1-roster-stats-possession-timeouts', 'messages', 'tennis', 'baseball', 'judo', 'athletics', 'webm', 'finish'], failures }))
  console.log('OK: render OBS real, horas, nóminas, mensajes, detener y reproducción/finalización de video WebM.')
}).catch(error => { console.error(error); fs.writeFileSync(resultFile, JSON.stringify({ status: 'failed', error: error.stack, failures })); process.exitCode = 1 }).finally(() => {
  win?.destroy(); server?.stopServer(); app.exit(process.exitCode ?? 0)
})
