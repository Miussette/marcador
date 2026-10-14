/**
 * Sonda rápida (solo desarrollo): comprueba que el código servido por Vite es el
 * nuevo y que ProjectLayout reintenta la carga antes de redirigir, sin apilar toasts.
 *
 * Uso: MP_DEBUG_PORT=9222 npm run dev  +  node scripts/probe.mjs
 */
const PORT = process.env.MP_DEBUG_PORT || '9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
  }
  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (!msg.id) return
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description ?? ''))
    return res.result.value
  }
}

const targets = await listTargets()
const target = targets.find((t) => t.type === 'page' && /localhost:\d+\/index\.html/.test(t.url))
if (!target) {
  console.error('No se encontró la ventana de control. ¿Está npm run dev en marcha?')
  process.exit(1)
}
const cdp = new Cdp(target.webSocketDebuggerUrl)
await cdp.connect()
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')

console.log('1. Recargando…')
await cdp.send('Page.reload')
await sleep(3000)

const servedToast = await cdp.eval(`fetch('/src/stores/toastStore.ts').then((r) => r.text())`)
console.log(`2. toastStore servido tiene cap(4): ${servedToast.includes('slice(-4)')}`)

const servedLayout = await cdp.eval(`fetch('/src/pages/ProjectLayout.tsx').then((r) => r.text())`)
console.log(`   ProjectLayout servido tiene retry: ${servedLayout.includes('refreshTriedRef')}`)

const countToasts = `document.querySelectorAll('[aria-label="Cerrar aviso"]').length`

console.log('3. Navegando a un proyecto inexistente (retry + redirect esperados)…')
await cdp.eval(`location.hash = '#/p/sonda-no-existe-1'`)
await sleep(3500)
console.log(`   hash tras 1er intento: ${await cdp.eval('location.hash')}`)
console.log(`   toasts visibles: ${await cdp.eval(countToasts)}`)

console.log('4. Segundo proyecto inexistente…')
await cdp.eval(`location.hash = '#/p/sonda-no-existe-2'`)
await sleep(3500)
console.log(`   hash tras 2º intento: ${await cdp.eval('location.hash')}`)
console.log(`   toasts visibles: ${await cdp.eval(countToasts)}`)

cdp.ws.close()
console.log('Listo.')
