/* Pruebas de la primera etapa: datos aislados, sin usar la base del operador. */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'marcador-core-'))
const cache = new Map()
const handlers = new Map()
let exportPath = path.join(temporary, 'project.json')
const electron = {
  ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
  BrowserWindow: { getAllWindows: () => [] },
  app: { getPath: () => temporary, getAppPath: () => root },
  dialog: {
    showSaveDialog: async () => ({ canceled: false, filePath: exportPath }),
    showOpenDialog: async () => ({ canceled: false, filePaths: [exportPath] }),
  },
}
let currentOverlay = null
let displayState = null
let stops = 0, played = null
const display = { getDisplayState: () => displayState, getOverlay: () => currentOverlay, playback: { play: (items, loop) => { played = { items, loop } }, stop: () => { stops += 1; currentOverlay = null } } }
function load(file) {
  const filename = path.resolve(root, file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const req = name => {
    if (name === '@/types') return load('src/types/index.ts')
    if (name === 'electron') return electron
    if (name === './display') return display
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')))
    return require(name)
  }
  new Function('require', 'module', 'exports', '__dirname', code)(req, module, module.exports, path.dirname(filename))
  return module.exports
}

async function run() {
  const shortcuts = load('src/utils/shortcuts.ts')
  assert.equal(shortcuts.normalizeShortcut('shift + control + q'), 'CTRL+SHIFT+Q')
  assert.equal(shortcuts.normalizeShortcut('espacio'), 'SPACE')
  assert.equal(shortcuts.validShortcut('CTRL+Q'), true)
  assert.equal(shortcuts.validShortcut('CTRL+'), false)
  const custom = [{ action: 'goal.home', keys: 'H', enabled: true }]
  assert.equal(shortcuts.activeShortcuts(custom).some(item => item.keys === 'Q'), false)
  assert.equal(shortcuts.activeShortcuts(custom).some(item => item.keys === 'H'), true)
  assert.equal(shortcuts.activeShortcuts([{ ...custom[0], enabled: false }]).some(item => item.keys === 'Q'), true)

  // Reloj simulado para probar orden, bucle, reemplazo y cancelación sin esperar.
  const realSetTimeout = global.setTimeout, realClearTimeout = global.clearTimeout
  const timers = new Map()
  let timerId = 0
  global.setTimeout = callback => { timers.set(++timerId, callback); return timerId }
  global.clearTimeout = id => timers.delete(id)
  try {
    const { PlaybackQueue } = load('electron/playback.ts')
    const emitted = []
    const queue = new PlaybackQueue(item => emitted.push(item?.text ?? null))
    const item = text => ({ kind: 'text', text, dataUrl: null, durationMs: 1000 })
    const tick = () => { const [id, callback] = timers.entries().next().value; timers.delete(id); callback() }
    queue.play([item('A'), item('B')], false)
    tick(); tick()
    assert.deepEqual(emitted, [null, 'A', 'B', null])
    queue.play([item('A'), item('B')], true)
    tick(); tick()
    assert.equal(emitted.at(-1), 'A')
    queue.play([item('C')], false)
    assert.equal(timers.size, 1)
    queue.stop()
    assert.equal(timers.size, 0)
    assert.throws(() => queue.play([], true))
    assert.throws(() => queue.play([{ ...item('X'), durationMs: 0 }], true))
  } finally { global.setTimeout = realSetTimeout; global.clearTimeout = realClearTimeout }

  const db = load('electron/db.ts')
  const repo = load('electron/repository.ts')
  await db.initDatabase()
  const examples = load('electron/examples.ts')
  const designs = load('src/features/design/designModel.ts')
  for (const create of [designs.fiba1Design, designs.fiba2Design]) {
    const design = create()
    const originalCount = designs.visibleDesignItems(design).length
    design.background = 'data:image/png;base64,example'
    design.backgroundColor = '#123456'
    const restored = designs.parseDesign(designs.serializeDesign(design))
    assert.equal(restored.backgroundColor, '#123456')
    assert.equal(designs.visibleDesignItems(restored).length, originalCount - 1)
    assert(designs.visibleDesignItems(restored).some(item => item.type === 'score_home'))
    restored.background = null
    assert.equal(designs.visibleDesignItems(restored).length, originalCount)
  }
  const originalCreatePlayer = repo.createPlayer
  repo.createPlayer = () => { throw new Error('Fallo simulado al crear plantilla') }
  assert.throws(() => examples.ensureExampleProjects('2026-10-14'), /Fallo simulado/)
  repo.createPlayer = originalCreatePlayer
  assert.equal(repo.listProjects().length, 0)
  assert.equal(repo.getSetting('examples.sports.v1'), null)
  examples.ensureExampleProjects('2026-10-14')
  const sampleProjects = repo.listProjects()
  assert.equal(sampleProjects.length, 3)
  for (const sample of sampleProjects) {
    const sampleTeams = repo.listTeams(sample.id)
    assert.equal(sampleTeams.length, 2)
    const [size, starters] = sample.sport === 'football' ? [18, 11] : sample.sport === 'futsal' ? [14, 5] : [12, 5]
    for (const sampleTeam of sampleTeams) {
      const squad = repo.listPlayersByTeam(sampleTeam.id)
      assert.equal(squad.length, size)
      assert.equal(squad.filter(p => p.isStarter).length, starters)
      assert.equal(new Set(squad.map(p => p.number)).size, size)
      assert(squad.every(p => p.firstName && p.lastName && p.position))
      assert(sampleTeam.logo.startsWith('data:image/svg+xml'))
    }
    const fixture = repo.listMatches(sample.id)
    assert.equal(fixture.length, 1)
    assert(sampleTeams.some(t => t.id === fixture[0].homeTeamId))
    assert(sampleTeams.some(t => t.id === fixture[0].awayTeamId))
    assert.equal(fixture[0].timerRunning, false)
    assert.equal(fixture[0].homeScore, 0)
    assert(repo.listOfficialsByMatch(fixture[0].id).length >= 3)
  }
  const editedTeam = repo.listTeams(sampleProjects[0].id)[0]
  repo.updateTeam(editedTeam.id, { name: 'Equipo editado' })
  const editedPlayer = repo.listPlayersByTeam(editedTeam.id)[0]
  repo.updatePlayer(editedPlayer.id, { firstName: 'Jugador editado' })
  await db.closeDatabase(); await db.initDatabase()
  examples.ensureExampleProjects('2026-10-15')
  assert.equal(repo.listProjects().length, 3)
  assert.equal(repo.getTeam(editedTeam.id).name, 'Equipo editado')
  assert.equal(repo.listPlayersByTeam(editedTeam.id).find(p => p.id === editedPlayer.id).firstName, 'Jugador editado')
  repo.deleteProject(sampleProjects[0].id)
  examples.ensureExampleProjects('2026-10-15')
  assert.equal(repo.listProjects().length, 2)
  const project = repo.createProject({ name: 'Prueba aislada', sport: 'basketball', season: '2026', location: '', date: '2026-10-08', modality: 'league' })
  const team = name => repo.createTeam({ projectId: project.id, name, shortName: name, code: '', logo: null, primaryColor: '#2563EB', secondaryColor: '#FFFFFF', city: '', country: '' })
  const home = team('Local'), away = team('Visita')
  const player = repo.createPlayer({ teamId: home.id, firstName: 'Ana', lastName: 'Pérez', number: 7, position: '', photo: null, isStarter: true })
  const match = repo.createMatch({ projectId: project.id, homeTeamId: home.id, awayTeamId: away.id, venue: '', kickoff: '2026-10-08T20:00', round: '', competition: '' })
  repo.adjustPlayerStat(match.id, player.id, 'points', 3)
  repo.adjustPlayerStat(match.id, player.id, 'points', 2)
  repo.adjustPlayerStat(match.id, player.id, 'fouls', 1)
  assert.deepEqual(repo.getMatch(match.id).playerStats[player.id], { points: 5, fouls: 1 })
  assert.equal(repo.getMatch(match.id).homeScore, 5)
  assert.equal(repo.getMatch(match.id).awayScore, 0)
  const visitingPlayer = repo.createPlayer({ teamId: away.id, firstName: 'Luis', lastName: 'Soto', number: 8, position: 'Base', photo: null, isStarter: true })
  repo.adjustPlayerStat(match.id, visitingPlayer.id, 'points', 3)
  assert.equal(repo.getMatch(match.id).awayScore, 3)
  repo.adjustPlayerStat(match.id, visitingPlayer.id, 'points', -2)
  assert.equal(repo.getMatch(match.id).awayScore, 1)
  repo.adjustPlayerStat(match.id, visitingPlayer.id, 'points', -3)
  assert.equal(repo.getMatch(match.id).awayScore, 0)
  repo.adjustPlayerStat(match.id, visitingPlayer.id, 'points', -1)
  assert.equal(repo.getMatch(match.id).awayScore, 0)
  assert.equal(match.period, 'first_quarter')
  repo.updateMatch(match.id, { possession: 'home' })
  repo.updateMatch(match.id, { gameDurationMs: 630000, timeoutActive: true })
  assert.throws(() => repo.updateMatch(match.id, { possession: 'invalid' }))
  assert.throws(() => repo.adjustPlayerStat(match.id, 'missing', 'points', 1))
  assert.throws(() => repo.adjustPlayerStat(match.id, player.id, 'points', NaN))
  await db.closeDatabase(); await db.initDatabase()
  assert.equal(repo.getMatch(match.id).playerStats[player.id].points, 5)
  assert.equal(repo.getMatch(match.id).homeScore, 5)
  assert.equal(repo.getMatch(match.id).possession, 'home')
  assert.equal(repo.getMatch(match.id).gameDurationMs, 630000)
  assert.equal(repo.getMatch(match.id).timeoutActive, true)
  await repo.exportProject(project.id)
  const imported = await repo.importProject()
  assert.equal(imported.ok, true)
  const importedPlayer = repo.listPlayersByTeam(repo.listTeams(imported.project.id).find(team => team.name === 'Local').id)[0]
  assert.deepEqual(repo.listMatches(imported.project.id)[0].playerStats[importedPlayer.id], { points: 5, fouls: 1 })
  assert.equal(repo.listMatches(imported.project.id)[0].possession, 'home')
  assert.equal(repo.listMatches(imported.project.id)[0].gameDurationMs, 630000)
  assert.equal(repo.listMatches(imported.project.id)[0].timeoutActive, true)
  assert.equal(repo.listMatches(imported.project.id)[0].homeScore, 5)
  const binding = repo.createShortcut({ action: 'goal.home', keys: 'control + h', enabled: true })
  assert.equal(binding.keys, 'CTRL+H')
  assert.throws(() => repo.createShortcut({ action: 'goal.away', keys: 'CTRL+H', enabled: true }))
  assert.equal(repo.updateShortcut(binding.id, { enabled: false }).enabled, false)

  const sportProject = repo.createProject({ name: 'Tennis', sport: 'tennis', season: '2026', location: '', date: '2026-10-08', modality: 'league' })
  const sh = repo.createTeam({ ...home, projectId: sportProject.id, name: 'A' })
  const sa = repo.createTeam({ ...away, projectId: sportProject.id, name: 'B' })
  const sm = repo.createMatch({ projectId: sportProject.id, homeTeamId: sh.id, awayTeamId: sa.id, venue: '', kickoff: '2026-10-08T20:00', round: '', competition: '' })
  assert.equal(sm.sportState.family, 'tennis')
  repo.sportAction(sm.id, { type: 'point', side: 'home' })
  repo.sportAction(sm.id, { type: 'point', side: 'away' })
  await db.closeDatabase(); await db.initDatabase()
  assert.deepEqual(repo.getMatch(sm.id).sportState.current.points, [1, 1])
  repo.sportAction(sm.id, { type: 'undo' }); assert.deepEqual(repo.getMatch(sm.id).sportState.current.points, [1, 0])
  await repo.exportProject(sportProject.id)
  const sportImport = await repo.importProject(); assert.equal(sportImport.ok, true)
  assert.deepEqual(repo.listMatches(sportImport.project.id)[0].sportState.current.points, [1, 0])
  assert.equal(repo.listMatches(sportImport.project.id)[0].sportState.history.length, 1)
  const videoPath = path.join(temporary, 'fixture.webm')
  fs.writeFileSync(videoPath, Buffer.from([1, 2, 3, 4, 5, 6]))
  const video = repo.createVideo({ projectId: project.id, name: 'Fixture', src: pathToFileURL(videoPath).href, duration: 1 })
  const server = load('electron/obsServer.ts')
  const result = await server.startServer(0)
  assert.equal(result.ok, true)
  try {
    load('electron/ipc.ts').registerIpcHandlers()
    const invoke = (name, ...args) => handlers.get(name)(null, ...args)
    const first = repo.createMedia({ projectId: project.id, name: 'Primero', kind: 'text', data: 'A', duration: 2 })
    const second = repo.createMedia({ projectId: project.id, name: 'Segundo', kind: 'image', data: 'data:image/png;base64,AA==', duration: 2 })
    const sequence = repo.createScheduledSequence({ projectId: project.id, name: 'Lista', itemIds: [second.id, first.id], intervalSec: 3, loop: false })
    await invoke('display:playContent', 'sequence', sequence.id)
    assert.equal(played.loop, false)
    assert.deepEqual(played.items.map(item => item.kind), ['image', 'text'])
    assert.equal(played.items[1].text, 'A')
    assert.equal(played.items[0].durationMs, 3000)
    const sponsor = repo.createSponsorRotation({ projectId: project.id, name: 'Sponsors', imageIds: [second.id], intervalSec: 4, active: false })
    await invoke('display:playContent', 'sponsor', sponsor.id)
    assert.equal(played.loop, true)
    assert.equal(played.items[0].sourceKind, 'sponsor')
    await invoke('display:playContent', 'video', video.id)
    assert.equal(played.items[0].videoId, video.id)
    assert.equal(played.items[0].dataUrl, result.url + 'video/' + video.id)
    const delayedVideo = invoke('display:playContent', 'video', video.id)
    await invoke('display:playContent', 'sponsor', sponsor.id)
    await delayedVideo
    assert.equal(played.items[0].sourceKind, 'sponsor')
    repo.deleteMedia(first.id)
    await assert.rejects(() => invoke('display:playContent', 'sequence', sequence.id))
    const html = await fetch(result.url).then(res => res.text())
    assert.match(html, /bridge\.js/)
    const asset = html.match(/src="([^"]*assets\/[^"]+\.js)"/)[1]
    assert.equal((await fetch(new URL(asset, result.url))).status, 200)
    const bridge = await fetch(new URL('bridge.js', result.url)).then(res => res.text())
    new Function(bridge)
    const range = await fetch(new URL('video/' + video.id, result.url), { headers: { Range: 'bytes=1-3' } })
    assert.equal(range.status, 206)
    assert.equal(range.headers.get('content-range'), 'bytes 1-3/6')
    assert.deepEqual([...new Uint8Array(await range.arrayBuffer())], [2, 3, 4])
    assert.equal((await fetch(new URL('video/' + video.id, result.url), { headers: { Range: 'bytes=99-' } })).status, 416)
    displayState = { matchId: 'test', timer: { running: false, elapsed: 6000000 } }
    currentOverlay = { id: 'current', kind: 'image', durationMs: 1000 }
    const controller = new AbortController()
    const response = await fetch(new URL('events', result.url), { signal: controller.signal })
    const reader = response.body.getReader()
    const initial = new TextDecoder().decode((await reader.read()).value)
    assert.match(initial, /event: state/)
    assert.match(initial, /event: overlay/)
    server.pushOverlayToClients(null)
    assert.match(new TextDecoder().decode((await reader.read()).value), /data: null/)
    controller.abort()
    await fetch(new URL('finished/stale', result.url), { method: 'POST' })
    assert.equal(stops, 0)
    await fetch(new URL('finished/current', result.url), { method: 'POST' })
    assert.equal(stops, 1)
    currentOverlay = { id: 'list', sourceKind: 'sponsor', sourceId: sponsor.id }
    await invoke('sponsors:remove', sponsor.id)
    assert.equal(stops, 2)
  } finally { server.stopServer() }
  console.log('OK: reproducción, reemplazo, bucle, detener; atajos; SQLite y reimportación de estadísticas; OBS, SSE y video por rangos.')
  await db.closeDatabase()
}

run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  for (const name of ['marcador.db', 'marcador.db.tmp', 'project.json', 'fixture.webm']) {
    const target = path.join(temporary, name)
    if (fs.existsSync(target)) fs.unlinkSync(target)
  }
  try { fs.rmdirSync(temporary) } catch { /* conservar diagnóstico si quedan archivos */ }
})
