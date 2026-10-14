/**
 * Verificación de la tanda "Fase 2a" (solo desarrollo).
 *
 * Comprueba:
 *  1. Migración DB + persistencia de propiedades de competencia (compProps).
 *  2. Selector de deporte con categorías e iconos en el modal.
 *  3. Propiedades reflejadas en la página de competencia.
 *  4. Registro de eventos con buscador y filtro por tipo.
 *  5. Fallback de competencia/sede (proyecto) en la ventana Display.
 *  6. Cuenta atrás: panel, Mostrar/Ocultar, ejecución, expiración,
 *     persistencia y reflejo en la pantalla.
 *
 * Uso: MP_DEBUG_PORT=9222 npm run dev  +  node scripts/verify-phase2a.mjs
 */
const PORT = process.env.MP_DEBUG_PORT || '9222'
const OUT = `${process.cwd()}/scripts/shots/12-phase2a.png`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
const check = (label, value) => {
  results.push(`${value ? 'OK ' : 'FAIL'} ${label}`)
  console.log(`${value ? 'OK ' : 'FAIL'} ${label}`)
}

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
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
        return
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params.exceptionDetails.text)
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (res.exceptionDetails) {
      throw new Error(`${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`)
    }
    return res.result.value
  }
  async shot(path) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
    const fs = await import('node:fs')
    fs.mkdirSync(`${process.cwd()}/scripts/shots`, { recursive: true })
    fs.writeFileSync(path, Buffer.from(data, 'base64'))
    console.log(`  · captura: ${path}`)
  }
  close() {
    try {
      this.ws.close()
    } catch {
      /* noop */
    }
  }
}

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

async function waitForTarget(matcher, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const found = (await listTargets()).find(matcher)
    if (found) return found
    await sleep(300)
  }
  return null
}

/** Escribe un valor en un input/select de React (setter nativo + evento). */
const setInput = (selector, value) => {
  const evt = selector.startsWith('select') ? 'change' : 'input'
  return `
  (() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return false
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event(${JSON.stringify(evt)}, { bubbles: true }))
    return true
  })()
`
}

/** Pulsa el primer botón cuyo texto contiene `text`. */
const clickText = (selector, text) => `
  (() => {
    const els = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const el = els.find((e) => e.textContent.includes(${JSON.stringify(text)}))
    if (!el) return false
    el.click()
    return true
  })()
`

/** Pulsa el elemento por selector (devuelve false si no existe). */
const clickSel = (selector) => `
  (() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return false
    el.click()
    return true
  })()
`

