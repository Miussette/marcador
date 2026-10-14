/**
 * Smoke test visual (solo desarrollo).
 *
 * Arranca la app con:  MP_DEBUG_PORT=9222 npm run dev
 * Lanza este script:   node scripts/smoke.mjs
 *
 * Usa Chrome DevTools Protocol sobre el puerto de depuración de Electron para:
 *  - recoger errores de consola/excepciones del renderer,
 *  - crear datos reales a través de window.api (sin mocks),
 *  - navegar por la interfaz y guardar capturas en scripts/shots/.
 */
import fs from 'node:fs'
import path from 'node:path'

const PORT = process.env.MP_DEBUG_PORT || '9222'
const OUT_DIR = path.join(process.cwd(), 'scripts', 'shots')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

fs.mkdirSync(OUT_DIR, { recursive: true })

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

async function waitForTarget(matcher, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const targets = await listTargets()
    const found = targets.find(matcher)
    if (found) return found
    await sleep(300)
  }
  throw new Error('No se encontró el target de DevTools: ' + matcher.toString())
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.id = 0
    this.pending = new Map()
    this.errors = []
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id) {
        const entry = this.pending.get(msg.id)
        if (!entry) return
        this.pending.delete(msg.id)
        if (msg.error) entry.reject(new Error(msg.error.message))
        else entry.resolve(msg.result)
        return
      }
      this.handleEvent(msg)
    })
  }

  handleEvent(msg) {
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      this.errors.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`)
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type
      if (type === 'error' || type === 'warning') {
        this.errors.push(`[console.${type}] ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`)
      }
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry
      if (e.level === 'error') this.errors.push(`[log] ${e.text} ${e.url ?? ''}`)
    }
  }

  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      awaitPromiseTimeout: 20000,
    })
    if (res.exceptionDetails) {
      throw new Error(`evaluate: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`)
    }
    return res.result.value
  }

  async shot(name) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
    const file = path.join(OUT_DIR, `${name}.png`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(`  · captura: ${file}`)
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* noop */
    }
  }
}

async function connectTo(target) {
  const client = new CdpClient(target.webSocketDebuggerUrl)
  await client.connect()
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Log.enable')
  return client
}

const results = []
const check = (label, value) => {
  results.push(`${value ? 'OK ' : 'FAIL'} ${label}`)
  console.log(`${value ? 'OK ' : 'FAIL'} ${label}`)
}

async function main() {
  console.log('1. Conectando a la ventana de control…')
  const controlTarget = await waitForTarget(
    (t) => t.type === 'page' && /localhost:\d+\/index\.html/.test(t.url),
    30000,
  )
  const control = await connectTo(controlTarget)
  // Preservar el partido activo original del usuario: la suite crea datos propios
  // y no debe alterar el estado de "reanudar al abrir" de quien usa la app.
  const originalActiveId = await control.evaluate(`window.api.settings.get('activeMatchId')`)
  // Recarga para trabajar con los módulos más recientes (HMR) y un arranque limpio.
  await control.send('Page.reload')
  await sleep(2500)

  await control.shot('01-projects-empty')

  console.log('2. Creando proyecto, equipos, jugadores y partido…')
  const data = await control.evaluate(`
    (async () => {
      const api = window.api
      const project = await api.projects.create({
        name: 'Copa Demo 2026',
        sport: 'football',
        season: '2026',
        location: 'Estadio Central',
        date: '2026-10-02',
        modality: 'cup',
      })
      const home = await api.teams.create({
        projectId: project.id, name: 'Atlético Norte', shortName: 'NOR', code: 'NOR',
        logo: null, primaryColor: '#DC2626', secondaryColor: '#FFFFFF',
        city: 'Bilbao', country: 'España',
      })
      const away = await api.teams.create({
        projectId: project.id, name: 'Deportivo Sur', shortName: 'SUR', code: 'SUR',
        logo: null, primaryColor: '#2563EB', secondaryColor: '#F8FAFC',
        city: 'Sevilla', country: 'España',
      })
      for (const [teamId, base] of [[home.id, 1], [away.id, 11]]) {
        for (let i = 0; i < 4; i++) {
          await api.players.create({
            teamId, firstName: 'Jugador ' + (base + i), lastName: 'Equipo',
            number: base + i, position: i === 0 ? 'Portero' : 'Delantero',
            photo: null, isStarter: i < 3,
          })
        }
      }
      const match = await api.matches.create({
        projectId: project.id, homeTeamId: home.id, awayTeamId: away.id,
        venue: 'Estadio Central', kickoff: '2026-10-02T20:00',
        round: 'Semifinal', competition: 'Copa Demo 2026',
      })
      return { projectId: project.id, matchId: match.id }
    })()
  `)
  check('crear proyecto/equipos/jugadores/partido', Boolean(data?.projectId && data?.matchId))

  await control.evaluate(`location.hash = '#/p/${data.projectId}'`)
  // Espera activa: la navegación incluye un reintento de carga del proyecto.
  let dashState = null
  let lastDash = null
  for (let i = 0; i < 15 && !dashState; i++) {
    await sleep(400)
    lastDash = await control.evaluate(`
      ({
        hash: location.hash,
        toasts: document.querySelectorAll('[aria-label="Cerrar aviso"]').length,
        ok: /dashboard|resumen/i.test(document.body.innerText) || Boolean(document.querySelector('nav')),
      })
    `)
    if (lastDash.hash === `#/p/${data.projectId}` && lastDash.ok && lastDash.toasts === 0) dashState = lastDash
  }
  if (!dashState) console.log('  · debug dashboard:', JSON.stringify(lastDash))
  check('dashboard accesible sin rebote', Boolean(dashState))
  check('sin avisos de error al navegar', Boolean(dashState && dashState.toasts === 0))
  await control.shot('02-dashboard')

  await control.evaluate(`location.hash = '#/p/${data.projectId}/teams'`)
  await sleep(1200)
  await control.shot('03-teams')

  await control.evaluate(`location.hash = '#/p/${data.projectId}/players'`)
  await sleep(1200)
  await control.shot('04-players')

  await control.evaluate(`location.hash = '#/p/${data.projectId}/matches'`)
  await sleep(1200)
  await control.shot('05-matches')

  console.log('3. Abriendo el panel de control…')
  await control.evaluate(`location.hash = '#/p/${data.projectId}/control/${data.matchId}'`)
  await sleep(2000)
  const controlOk = await control.evaluate(`/gol local/i.test(document.body.innerText)`)
  check('panel de control renderizado', controlOk)
  await control.shot('06-control')

  console.log('4. Disparando atajos (Q, P, ESPACIO)…')
  await control.evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', code: 'KeyQ', bubbles: true }))
  `)
  await sleep(400)
  await control.evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', bubbles: true }))
  `)
  await sleep(400)
  await control.evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))
  `)
  await sleep(1800)

  const score = await control.evaluate(`window.api.matches.get('${data.matchId}')`)
  check('marcador 1:1 tras atajos Q/P (persistido)', score.homeScore === 1 && score.awayScore === 1)
  if (score.timerRunning !== true) console.log('  · debug cronómetro:', JSON.stringify(score))
  check('cronómetro en marcha tras ESPACIO (persistido)', score.timerRunning === true)
  const scoreUi = await control.evaluate(`/cron[oó]metro en marcha/i.test(document.body.innerText)`)
  check('estado del cronómetro visible en la UI', scoreUi)
  await control.shot('07-control-live')

  console.log('5. Abriendo la ventana Display…')
  const opened = await control.evaluate(`window.api.display.open().then(r => r.ok)`)
  check('ventana display abierta', opened)
  await sleep(2500)

  const displayTarget = await waitForTarget(
    (t) => t.type === 'page' && /localhost:\d+\/display\.html/.test(t.url),
    15000,
  ).catch(() => null)

  let display = null
  if (displayTarget) {
    display = await connectTo(displayTarget)
    await sleep(600)
    const waiting = await display.evaluate(`document.body.innerText.includes('Esperando partido') || document.body.innerText.includes('ATLÉTICO') || document.body.innerText.includes('Atlético')`)
    check('display renderizando (no vacío)', waiting)
    await display.shot('08-display-broadcast')
  }

  console.log('6. Cambiando layouts del marcador…')
  for (const layout of ['classic', 'modern', 'minimal']) {
    await control.evaluate(`window.api.settings.set('scoreboard.layout', '${layout}')`)
    await sleep(900)
    if (display) await display.shot(`09-display-${layout}`)
  }
  await control.evaluate(`window.api.settings.set('scoreboard.layout', 'broadcast')`)
  await sleep(600)

  console.log('7. Enviando overlay de gol…')
  if (display) {
    await control.evaluate(
      `window.api.display.overlay({ kind: 'text', text: '¡GOOOL!', dataUrl: null, durationMs: 4000 })`,
    )
    await sleep(700)
    await display.shot('10-display-overlay')
  }

  console.log('8. Comprobando autoguardado / recuperación…')
  const persisted = await control.evaluate(`
    window.api.matches.get('${data.matchId}').then(m => ({ h: m.homeScore, a: m.awayScore, running: m.timerRunning }))
  `)
  check('partido persistido con marcador 1:1', persisted.h === 1 && persisted.a === 1)
  check('estado de cronómetro persistido', persisted.running === true)

  const activeId = await control.evaluate(`window.api.settings.get('activeMatchId')`)
  check('partido activo registrado para recuperación', activeId === data.matchId)

  console.log('9. Limpiando datos de prueba…')
  const cleaned = await control.evaluate(`window.api.projects.remove('${data.projectId}').then(() => true)`)
  check('datos de prueba eliminados', cleaned)
  await control.evaluate(
    `window.api.settings.set('activeMatchId', ${JSON.stringify(originalActiveId ?? '')})`,
  )

  if (display) {
    await control.evaluate(`window.api.display.close()`)
    display.close()
  }
  control.close()

  console.log('\n--- Resultados ---')
  for (const line of results) console.log(line)
  if (control.errors.length) {
    console.log('\n--- Errores de consola capturados ---')
    for (const e of control.errors) console.log(e)
  } else {
    console.log('\nSin errores de consola en el renderer.')
  }
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err)
  process.exit(1)
})
