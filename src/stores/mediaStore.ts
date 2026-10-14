import { create } from 'zustand'
import { api } from '@/services/api'
import type { MediaItem } from '@/types'
import { toast } from './toastStore'

interface MediaState {
  projectId: string | null
  items: MediaItem[]
  loading: boolean
  loaded: boolean

  load: (projectId: string) => Promise<void>
  create: (input: { name: string; kind: 'image' | 'text'; data: string; duration: number }) => Promise<MediaItem | null>
  remove: (id: string) => Promise<boolean>
  /** Muestra un elemento de la biblioteca en la pantalla externa. */
  showOnDisplay: (item: MediaItem, seconds?: number) => Promise<void>
  /** Muestra un texto puntual (p. ej. "GOOOOOL") en la pantalla externa. */
  showText: (text: string, seconds: number) => Promise<void>
}

export const useMediaStore = create<MediaState>((set, get) => ({
  projectId: null,
  items: [],
  loading: false,
  loaded: false,

  load: async (projectId) => {
    set({ projectId, loading: true, loaded: false })
    try {
      const items = await api.media.list(projectId)
      set({ items, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true })
      toast.error(error)
    }
  },

  create: async (input) => {
    const projectId = get().projectId
    if (!projectId) {
      toast.error('No hay un proyecto seleccionado.')
      return null
    }
    try {
      const item = await api.media.create({ ...input, projectId })
      set((state) => ({ items: [item, ...state.items] }))
      toast.success('Elemento añadido a Multimedia.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.media.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Elemento eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },

  showOnDisplay: async (item, seconds) => {
    const duration = (seconds ?? item.duration) * 1000
    try {
      await api.display.overlay({
        kind: item.kind,
        text: item.kind === 'text' ? item.data : item.name,
        dataUrl: item.kind === 'image' ? item.data : null,
        durationMs: duration,
      })
      toast.success(`"${item.name}" mostrado en la pantalla.`)
    } catch (error) {
      toast.error(error)
    }
  },

  showText: async (text, seconds) => {
    try {
      await api.display.overlay({ kind: 'text', text, dataUrl: null, durationMs: seconds * 1000 })
      toast.success('Mensaje enviado a la pantalla.')
    } catch (error) {
      toast.error(error)
    }
  },
}))