async function main() {
  console.log('1. Preparando el entorno…')
  const controlTarget = await waitForTarget(
    (t) => t.type === 'page' && /localhost:\d+\/index\.html/.test(t.url),
    40000,
  )
  if (!controlTarget) throw new Error('No se encontró la ventana de control.')
  const control = new Cdp(controlTarget.webSocketDebuggerUrl)
  await control.connect()
  await control.send('Page.enable')
  await control.send('Runtime.enable')
  await control.send('Page.reload')
  await sleep(3500)
  control.errors.length = 0 // descarta el búfer histórico de consola

  console.log('2. Creando datos de verificación (API)…')
  const setup = await control.eval(`
    (async () => {
      const api = window.api
      // Limpia restos de ejecuciones anteriores de este script.
      const old = await api.projects.list()
      for (const p of old) {
        if (p.name.startsWith('F2A VERIF')) await api.projects.remove(p.id)
      }
      const project = await api.projects.create({
        name: 'F2A VERIF ' + Date.now(),
        sport: 'football',
        season: '2026',
        location: 'Estadio Verificación',
        date: '2026-10-05',
        modality: 'cup',
        compProps: { code: 'F2A', session: '01', court: 'Cancha 7' },
      })
      const home = await api.teams.create({
        projectId: project.id, name: 'Norte FC', shortName: 'NOR', code: 'NOR',
        logo: null, primaryColor: '#2563EB', secondaryColor: '#FFFFFF', city: '', country: '',
      })
      const away = await api.teams.create({
        projectId: project.id, name: 'Sur FC', shortName: 'SUR', code: 'SUR',
        logo: null, primaryColor: '#EF4444', secondaryColor: '#FFFFFF', city: '', country: '',
      })
      const match = await api.matches.create({
        projectId: project.id, homeTeamId: home.id, awayTeamId: away.id,
        venue: '', kickoff: '2026-10-05T18:00', round: '', competition: '',
      })
      await api.events.create({ matchId: match.id, teamId: home.id, playerId: null, type: 'goal', minute: 3, description: 'Gol de prueba — jugador A' })
      await api.events.create({ matchId: match.id, teamId: away.id, playerId: null, type: 'yellow', minute: 12, description: 'Tarjeta a B' })
      await api.events.create({ matchId: match.id, teamId: null, playerId: null, type: 'substitution', minute: 40, description: 'Cambio X' })
      return { projectId: project.id, matchId: match.id }
    })()
  `)
  if (!setup?.projectId) throw new Error('No se pudo crear el proyecto de verificación.')
  const { projectId, matchId } = setup
  console.log(`  · proyecto ${projectId} / partido ${matchId}`)

  const stored = await control.eval(`window.api.projects.get(${JSON.stringify(projectId)})`)
  check(
    'migración DB: compProps persistidos en el proyecto',
    stored?.compProps?.code === 'F2A' && stored?.compProps?.session === '01' && stored?.compProps?.court === 'Cancha 7',
  )

  console.log('3. Propiedades en la página de competencia…')
  await control.eval(`location.hash = ${JSON.stringify(`#/p/${projectId}/competition`)}`)
  await sleep(1200)
  const comp = await control.eval(`
    (() => ({
      dl: document.querySelector('dl')?.textContent ?? '',
      sportBadge: document.body.innerText.includes('Fútbol'),
      icon: Boolean(document.querySelector('.rounded-2xl svg')),
      heading: document.body.innerText.includes('F2A VERIF'),
    }))()
  `)
  check('la competencia muestra código, sesión y cancha', ['F2A', '01', 'Cancha 7'].every((t) => comp.dl.includes(t)))
  check('la competencia muestra el icono del deporte', comp.icon)
  check('la tarjeta de deporte muestra "Fútbol"', comp.sportBadge)

  console.log('4. Selector de deporte en el modal de propiedades…')
  check('abre el modal "Editar competencia"', await control.eval(clickText('button', 'Editar competencia')))
  await sleep(900)
  const picker = await control.eval(`
    (() => ({
      categories: [...document.querySelectorAll('button')].filter((b) => ['Pelota', 'Atletismo', 'Nieve', 'Precisión'].every((c, i, a) => true)).length,
      hasNieve: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Nieve')),
      hasPrec: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Precisión')),
      tiles: document.querySelectorAll('button[aria-pressed]').length,
      selected: [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.textContent.trim()),
      hasBuscador: Boolean(document.querySelector('input[placeholder="Buscar deporte…"]')),
    }))()
  `)
  check('hay categorías (Pelota/Nieve/Precisión…)', picker.hasNieve && picker.hasPrec)
  check(`hay rejilla de deportes con iconos (${picker.tiles} fichas)`, picker.tiles >= 20)
  check('la ficha seleccionada es "Fútbol"', picker.selected.includes('Fútbol'))
  check('hay buscador de deportes', picker.hasBuscador)

  check('cambia a la categoría "Nieve"', await control.eval(clickText('button', 'Nieve')))
  await sleep(400)
  check('selecciona el deporte "Snowboard"', await control.eval(clickText('button[aria-pressed]', 'Snowboard')))
  await sleep(300)
  const snowSelected = await control.eval(`
    [...document.querySelectorAll('button[aria-pressed="true"]')].some((b) => b.textContent.includes('Snowboard'))
  `)
  check('Snowboard queda seleccionada (azul)', snowSelected)
  await control.shot(`${process.cwd()}/scripts/shots/12-sportpicker.png`)

  console.log('5. Editar y guardar propiedades…')
  check('edita la cancha', await control.eval(setInput('input[placeholder="[1] A"]', 'Cancha 9')))
  await sleep(300)
  check('guarda los cambios', await control.eval(clickText('button', 'Guardar cambios')))
  await sleep(1400)
  const afterSave = await control.eval(`
    (() => ({
      dl: document.querySelector('dl')?.textContent ?? '',
      snow: document.body.innerText.includes('Snowboard'),
      modalAbierto: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Guardar cambios')),
    }))()
  `)
  check('la cancha actualizada se refleja (Cancha 9)', afterSave.dl.includes('Cancha 9'))
  check('el deporte nuevo se refleja (Snowboard)', afterSave.snow && !afterSave.modalAbierto)

  console.log('6. Registro de eventos con buscador…')
  await control.eval(`location.hash = ${JSON.stringify(`#/p/${projectId}/control/${matchId}`)}`)
  await sleep(2000)
  const timeline0 = await control.eval(`
    (async () => ({
      title: document.body.innerText.toLowerCase().includes('registro de eventos'),
      counter: /3 de 3/.test(document.body.innerText),
      counterRaw: document.body.innerText.match(/\\d+ de \\d+/)?.[0] ?? '',
      testids: [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid).join(','),
      eventsApi: (await window.api.events.list(${JSON.stringify(matchId)})).length,
      fallbackComp: document.body.innerText.includes('F2A VERIF'),
      fallbackVenue: document.body.innerText.includes('Estadio Verificación'),
    }))()
  `)
  console.log(`  · contador="${timeline0.counterRaw}" eventosAPI=${timeline0.eventsApi} testids=${timeline0.testids}`)
  check('el registro lista los 3 eventos ("3 de 3")', timeline0.title && timeline0.counter)
  check('la cabecera usa la competencia/sede del proyecto (fallback)', timeline0.fallbackComp && timeline0.fallbackVenue)

  check('escribe en el buscador', await control.eval(setInput('input[aria-label="Buscar eventos"]', 'tarjeta')))
  await sleep(600)
  const search1 = await control.eval(`
    (() => {
      const items = [...document.querySelectorAll('ul li')].map((li) => li.textContent)
      return {
        counter: document.body.innerText.match(/(\\d+) de (\\d+)/)?.[0] ?? '',
        onlyYellow: items.some((t) => t.includes('Amarilla')) && !items.some((t) => t.includes('Sustitución')),
      }
    })()
  `)
  check('el buscador filtra a 1 evento ("1 de 3")', search1.counter === '1 de 3' && search1.onlyYellow)
  console.log(`  · tras "tarjeta": contador="${search1.counter}" soloAmarilla=${search1.onlyYellow}`)

  check('busca texto sin resultados', await control.eval(setInput('input[aria-label="Buscar eventos"]', 'zzzz')))
  await sleep(500)
  check('muestra estado sin resultados', await control.eval(`document.body.innerText.includes('Ningún evento coincide')`))

  check('limpia el buscador', await control.eval(setInput('input[aria-label="Buscar eventos"]', '')))
  await sleep(400)
  check('filtra por tipo "Gol"', await control.eval(setInput('select[aria-label="Filtrar por tipo de evento"]', 'goal')))
  await sleep(500)
  const filter1 = await control.eval(`
    (() => ({
      counter: document.body.innerText.match(/(\\d+) de (\\d+)/)?.[0] ?? '',
      hasGoal: document.body.innerText.includes('Gol de prueba'),
    }))()
  `)
  check('el filtro por tipo deja solo el gol ("1 de 3")', filter1.counter === '1 de 3' && filter1.hasGoal)
  await control.eval(setInput('select[aria-label="Filtrar por tipo de evento"]', 'all'))
  await sleep(400)

  console.log('7. Cuenta atrás en el panel de control…')
  const panel0 = await control.eval(`
    (() => ({
      panel: Boolean(document.querySelector('[data-testid="countdown-panel"]')),
      hiddenBadge: Boolean(document.querySelector('button[title="Mostrar en la pantalla"]')),
    }))()
  `)
  check('el panel de cuenta atrás existe y arranca oculta', panel0.panel && panel0.hiddenBadge)

  check('activa "Mostrar" en pantalla', await control.eval(clickSel('button[title="Mostrar en la pantalla"]')))
  await sleep(700)
  check('fija la duración a 00:05', (await control.eval(setInput('input[aria-label="Minutos"]', '0'))) && (await control.eval(setInput('input[aria-label="Segundos"]', '5'))))
  await sleep(300)
  check('aplica la duración', await control.eval(clickText('button', 'Aplicar')))
  await sleep(500)
  const duration = await control.eval(`document.querySelector('[data-testid="countdown-duration"]')?.textContent ?? ''`)
  if (!duration) {
    const probe = await control.eval(`[...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid).join(',')`)
    console.log(`  · duration vacío; testids en página: ${probe}`)
  }
  check(`la duración se aplicó (${duration.trim()})`, duration.includes('00:05'))

  console.log('8. Ventana Display: fallback + cuenta atrás…')
  await control.eval(`window.api.display.open({})`)
  await sleep(2200)
  const displayTarget = await waitForTarget((t) => t.type === 'page' && /localhost:\d+\/display\.html/.test(t.url))
  if (!displayTarget) throw new Error('No se encontró la ventana display.')
  const display = new Cdp(displayTarget.webSocketDebuggerUrl)
  await display.connect()
  await display.send('Page.enable')
  await display.send('Runtime.enable')
  display.errors.length = 0

  const disp0 = await display.eval(`
    (() => ({
      body: document.body.innerText,
      overlay: Boolean(document.querySelector('[data-testid="countdown-overlay"]')),
      time: document.querySelector('[data-testid="countdown-overlay"] [data-testid="countdown-time"]')?.textContent ?? '',
    }))()
  `)
  check('la pantalla muestra la competencia del proyecto (fallback)', disp0.body.includes('F2A VERIF'))
  check('la pantalla muestra la sede del proyecto (fallback)', disp0.body.includes('Estadio Verificación'))
  check('la cuenta atrás aparece en la pantalla', disp0.overlay && disp0.time.includes('00:05'))

  console.log('9. Ejecución y expiración…')
  check('ejecuta la cuenta atrás', await control.eval(clickText('button', 'Ejecutar')))
  await sleep(1300)
  const t1 = await display.eval(`document.querySelector('[data-testid="countdown-overlay"] [data-testid="countdown-time"]')?.textContent ?? ''`)
  await sleep(900)
  const t2 = await display.eval(`document.querySelector('[data-testid="countdown-overlay"] [data-testid="countdown-time"]')?.textContent ?? ''`)
  const ctl1 = await control.eval(`document.querySelector('[data-testid="countdown-time"]')?.textContent ?? ''`)
  check(`la cuenta corre en la pantalla (${t1} → ${t2})`, /^00:0[0-4]$/.test(t1) && /^00:0[0-4]$/.test(t2) && t1 !== t2)
  check('el panel de control muestra el mismo tiempo', /^00:0[0-4]$/.test(ctl1))

  await sleep(4200)
  const expiredCtl = await control.eval(`document.querySelector('[data-testid="countdown-time"]')?.textContent ?? ''`)
  const expiredDisp = await display.eval(`document.querySelector('[data-testid="countdown-overlay"] [data-testid="countdown-time"]')?.textContent ?? ''`)
  check('expira: control muestra ¡TIEMPO!', expiredCtl.includes('¡TIEMPO!'))
  check('expira: la pantalla muestra ¡TIEMPO!', expiredDisp.includes('¡TIEMPO!'))

  check('resetea a 00:05', await control.eval(clickText('button', 'Reset')))
  await sleep(600)
  const afterReset = await control.eval(`document.querySelector('[data-testid="countdown-time"]')?.textContent ?? ''`)
  check(`reset correcto (${afterReset})`, afterReset.includes('00:05'))

  console.log('10. Persistencia tras recargar…')
  await control.send('Page.reload')
  await sleep(3500)
  const persisted = await control.eval(`
    (() => ({
      duration: document.querySelector('[data-testid="countdown-duration"]')?.textContent ?? '',
      visible: Boolean(document.querySelector('button[title="Ocultar de la pantalla"]')),
      panel: Boolean(document.querySelector('[data-testid="countdown-panel"]')),
    }))()
  `)
  check('la duración persiste tras recargar (00:05)', persisted.duration.includes('00:05'))
  check('la visibilidad persiste tras recargar ("En pantalla")', persisted.visible)

  check('oculta la cuenta atrás', await control.eval(clickSel('button[title="Ocultar de la pantalla"]')))
  await sleep(800)
  const gone = await display.eval(`!document.querySelector('[data-testid="countdown-overlay"]')`)
  check('al ocultar, la pastilla desaparece de la pantalla', gone)

  console.log('11. Captura…')
  await display.eval(`window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))`)
  await sleep(300)
  await display.shot(OUT)

  check(
    'sin errores de consola (control + display)',
    control.errors.length === 0 && display.errors.length === 0,
  )
  if (control.errors.length || display.errors.length) {
    console.log('  errores:', [...control.errors, ...display.errors])
  }

  console.log('12. Limpieza…')
  await control.eval(`location.hash = '#/'`)
  await sleep(800)
  await control.eval(`
    (async () => {
      await window.api.projects.remove(${JSON.stringify(projectId)})
      await window.api.settings.set('activeMatchId', '')
      await window.api.settings.set('countdown.state', '')
      await window.api.display.sync(null)
    })()
  `)
  await sleep(1200)
  const cleaned = await display.eval(`document.body.innerText`)
  check('la pantalla vuelve a "esperando partido" tras limpiar', !cleaned.includes('F2A VERIF'))

  display.close()
  control.close()

  console.log('\n--- Resultados ---')
  for (const line of results) console.log(line)
  const failed = results.filter((r) => r.startsWith('FAIL')).length
  console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('VERIFICACIÓN FALLIDA:', err)
  process.exit(1)
})
