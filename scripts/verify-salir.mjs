/**
 * Regresión: "Salir" del panel de control con un partido activo.
 *
 * Antes del arreglo, el efecto de arranque de App.tsx dependía de `navigate`,
 * que cambia de identidad en cada navegación; cada salida al control volvía a
 * ejecutar `restoreActive()` y reemplazaba la ruta por la del partido, así que
 * el botón "Salir" parecía no hacer nada.
 *
 * Verifica:
 *  1) Arranque (reload) con partido activo → aterriza en el panel de control.
 *  2) Clic REAL en "Salir" → permanece en Partidos (sin rebote).
 *  3) /scoreboard con partido activo → la redirección prevista sigue activa.
 *  4) Sin errores de consola; datos temporales borrados y activeMatchId original restaurado.
 *
 * Requiere dev con depuración: MP_DEBUG_PORT=9222 npm run dev
 */
const PORT = process.env.MP_DEBUG_PORT || '9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
    this.errors = []
  }

  async connect() {
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
        msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result)
        return
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails
        this.errors.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`)
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push(`[console.error] ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (res.exceptionDetails) {
      throw new Error(`evaluate: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`)
    }
    return res.result.value
  }

  async realClick(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await sleep(60)
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* noop */
    }
  }
}

async function waitForTarget(matcher, timeoutMs = 40000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const found = (await res.json()).find(matcher)
      if (found) return found
    } catch {
      /* reintenta */
    }
    await sleep(300)
  }
  return null
}

let pass = 0
let fail = 0
const check = (ok, label) => {
  ok ? pass++ : fail++
  console.log(`${ok ? 'OK ' : 'FALLA'}  ${label}`)
}

async function main() {
  const target = await waitForTarget((x) => x.type === 'page' && /localhost:\d+\/index\.html/.test(x.url))
  if (!target) {
    throw new Error(`Sin ventana de control en el puerto ${PORT}. Arranca: MP_DEBUG_PORT=${PORT} npm run dev`)
  }
  const cdp = new Cdp(target.webSocketDebuggerUrl)
  await cdp.connect()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  // Estado original del usuario: se restaura al final (la suite no debe tocarlo).
  const originalActiveId = await cdp.evaluate(`window.api.settings.get('activeMatchId')`)

  // Limpieza de restos de ejecuciones anteriores de esta misma suite.
  const leftovers = await cdp.evaluate(`
    (async () => {
      const projects = await window.api.projects.list()
      const dbg = projects.filter((p) => p.name.startsWith('VERIFY SALIR '))
      for (const p of dbg) await window.api.projects.remove(p.id)
      return dbg.length
    })()
  `)
  if (leftovers) console.log(`(restos anteriores eliminados: ${leftovers})`)

  console.log('1. Creando partido activo temporal…')
  const setup = await cdp.evaluate(`
    (async () => {
      const api = window.api
      const project = await api.projects.create({
        name: 'VERIFY SALIR ' + Date.now(), sport: 'football', season: '2026',
        location: '', date: '2026-10-05', modality: 'league',
      })
      const home = await api.teams.create({ projectId: project.id, name: 'A', shortName: 'AAA', code: 'AAA', logo: null, primaryColor: '#2563EB', secondaryColor: '#FFFFFF', city: '', country: '' })
      const away = await api.teams.create({ projectId: project.id, name: 'B', shortName: 'BBB', code: 'BBB', logo: null, primaryColor: '#EF4444', secondaryColor: '#FFFFFF', city: '', country: '' })
      const match = await api.matches.create({ projectId: project.id, homeTeamId: home.id, awayTeamId: away.id, venue: '', kickoff: '2026-10-05T18:00', round: '', competition: '' })
      await api.settings.set('activeMatchId', match.id)
      return { project: project.id, match: match.id }
    })()
  `)

  cdp.errors.length = 0
  console.log('2. Recargando (arranque con partido activo)…')
  await cdp.send('Page.reload')
  await sleep(4500)
  const bootHash = await cdp.evaluate(`location.hash`)
  check(bootHash.includes(`/control/${setup.match}`), 'el arranque aterriza en el panel de control del partido activo')

  console.log('3. Clic real en "Salir"…')
  const point = await cdp.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Salir'))
      if (!btn) return null
      const r = btn.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })()
  `)
  if (!point) throw new Error('No se encontró el botón "Salir"')
  await cdp.realClick(point.x, point.y)
  await sleep(2000)
  const after = await cdp.evaluate(`({
    hash: location.hash,
    body: document.body.innerText.slice(0, 300).replace(/\\n/g, ' | '),
  })`)
  check(after.hash === `#/p/${setup.project}/matches`, '"Salir" permanece en /matches (sin rebote al control)')
  check(/Partidos/i.test(after.body) && !/CRÓMETRO|CRONÓMETRO/i.test(after.body), 'la página mostrada es Partidos, no el panel de control')

  console.log('4. Comprobando la redirección prevista de /scoreboard…')
  await cdp.evaluate(`location.hash = ${JSON.stringify(`#/p/${setup.project}/scoreboard`)}`)
  await sleep(2000)
  const scoreboardHash = await cdp.evaluate(`location.hash`)
  check(scoreboardHash.includes(`/control/${setup.match}`), '/scoreboard con partido activo redirige al control (previsto)')

  console.log('5. Limpiando datos temporales…')
  await cdp.evaluate(`
    (async () => {
      await window.api.settings.set('activeMatchId', ${JSON.stringify(originalActiveId ?? '')})
      await window.api.projects.remove(${JSON.stringify(setup.project)})
      await window.api.display.sync(null)
      location.hash = '#/'
    })()
  `)
  await sleep(800)

  const finalState = await cdp.evaluate(`
    (async () => {
      const active = await window.api.settings.get('activeMatchId')
      const projects = await window.api.projects.list()
      return { active, junk: projects.filter((p) => p.name.startsWith('VERIFY SALIR ')).length }
    })()
  `)
  // `settings.get` normaliza '' como null, así que se compara con la misma tolerancia.
  check(
    (finalState.active ?? '') === (originalActiveId ?? ''),
    `activeMatchId original restaurado (${String(originalActiveId).slice(0, 8) || "''"}…)`,
  )
  check(finalState.junk === 0, 'sin proyectos temporales residuales')
  check(cdp.errors.length === 0, `sin errores de consola${cdp.errors.length ? `: ${cdp.errors.slice(0, 5).join(' | ')}` : ''}`)

  cdp.close()
  console.log(`\n${pass}/${pass + fail} comprobaciones OK${fail ? ` — ${fail} FALLAS` : ''}`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('FALLO:', e)
  process.exit(1)
})
