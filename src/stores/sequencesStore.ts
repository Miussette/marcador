import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewScheduledSequenceInput, ScheduledSequence } from '@/types'
import { toast } from './toastStore'

interface SequencesState {
  projectId: string | null
  items: ScheduledSequence[]
  loading: boolean
  loaded: boolean

  load: (projectId: string) => Promise<void>
  create: (input: NewScheduledSequenceInput) => Promise<ScheduledSequence | null>
  remove: (id: string) => Promise<boolean>
}

export const useSequencesStore = create<SequencesState>((set, get) => ({
  projectId: null,
  items: [],
  loading: false,
  loaded: false,

  load: async (projectId) => {
    set({ projectId, loading: true, loaded: false })
    try {
      const items = await api.sequences.list(projectId)
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
      const item = await api.sequences.create({ ...input, projectId })
      set((state) => ({ items: [item, ...state.items] }))
      toast.success('Secuencia creada.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.sequences.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Secuencia eliminada.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
