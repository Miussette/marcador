const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..'), cache = new Map(), values = new Map()
const api = { settings: { get: async key => values.get(key) ?? null } }
function load(file) {
  const filename = path.resolve(root, file)
  if (cache.has(filename)) return cache.get(filename).exports
  const m = { exports: {} }; cache.set(filename, m)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === '@/services/api' ? { api } : name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts') : require(name), m, m.exports)
  return m.exports
}
async function run() {
  const model = load('src/features/serial/horn.ts')
  assert.deepEqual([...model.hornBytes(model.DEFAULT_HORN)], [0x23, 0x54])
  for (const [ending, bytes] of [['cr', [13]], ['lf', [10]], ['crlf', [13, 10]]]) assert.deepEqual([...model.hornBytes({ ...model.DEFAULT_HORN, ending })], [35, 84, ...bytes])
  assert.throws(() => model.hornBytes({ ...model.DEFAULT_HORN, command: 'ñ' }))
  assert.throws(() => model.validateHorn({ ...model.DEFAULT_HORN, baudRate: 0 }))
  assert.equal(model.parseHorn('{invalid').baudRate, 9600)
  let opened, closed = 0, writes = [], callbacks = new Map(), rx
  const port = {
    readable: new ReadableStream({ start(controller) { rx = controller } }),
    writable: new WritableStream({ write(bytes) { writes.push([...bytes]) } }),
    async open(config) { opened = config }, async close() { closed++ },
    addEventListener(name, cb) { callbacks.set(name, cb) }, removeEventListener(name) { callbacks.delete(name) },
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serial: { requestPort: async () => port } } })
  values.set('horn.port', 'COM7')
  const store = load('src/stores/hornStore.ts').useHornStore
  await store.getState().connect()
  assert.equal(store.getState().connected, true)
  assert.equal(opened.baudRate, 9600)
  assert.equal(store.getState().portName, 'COM7')
  assert.equal(writes.length, 0)
  await store.getState().send()
  assert.deepEqual(writes, [[35, 84]])
  rx.enqueue(new TextEncoder().encode('OK'))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(store.getState().received, 'OK')
  await store.getState().disconnect()
  assert.equal(closed, 1)
  assert.equal(port.readable.locked, false)
  assert.equal(port.writable.locked, false)
  await store.getState().send()
  assert.equal(writes.length, 1)
  assert(store.getState().error)
  port.readable = new ReadableStream({ start(controller) { rx = controller } })
  await store.getState().connect()
  callbacks.get('disconnect')()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(store.getState().connected, false)
  assert.equal(store.getState().busy, false)
  assert.equal(closed, 2)
  assert.equal(port.readable.locked, false)
  navigator.serial.requestPort = async () => { throw new Error('No hay dispositivo') }
  await store.getState().connect()
  assert.equal(store.getState().busy, false)
  assert.equal(store.getState().connected, false)
  assert.equal(store.getState().error, 'No hay dispositivo')
  console.log('Bocina: bytes, terminaciones, configuración, conexión, lectura, envío y cierre verificados con dispositivo simulado')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
