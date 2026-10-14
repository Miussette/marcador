import { create } from 'zustand'
import { api } from '@/services/api'
import { toast } from './toastStore'

interface SettingsState {
  values: Record<string, string>
  loaded: boolean
  load: () => Promise<void>
  get: (key: string, fallback?: string) => string
  set: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  values: {},
  loaded: false,

  load: async () => {
    // Claves conocidas por la aplicación.
    const keys = ['scoreboard.layout', 'display.monitorId', 'display.goalOverlay', 'horn.sound']
    try {
      const entries = await Promise.all(keys.map(async (key) => [key, await api.settings.get(key)] as const))
      const values: Record<string, string> = {}
      for (const [key, value] of entries) if (value !== null && value !== '') values[key] = value
      set({ values, loaded: true })
    } catch (error) {
      set({ loaded: true })
      console.warn('[settings] No se pudo cargar la configuración:', error)
    }
  },

  get: (key, fallback = '') => get().values[key] ?? fallback,

  set: async (key, value) => {
    const previous = get().values[key]
    set((state) => ({ values: { ...state.values, [key]: value } }))
    try {
      await api.settings.set(key, value)
    } catch (error) {
      set((state) => ({
        values: { ...state.values, [key]: previous ?? '' },
      }))
      toast.error(error)
    }
  },
}))
