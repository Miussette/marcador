import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewSponsorRotationInput, SponsorRotation } from '@/types'
import { toast } from './toastStore'

interface SponsorsState {
  projectId: string | null
  items: SponsorRotation[]
  loading: boolean
  loaded: boolean

  load: (projectId: string) => Promise<void>
  create: (input: NewSponsorRotationInput) => Promise<SponsorRotation | null>
  remove: (id: string) => Promise<boolean>
}

export const useSponsorsStore = create<SponsorsState>((set, get) => ({
  projectId: null,
  items: [],
  loading: false,
  loaded: false,

  load: async (projectId) => {
    set({ projectId, loading: true, loaded: false })
    try {
      const items = await api.sponsors.list(projectId)
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
      const item = await api.sponsors.create({ ...input, projectId })
      set((state) => ({ items: [item, ...state.items] }))
      toast.success('Rotación creada.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.sponsors.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Rotación eliminada.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
