// Real renderer + preload IPC + temporary SQLite. The operator's data is never opened.
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..'), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'marcador-controls-'))
app.setPath('userData', temporary)
const resultFile = path.join(root, 'scripts', 'verify-control-result.json')
const cache = new Map(), errors = []
let win, db
function load(file) {
  const filename = path.resolve(root, file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const req = name => name === '@/types' ? load('src/types/index.ts') : name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts'))) : require(name)
  new Function('require', 'module', 'exports', '__dirname', code)(req, module, module.exports, path.dirname(filename))
  return module.exports
}
async function waitFor(expression) {
  const start = Date.now()
  while (Date.now() - start < 8000) {
    if (await win.webContents.executeJavaScript(expression)) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('Timeout: ' + expression)
}
const click = (label, index = 0) => win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === ${JSON.stringify(label)})[${index}].click()`)
app.whenReady().then(async () => {
  db = load('electron/db.ts'); await db.initDatabase()
  const repo = load('electron/repository.ts')
  let assignmentApplied = null
  const handlers = {
    'screens:getAssignment': () => ({ controlDisplayId: 1, scoreboardDisplayId: 2, liveDisplayId: 3 }),
    'screens:liveIsOpen': () => false,
    'screens:apply': assignment => { assignmentApplied = assignment; return { ok: true } },
    'settings:get': key => repo.getSetting(key), 'settings:set': (key, value) => repo.setSetting(key, value),
    'matches:get': id => repo.getMatch(id), 'matches:list': id => repo.listMatches(id),
    'matches:update': (id, patch) => repo.updateMatch(id, patch), 'matches:sportAction': (id, action) => repo.sportAction(id, action),
    'projects:get': id => repo.getProject(id), 'projects:list': () => repo.listProjects(),
    'teams:list': id => repo.listTeams(id), 'events:list': () => [], 'players:listByTeam': () => [],
    'officials:listByMatch': () => [],
    'shortcuts:list': () => [], 'display:isOpen': () => false,
    'display:listDisplays': () => [1, 2, 3].map(id => ({ id, label: `Monitor ${id}`, primary: id === 1, width: 1920, height: 1080, bounds: { x: (id - 1) * 1920, y: 0, width: 1920, height: 1080 } })),
  }
  const channels = new Set([...fs.readFileSync(path.join(root, 'electron/preload.ts'), 'utf8').matchAll(/invoke\('([^']+)'/g)].map(match => match[1]))
  for (const channel of channels) ipcMain.handle(channel, (_event, ...args) => handlers[channel]?.(...args) ?? null)
  const fixtures = {}
  for (const sport of ['tennis', 'baseball', 'judo', 'long_jump', 'basketball']) {
    const p = repo.createProject({ name: sport, sport, season: '2026', location: '', date: '2026-10-08', modality: 'league' })
    const team = name => repo.createTeam({ projectId: p.id, name, shortName: name, code: '', logo: null, primaryColor: '#2563EB', secondaryColor: '#FFFFFF', city: '', country: '' })
    const h = team('Local'), a = team('Visitante')
    fixtures[sport] = repo.createMatch({ projectId: p.id, homeTeamId: h.id, awayTeamId: a.id, venue: '', kickoff: '2026-10-08T20:00', round: '', competition: '' })
  }
  win = new BrowserWindow({ show: false, width: 1440, height: 920, webPreferences: { preload: path.join(root, 'dist-electron/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message) })
  const open = async sport => {
    const m = fixtures[sport]
    if (!win.webContents.getURL()) await win.loadFile(path.join(root, 'dist/index.html'), { hash: `/p/${m.projectId}/control/${m.id}` })
    else await win.webContents.executeJavaScript(`location.hash = ${JSON.stringify(`/p/${m.projectId}/control/${m.id}`)}`)
    await waitFor(`document.body.innerText.includes(${JSON.stringify(sport === 'basketball' ? 'Asignar posesión' : 'Reiniciar reglamento')}) && document.body.innerText.includes('${sport}')`)
  }
  await open('tennis')
  await click('3 pantallas')
  await waitFor("document.querySelector('[role=dialog] select')?.options.length === 4")
  await click('Aplicar 3 pantallas')
  await waitFor("!Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Aplicar 3 pantallas').disabled")
  assert.deepEqual(assignmentApplied, { controlDisplayId: 1, scoreboardDisplayId: 2, liveDisplayId: 3 })
  await win.webContents.executeJavaScript("document.querySelector('[role=dialog] button[aria-label=Cerrar]').click()")
  await click('+ Punto'); await waitFor("document.body.innerText.includes('15')")
  assert.deepEqual(repo.getMatch(fixtures.tennis.id).sportState.current.points, [1, 0])
  await click('Deshacer última acción'); await waitFor("!document.body.innerText.includes('15')")
  assert.deepEqual(repo.getMatch(fixtures.tennis.id).sportState.current.points, [0, 0])
  await open('baseball'); await click('Bola'); await waitFor("document.body.innerText.includes('Bolas 1')")
  assert.equal(repo.getMatch(fixtures.baseball.id).sportState.current.balls, 1)
  await open('judo'); await click('ippon'); await waitFor("document.body.innerText.includes('Ganador: Local')")
  assert.equal(repo.getMatch(fixtures.judo.id).status, 'finished')
  await click('Deshacer última acción'); await waitFor("!document.body.innerText.includes('Ganador: Local')")
  assert.equal(repo.getMatch(fixtures.judo.id).status, 'live')
  await open('long_jump')
  await win.webContents.executeJavaScript(`(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; for (const [placeholder, value] of [['Participante','TEST ATHLETE'], ['Marca:', '6,45; 6,20']]) { const input = Array.from(document.querySelectorAll('input')).find(e => e.placeholder.startsWith(placeholder)); setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); } })()`)
  await click('Guardar marca'); await waitFor("document.querySelector('tbody').innerText.includes('6.45')")
  assert.equal(repo.getMatch(fixtures.long_jump.id).sportState.current.results[0].name, 'TEST ATHLETE')
  await click('Finalizar prueba'); await waitFor("document.body.innerText.includes('Reabrir prueba')")
  assert.equal(repo.getMatch(fixtures.long_jump.id).status, 'finished')
  await open('basketball'); await click('Asignar posesión')
  await waitFor("document.body.innerText.includes('Posesión activa')")
  assert.equal(repo.getMatch(fixtures.basketball.id).possession, 'home')
  await click('Asignar posesión')
  await waitFor("Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Posesión activa').length === 1")
  await waitFor(`window.api.matches.get('${fixtures.basketball.id}').then(match => match.possession === 'away')`)
  assert.equal(repo.getMatch(fixtures.basketball.id).possession, 'away')
  assert.deepEqual(errors, [])
  fs.writeFileSync(resultFile, JSON.stringify({ status: 'passed', checks: ['screen-setup-ipc', 'tennis-point-undo', 'baseball-count', 'judo-finish-undo', 'athletics-entry-finish'], errors }))
}).catch(error => { fs.writeFileSync(resultFile, JSON.stringify({ status: 'failed', error: error.stack, errors })); process.exitCode = 1 }).finally(async () => { win?.destroy(); if (db) await db.closeDatabase(); app.exit(process.exitCode ?? 0) })
