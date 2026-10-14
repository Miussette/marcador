import { create } from 'zustand'
import { api } from '@/services/api'
import type { ObsConnectionConfig, ObsServerState, ObsState } from '@/types'
import { toast } from './toastStore'

interface ObsStore extends ObsState {
  config: ObsConnectionConfig
  loading: boolean
  server: ObsServerState
  serverPort: string

  setConfig: (config: Partial<ObsConnectionConfig>) => void
  setServerPort: (port: string) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  refresh: () => Promise<void>
  listScenes: () => Promise<void>
  setCurrentScene: (sceneName: string) => Promise<void>
  listSources: (sceneName?: string) => Promise<void>
  setSourceVisibility: (sourceName: string, visible: boolean) => Promise<void>
  startStreaming: () => Promise<void>
  stopStreaming: () => Promise<void>
  startServer: () => Promise<void>
  stopServer: () => Promise<void>
  refreshServer: () => Promise<void>
  init: () => () => void
}

const DEFAULT_CONFIG: ObsConnectionConfig = {
  host: 'localhost',
  port: 4455,
  password: '',
}

export const useObsStore = create<ObsStore>((set, get) => ({
  connectionStatus: 'disconnected',
  streamingStatus: 'offline',
  currentScene: null,
  scenes: [],
  sources: [],
  error: null,
  config: DEFAULT_CONFIG,
  loading: false,
  server: { running: false, port: 4456, url: null },
  serverPort: '4456',

  setConfig: (config) => {
    set((state) => ({ config: { ...state.config, ...config } }))
  },

  setServerPort: (port) => {
    set({ serverPort: port })
  },

  connect: async () => {
    set({ loading: true, error: null })
    try {
      await api.obs.connect(get().config)
      await get().refresh()
      toast.success('Conectado a OBS')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de conexión'
      set({ error: message, connectionStatus: 'error' })
      toast.error(`Error de conexión: ${message}`)
    } finally {
      set({ loading: false })
    }
  },

  disconnect: async () => {
    try {
      await api.obs.disconnect()
      toast.info('Desconectado de OBS')
    } catch (error) {
      toast.error(error)
    }
  },

  refresh: async () => {
    try {
      const state = await api.obs.getState()
      set(state)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error al obtener estado' })
    }
  },

  listScenes: async () => {
    try {
      const scenes = await api.obs.listScenes()
      set({ scenes })
    } catch (error) {
      toast.error(error)
    }
  },

  setCurrentScene: async (sceneName) => {
    try {
      await api.obs.setCurrentScene(sceneName)
      set({ currentScene: sceneName })
      await get().listSources(sceneName)
    } catch (error) {
      toast.error(error)
    }
  },

  listSources: async (sceneName) => {
    try {
      const sources = await api.obs.listSources(sceneName)
      set({ sources })
    } catch (error) {
      toast.error(error)
    }
  },

  setSourceVisibility: async (sourceName, visible) => {
    try {
      await api.obs.setSourceVisibility(sourceName, visible)
      set((state) => ({
        sources: state.sources.map((s) => (s.sourceName === sourceName ? { ...s, visible } : s)),
      }))
    } catch (error) {
      toast.error(error)
    }
  },

  startStreaming: async () => {
    try {
      await api.obs.startStreaming()
      set({ streamingStatus: 'streaming' })
      toast.success('Streaming iniciado')
    } catch (error) {
      toast.error(error)
    }
  },

  stopStreaming: async () => {
    try {
      await api.obs.stopStreaming()
      set({ streamingStatus: 'offline' })
      toast.info('Streaming detenido')
    } catch (error) {
      toast.error(error)
    }
  },

  startServer: async () => {
    const port = Number.parseInt(get().serverPort, 10)
    set({ loading: true })
    try {
      const result = await api.obs.serverStart(Number.isFinite(port) ? port : undefined)
      if (result.ok && result.url) {
        const state = await api.obs.serverState()
        set({ server: state, loading: false })
        toast.success(`Servidor del marcador activo en ${result.url}`)
      } else {
        set({ loading: false })
        toast.error(result.error ?? 'No se pudo iniciar el servidor')
      }
    } catch (error) {
      set({ loading: false })
      toast.error(error)
    }
  },

  stopServer: async () => {
    try {
      await api.obs.serverStop()
      set({ server: { running: false, port: 4456, url: null } })
      toast.info('Servidor del marcador detenido')
    } catch (error) {
      toast.error(error)
    }
  },

  refreshServer: async () => {
    try {
      const state = await api.obs.serverState()
      set({ server: state, serverPort: String(state.port) })
    } catch (error) {
      toast.error(error)
    }
  },

  init: () => {
    const unsubscribe = api.obs.onStatusChange((state) => {
      set(state)
    })
    void get().refreshServer()
    return unsubscribe
  },
}))
