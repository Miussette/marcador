/**
 * Limpieza puntual (solo desarrollo): elimina proyectos de prueba manuales
 * que quedaron en la base de datos durante la verificación.
 *
 * Uso: MP_DEBUG_PORT=9222 npm run dev  +  node scripts/cleanup-junk.mjs
 */
const PORT = process.env.MP_DEBUG_PORT || '9222'

const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
const targets = await res.json()
const target = targets.find((t) => t.type === 'page' && /localhost:\d+\/index\.html/.test(t.url))
if (!target) {
  console.error('No se encontró la ventana de control.')
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
let id = 0
const pending = new Map()
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.id) return
  const p = pending.get(msg.id)
  if (!p) return
  pending.delete(msg.id)
  msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
})
const send = (method, params = {}) => {
  const msgId = ++id
  ws.send(JSON.stringify({ id: msgId, method, params }))
  return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }))
}
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
  return r.result.value
}

const projects = await evaluate(`window.api.projects.list()`)
console.log('Proyectos actuales:', projects.map((p) => `${p.name} (${p.location ?? ''})`).join(' | ') || '(ninguno)')

for (const p of projects) {
  // Datos manuales de prueba con valores sin sentido ("juanito" / "asasas").
  if (p.name === 'juanito' || p.location === 'asasas') {
    await evaluate(`window.api.projects.remove(${JSON.stringify(p.id)})`)
    console.log(`· eliminado: ${p.name}`)
  }
}

const left = await evaluate(`window.api.projects.list()`)
console.log('Restantes:', left.length)

ws.close()
