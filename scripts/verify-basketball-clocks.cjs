const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..'), cache = new Map()
let current, now = 100000, horns = 0
const toast = { error: error => { throw error }, info() {}, success() {} }
const mocks = {
  'src/services/api.ts': { api: { matches: { update: async (_id, patch) => { current = { ...current, ...patch }; return structuredClone(current) } } } },
  'src/services/displaySync.ts': { buildDisplayState: () => null, pushDisplayState: async () => {} },
  'src/features/serial/hornSound.ts': { signalHorn: async () => { horns++ } },
  'src/stores/toastStore.ts': { toast },
  'src/stores/playersStore.ts': { usePlayersStore: { getState: () => ({ playersByTeam: {} }) } },
  'src/stores/countdownStore.ts': { useCountdownStore: { getState: () => ({ initialized: false }) } },
  'src/stores/matchesStore.ts': { useMatchesStore: { getState: () => ({ matches: [] }), setState() {} } },
  'src/stores/settingsStore.ts': { useSettingsStore: { getState: () => ({ get: () => 'false' }) } },
}
function load(file) {
  const filename = path.resolve(root, file), relative = path.relative(root, filename).replaceAll('\\', '/')
  if (mocks[relative]) return mocks[relative]
  if (cache.has(filename)) return cache.get(filename).exports
  const m = { exports: {} }; cache.set(filename, m)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name)
    const base = name.startsWith('@/') ? path.resolve(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name)
    return load([base + '.ts', path.join(base, 'index.ts')].find(p => fs.existsSync(p)))
  }, m, m.exports)
  return m.exports
}
async function run() {
  const realNow = Date.now
  Date.now = () => now
  try {
    const clocks = load('src/features/timer/basketballClocks.ts'), timer = load('src/features/timer/timer.ts')
    const store = load('src/stores/activeMatchStore.ts').useActiveMatchStore
    current = { id: 'game', projectId: 'p', period: 'first_quarter', status: 'scheduled', timerRunning: false, timerStartedAt: null, timerElapsed: 0, homeTimeouts: 0, awayTimeouts: 0, shotClock: null, breakTimer: null }
    store.setState({ match: current, project: { sport: 'basketball' }, home: null, away: null })
    assert.equal(clocks.basketballRemaining(current), 600000)
    await store.getState().startClock()
    assert(current.timerRunning && current.shotClock.running)
    now += 5000
    await store.getState().pauseClock()
    assert.equal(current.timerElapsed, 5000)
    assert.equal(current.shotClock.remainingMs, 19000)
    await store.getState().resumeClock()
    await store.getState().setShotClock(timer.createDownTimer(14000))
    assert.equal(current.timerRunning, true)
    assert.equal(current.shotClock.running, false)
    now += 2000
    await store.getState().adjustTimeouts('home', 1)
    assert.equal(current.timerRunning, false)
    assert.equal(current.timerElapsed, 7000)
    assert.equal(current.shotClock.remainingMs, 14000)
    assert(current.timeoutActive && current.breakTimer.running)
    assert.equal(horns, 1)
    now += 60000
    await store.getState().expireBasketballClocks()
    assert.equal(current.timeoutActive, false)
    assert.equal(current.breakTimer.running, false)
    assert.equal(horns, 2)
    await store.getState().expireBasketballClocks()
    assert.equal(horns, 2)
    await store.getState().resumeClock()
    assert.equal(current.timerElapsed, 7000)
    assert.equal(current.shotClock.running, true)
    now += 14000
    await store.getState().expireBasketballClocks()
    assert.equal(current.timerRunning, false)
    assert.equal(current.shotClock.remainingMs, 0)
    assert.equal(horns, 3)
    await store.getState().resetClock()
    assert.equal(current.timerElapsed, 0)
    assert.equal(current.shotClock.remainingMs, 24000)
    await store.getState().setPeriod('extra_time')
    assert.equal(clocks.basketballRemaining(current), 300000)
    await store.getState().adjustClock(60000)
    assert.equal(clocks.basketballRemaining(current), 360000)
    await store.getState().startClock()
    await store.getState().setShotClock(timer.createDownTimer(24000))
    now += 360000
    await store.getState().expireBasketballClocks()
    assert.equal(clocks.basketballRemaining(current), 0)
    assert.equal(horns, 4)
    await store.getState().expireBasketballClocks()
    assert.equal(horns, 4)
    for (const ms of [30000, 60000, 90000]) {
      await store.getState().setBreakTimer(timer.startDownTimer(timer.createDownTimer(ms)))
      assert(current.timeoutActive && !current.timerRunning && !current.shotClock.running)
      await store.getState().endTimeout()
      assert.equal(current.timeoutActive, false)
    }
    console.log('Básquet: descenso, coordinación, independencia de 24s, tiempo muerto, expiración, bocina única y duraciones verificados')
  } finally { Date.now = realNow }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
