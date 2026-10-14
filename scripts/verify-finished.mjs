/**
 * Regresión: partido "Finalizado" no debe seguir "grabándose".
 *
 * Cubre:
 *  1) Auto-sanidad al abrir: finished + cronómetro en marcha → se congela
 *     (la BD deja de contar, el tiempo total queda congelado).
 *  2) UI: "Reanudar" deshabilitado + aviso de bloqueo en el panel.
 *  3) Atajo ESPACIO sobre partido finalizado → no arranca (muestra aviso).
 *  4) Reabrir ("En juego") → el cronómetro vuelve a funcionar.
 *  5) Volver a "Finalizado" → detiene el cronómetro.
 *  6) Sin errores de consola; datos temporales borrados y activeMatchId original restaurado.
 *
 * Requiere dev con depuración: MP_DEBUG_PORT=9222 npm run dev
 */
const PORT = process.env.MP_DEBUG_PORT || '9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HOUR = 3_600_000

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

  async pressSpace() {
    const params = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...params })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
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

const readMatch = (id) => `window.api.matches.get(${JSON.stringify(id)}).then((m) => ({
  status: m.status, period: m.period, timerRunning: m.timerRunning,
  timerStartedAt: m.timerStartedAt, timerElapsed: m.timerElapsed,
}))`

const buttonState = (label) => `
  (() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { disabled: btn.disabled, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })()
`

