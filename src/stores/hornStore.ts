import { create } from 'zustand'
import { api } from '@/services/api'
import { HORN_SETTING_KEY, hornBytes, parseHorn, validateHorn } from '@/features/serial/horn'
interface Port {
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  open(options: { baudRate: number; dataBits: 7 | 8; stopBits: 1 | 2; parity: string; flowControl: string }): Promise<void>
  close(): Promise<void>
  addEventListener(type: string, callback: () => void): void
  removeEventListener(type: string, callback: () => void): void
}
let port: Port | null = null
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
let reading: Promise<void> | null = null
let disconnectListener: (() => void) | null = null
interface HornState {
  connected: boolean
  busy: boolean
  portName: string
  received: string
  error: string | null
  connect(): Promise<void>
  disconnect(): Promise<void>
  send(): Promise<void>
}
export const useHornStore = create<HornState>((set, get) => ({
  connected: false, busy: false, portName: '', received: '', error: null,
  connect: async () => {
    if (get().busy || get().connected) return
    set({ busy: true, error: null })
    let selected: Port | null = null
    try {
      const serial = (navigator as Navigator & { serial?: { requestPort(): Promise<Port> } }).serial
      if (!serial) throw new Error('La conexión serial requiere la aplicación de escritorio.')
      const config = parseHorn(await api.settings.get(HORN_SETTING_KEY))
      validateHorn(config)
      selected = await serial.requestPort()
      await selected.open(config)
      port = selected
      const name = await api.settings.get('horn.port')
      disconnectListener = () => { set({ connected: false, error: 'Dispositivo USB desconectado.' }); void get().disconnect() }
      selected.addEventListener('disconnect', disconnectListener)
      set({ connected: true, portName: name || 'USB serial', received: '' })
      if (selected.readable) {
        reader = selected.readable.getReader()
        const currentReader = reader
        reading = (async () => {
          const decoder = new TextDecoder()
          try {
            while (true) {
              const { value, done } = await currentReader.read()
              if (done) break
              set(state => ({ received: (state.received + decoder.decode(value, { stream: true })).slice(-8192) }))
            }
          } catch (error) { set({ error: String(error), connected: false }) }
          finally { currentReader.releaseLock() }
        })()
        void reading.then(() => { if (port === selected) { set({ connected: false, error: get().error || 'Se interrumpió la conexión serial.' }); if (!get().busy) void get().disconnect() } })
      }
    } catch (error) {
      if (selected) { try { await selected.close() } catch { /* Puede no haberse abierto. */ } }
      port = null
      set({ connected: false, error: error instanceof Error ? error.message : String(error) })
    } finally { set({ busy: false }); if (port && !get().connected) void get().disconnect() }
  },
  disconnect: async () => {
    if (get().busy) return
    set({ busy: true, connected: false })
    const current = port
    port = null
    try {
      if (current && disconnectListener) current.removeEventListener('disconnect', disconnectListener)
      if (reader) await reader.cancel().catch(() => {})
      if (reading) await reading
      if (current) await current.close()
    } catch (error) { set({ error: String(error) }) }
    finally { reader = null; reading = null; disconnectListener = null; set({ busy: false }) }
  },
  send: async () => {
    if (get().busy) return
    if (!get().connected || !port?.writable) { set({ error: 'Primero conecta el puerto de la bocina.' }); return }
    set({ busy: true, error: null })
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null
    try {
      const bytes = hornBytes(parseHorn(await api.settings.get(HORN_SETTING_KEY)))
      if (!port?.writable || !get().connected) throw new Error('El dispositivo se desconectó.')
      writer = port.writable.getWriter()
      await writer.write(bytes)
    } catch (error) { set({ error: error instanceof Error ? error.message : String(error) }) }
    finally { writer?.releaseLock(); set({ busy: false }); if (!get().connected) void get().disconnect() }
  },
}))
