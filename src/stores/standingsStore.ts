import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewStandingEntryInput, StandingEntry } from '@/types'
import { toast } from './toastStore'

interface StandingsState {
  projectId: string | null
  entries: StandingEntry[]
  loading: boolean
  loaded: boolean

  load: (projectId: string) => Promise<void>
  create: (input: NewStandingEntryInput) => Promise<StandingEntry | null>
  update: (id: string, patch: Partial<NewStandingEntryInput>) => Promise<StandingEntry | null>
  remove: (id: string) => Promise<boolean>
}

export const useStandingsStore = create<StandingsState>((set, get) => ({
  projectId: null,
  entries: [],
  loading: false,
  loaded: false,

  load: async (projectId) => {
    set({ projectId, loading: true, loaded: false })
    try {
      const entries = await api.standings.list(projectId)
      set({ entries, loading: false, loaded: true })
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
      const entry = await api.standings.create({ ...input, projectId })
      set((state) => ({ entries: [...state.entries, entry] }))
      toast.success('Entrada creada.')
      return entry
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  update: async (id, patch) => {
    try {
      const entry = await api.standings.update(id, patch)
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? entry : e)),
      }))
      toast.success('Entrada actualizada.')
      return entry
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.standings.remove(id)
      set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }))
      toast.success('Entrada eliminada.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