async function main() {
  const target = await waitForTarget((x) => x.type === 'page' && /localhost:\d+\/index\.html/.test(x.url))
  if (!target) {
    throw new Error(`Sin ventana de control en el puerto ${PORT}. Arranca: MP_DEBUG_PORT=${PORT} npm run dev`)
  }
  const cdp = new Cdp(target.webSocketDebuggerUrl)
  await cdp.connect()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const originalActiveId = await cdp.evaluate(`window.api.settings.get('activeMatchId')`)

  // Limpieza de restos de ejecuciones anteriores.
  const leftovers = await cdp.evaluate(`
    (async () => {
      const projects = await window.api.projects.list()
      const dbg = projects.filter((p) => p.name.startsWith('VERIFY FINISHED '))
      for (const p of dbg) await window.api.projects.remove(p.id)
      return dbg.length
    })()
  `)
  if (leftovers) console.log(`(restos anteriores eliminados: ${leftovers})`)

  console.log('1. Creando partido finalizado con el cronómetro "colgado" (72 h)…')
  const setup = await cdp.evaluate(`
    (async () => {
      const api = window.api
      const project = await api.projects.create({
        name: 'VERIFY FINISHED ' + Date.now(), sport: 'football', season: '2026',
        location: '', date: '2026-10-05', modality: 'league',
      })
      const home = await api.teams.create({ projectId: project.id, name: 'A', shortName: 'AAA', code: 'AAA', logo: null, primaryColor: '#2563EB', secondaryColor: '#FFFFFF', city: '', country: '' })
      const away = await api.teams.create({ projectId: project.id, name: 'B', shortName: 'BBB', code: 'BBB', logo: null, primaryColor: '#EF4444', secondaryColor: '#FFFFFF', city: '', country: '' })
      const match = await api.matches.create({ projectId: project.id, homeTeamId: home.id, awayTeamId: away.id, venue: '', kickoff: '2026-10-05T18:00', round: '', competition: '' })
      // Estado defectuoso equivalente al reportado: finalizado pero "grabando".
      await api.matches.update(match.id, {
        status: 'finished', period: 'finished',
        timerRunning: true, timerStartedAt: Date.now() - 72 * 3600000, timerElapsed: 0,
      })
      await api.settings.set('activeMatchId', match.id)
      return { project: project.id, match: match.id }
    })()
  `)

  cdp.errors.length = 0
  console.log('2. Abriendo el panel de control (arranque)…')
  await cdp.send('Page.reload')
  await sleep(4500)

  const onControl = (await cdp.evaluate(`location.hash`)).includes(`/control/${setup.match}`)
  check(onControl, 'el arranque aterriza en el partido activo')

  // 1) Auto-sanidad
  const healed = await cdp.evaluate(readMatch(setup.match))
  const expected72h = 72 * HOUR
  check(healed.timerRunning === false, 'auto-sanidad: el cronómetro se congeló al abrir (timerRunning=false)')
  check(healed.timerStartedAt === null, 'auto-sanidad: timerStartedAt limpiado')
  check(
    Math.abs(healed.timerElapsed - expected72h) < 10 * 60_000,
    `auto-sanidad: el tiempo congelado ≈ 72 h (obtenido ${(healed.timerElapsed / HOUR).toFixed(1)} h)`,
  )

  // 2) UI bloqueada (label-muted aplica text-transform: uppercase → comparar en minúsculas)
  const ui = await cdp.evaluate(`({
    stoppedLabel: document.body.innerText.toLowerCase().includes('cronómetro detenido'),
    hint: document.body.innerText.includes('el cronómetro está bloqueado'),
  })`)
  check(ui.stoppedLabel, 'UI: etiqueta "Cronómetro detenido"')
  check(ui.hint, 'UI: aviso "el cronómetro está bloqueado" visible')
  const btn = await cdp.evaluate(buttonState('Reanudar'))
  check(btn !== null && btn.disabled, 'UI: botón "Reanudar" deshabilitado en partido finalizado')

  // 3) ESPACIO sobre partido finalizado → no arranca
  console.log('3. Pulsando ESPACIO (atajo) sobre el partido finalizado…')
  await cdp.pressSpace()
  await sleep(900)
  const afterSpace = await cdp.evaluate(readMatch(setup.match))
  check(afterSpace.timerRunning === false, 'ESPACIO: no arranca el cronómetro de un partido finalizado')
  const toastShown = await cdp.evaluate(`document.body.innerText.includes('cambia el estado')`)
  check(toastShown, 'ESPACIO: muestra el aviso "cambia el estado…"')

  // 4) Reabrir ("En juego") → el cronómetro vuelve a funcionar
  console.log('4. Reabriendo el partido ("En juego")…')
  await cdp.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'En juego')
      if (btn) btn.click()
      return Boolean(btn)
    })()
  `)
  await sleep(900)
  const reopened = await cdp.evaluate(readMatch(setup.match))
  check(reopened.status === 'live', 'reabrir: estado "En juego" aplicado')
  const btn2 = await cdp.evaluate(buttonState('Reanudar'))
  check(btn2 !== null && !btn2.disabled, 'reabrir: botón "Reanudar" habilitado')
  if (btn2) {
    await cdp.realClick(btn2.x, btn2.y)
    await sleep(900)
  }
  const running = await cdp.evaluate(readMatch(setup.match))
  check(running.timerRunning === true, 'reabrir: el cronómetro vuelve a correr al operador autorizado')

  // 5) Volver a "Finalizado" → detiene
  console.log('5. Marcando "Finalizado" de nuevo…')
  // Ojo: "Finalizado" existe también como botón de Periodo; se busca dentro
  // del bloque "Estado del partido" para clicar el de ESTADO.
  const statusClicked = await cdp.evaluate(`
    (() => {
      const label = [...document.querySelectorAll('p')].find((p) => p.textContent.includes('Estado del partido'))
      if (!label) return false
      const btn = [...label.parentElement.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Finalizado')
      if (!btn) return false
      btn.click()
      return true
    })()
  `)
  check(statusClicked, 'finalizar: se clicó el botón de estado "Finalizado"')
  await sleep(900)
  const refinished = await cdp.evaluate(readMatch(setup.match))
  check(refinished.status === 'finished', 'finalizar: estado "finished" aplicado')
  check(refinished.timerRunning === false, 'finalizar: el cronómetro se detiene')

  // 6) Limpieza
  console.log('6. Limpiando datos temporales…')
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
      return { active, junk: projects.filter((p) => p.name.startsWith('VERIFY FINISHED ')).length }
    })()
  `)
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
