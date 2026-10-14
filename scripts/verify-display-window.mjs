/**
 * Verificación de la ventana Display SIN BORDES (solo desarrollo).
 *
 * Comprueba que al abrirla queda en modo ventana (movible), con barra de
 * arrastre, controles (minimizar/fullscreen/cerrar), redimensión, F11 y
 * eventos de fullscreen. Deja la ventana abierta para probarla a mano.
 *
 * Uso: MP_DEBUG_PORT=9222 npm run dev  +  node scripts/verify-display-window.mjs
 */
const PORT = process.env.MP_DEBUG_PORT || '9222'
const OUT = `${process.cwd()}/scripts/shots/11-display-windowed.png`
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

async function waitForTarget(matcher, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const found = (await listTargets()).find(matcher)
    if (found) return found
    await sleep(300)
  }
  return null
}

async function main() {
  console.log('1. Recargando la ventana de control…')
  const controlTarget = await waitForTarget(
    (t) => t.type === 'page' && /localhost:\d+\/index\.html/.test(t.url),
    30000,
  )
  if (!controlTarget) throw new Error('No se encontró la ventana de control.')
  const control = new Cdp(controlTarget.webSocketDebuggerUrl)
  await control.connect()
  await control.send('Page.enable')
  await control.send('Runtime.enable')
  await control.send('Page.reload')
  await sleep(3000)
  // El cliente CDP reenvía el buffer histórico de consola: se ignora lo anterior
  // para detectar SOLO errores nuevos de esta ejecución.
  control.errors.length = 0

  console.log('2. Abriendo la pantalla del marcador…')
  const opened = await control.eval(`window.api.display.open({}).then((r) => r.ok)`)
  check('ventana display abierta', opened)
  await sleep(2000)

  const displayTarget = await waitForTarget((t) => t.type === 'page' && /localhost:\d+\/display\.html/.test(t.url))
  if (!displayTarget) throw new Error('No se encontró la ventana display.')
  const display = new Cdp(displayTarget.webSocketDebuggerUrl)
  await display.connect()
  await display.send('Page.enable')
  await display.send('Runtime.enable')

  console.log('3. Inspeccionando la ventana (debe ser ventana, sin bordes)…')
  const info = await display.eval(`
    (() => {
      const chrome = document.querySelector('[data-testid="display-chrome"]')
      const bar = chrome ? chrome.firstElementChild : null
      return {
        width: window.outerWidth,
        height: window.outerHeight,
        hasChrome: Boolean(chrome),
        region: bar ? getComputedStyle(bar).webkitAppRegion : '',
        hint: chrome ? chrome.innerText.split('\\n')[0] : '',
        hasResizeGrip: Boolean(document.querySelector('[aria-label="Redimensionar ventana"]')),
      }
    })()
  `)
  check(
    `abre en ventana ${info.width}x${info.height} (sin pantalla completa)`,
    info.width >= 480 && info.width <= 1600 && info.height >= 300 && info.height <= 1000,
  )
  check('barra de chrome presente', info.hasChrome)
  check('la barra es región de arrastre nativa', info.region === 'drag')
  check('toma de redimensión presente', info.hasResizeGrip)
  console.log(`  · pista: "${info.hint}"`)

  const isFs0 = await display.eval(`window.api.display.isFullscreen()`)
  check('isFullscreen() == false al abrir', isFs0 === false)

  console.log('4. Botón de pantalla completa de la ventana…')
  await display.eval(`document.querySelector('[aria-label="Alternar pantalla completa"]').click()`)
  await sleep(1200)
  const fsOn = await display.eval(`window.api.display.isFullscreen()`)
  const hintOn = await display.eval(`document.querySelector('[data-testid="display-chrome"]').innerText`)
  check('el botón activa pantalla completa', fsOn === true)
  check('la barra indica pantalla completa', /Pantalla completa/.test(hintOn))

  await display.eval(`document.querySelector('[aria-label="Alternar pantalla completa"]').click()`)
  await sleep(1200)
  const fsOff = await display.eval(`window.api.display.isFullscreen()`)
  check('el botón restaura el modo ventana', fsOff === false)

  console.log('5. F11 y redimensión…')
  await display.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11', code: 'F11', bubbles: true }))`)
  await sleep(1000)
  check('F11 entra en pantalla completa', (await display.eval(`window.api.display.isFullscreen()`)) === true)
  await display.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11', code: 'F11', bubbles: true }))`)
  await sleep(1000)
  check('F11 sale de pantalla completa', (await display.eval(`window.api.display.isFullscreen()`)) === false)
  // El estado reflejado en la barra debe coincidir con la ventana real.
  const hintAfter = await display.eval(`document.querySelector('[data-testid="display-chrome"]').innerText`)
  check('la barra refleja el modo ventana tras F11', /Arrastra para mover/.test(hintAfter))

  const before = await display.eval(`window.innerWidth`)
  await display.eval(`window.api.display.setSize({ width: ${before - 160}, height: 600 })`)
  await sleep(600)
  const resized = await display.eval(`window.innerWidth`)
  check(`setSize redimensiona (${before} → ${resized})`, resized === before - 160)
  // Devuelve el tamaño por defecto para dejarla lista para probar.
  await display.eval(`window.api.display.setSize({ width: 1280, height: 720 })`)
  await sleep(400)

  console.log('6. Captura final…')
  // Muestra la barra (la oculta sola a los pocos segundos) y fotografía.
  await display.eval(`window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))`)
  await sleep(300)
  await display.shot(OUT)

  if (display.errors.length || control.errors.length) {
    console.log('Errores de consola:', [...control.errors, ...display.errors])
  }
  check('sin errores de consola', control.errors.length === 0 && display.errors.length === 0)

  // La ventana queda ABIERTA para que puedas probar el arrastre a mano.
  display.close()
  control.close()

  console.log('\n--- Resultados ---')
  for (const line of results) console.log(line)
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1
}

main().catch((err) => {
  console.error('VERIFICACIÓN FALLIDA:', err)
  process.exit(1)
})
