import { create } from 'zustand'
import { api } from '@/services/api'
import type { DisplayInfo } from '@/types'
import { toast } from './toastStore'

interface DisplayStateStore {
  isOpen: boolean
  fullscreen: boolean
  displays: DisplayInfo[]
  selectedDisplayId: number | null
  loading: boolean

  refresh: () => Promise<void>
  openOn: (displayId?: number) => Promise<boolean>
  close: () => Promise<void>
  toggleFullscreen: () => Promise<void>
}

export const useDisplayStore = create<DisplayStateStore>((set, get) => ({
  isOpen: false,
  fullscreen: false,
  displays: [],
  selectedDisplayId: null,
  loading: false,

  refresh: async () => {
    set({ loading: true })
    try {
      const [isOpen, displays] = await Promise.all([api.display.isOpen(), api.display.listDisplays()])
      set((state) => ({
        isOpen,
        displays,
        loading: false,
        selectedDisplayId:
          state.selectedDisplayId ?? displays.find((d) => d.primary)?.id ?? displays[0]?.id ?? null,
      }))
    } catch (error) {
      set({ loading: false })
      toast.error(error)
    }
  },

  openOn: async (displayId) => {
    set({ loading: true })
    try {
      // Se abre como ventana SIN BORDES (movible). F11 o el botón de la
      // propia ventana pasan a pantalla completa.
      const result = await api.display.open({ displayId: displayId ?? get().selectedDisplayId ?? undefined })
      if (!result.ok) throw new Error(result.error ?? 'No se pudo abrir la pantalla.')
      set({ isOpen: true, fullscreen: false, loading: false, selectedDisplayId: displayId ?? get().selectedDisplayId })
      toast.success('Pantalla abierta sin bordes: arrástrala por su barra superior · F11 pantalla completa.')
      return true
    } catch (error) {
      set({ loading: false })
      toast.error(error)
      return false
    }
  },

  close: async () => {
    try {
      await api.display.close()
      set({ isOpen: false })
      toast.info('Pantalla de marcador cerrada.')
    } catch (error) {
      toast.error(error)
    }
  },

  toggleFullscreen: async () => {
    try {
      const fullscreen = await api.display.toggleFullscreen()
      set({ fullscreen })
    } catch (error) {
      toast.error(error)
    }
  },
}))
