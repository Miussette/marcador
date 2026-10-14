import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewMatchActInput, MatchAct } from '@/types'
import { toast } from './toastStore'

interface ActsState {
  matchId: string | null
  items: MatchAct[]
  loading: boolean
  loaded: boolean

  load: (matchId: string) => Promise<void>
  create: (input: NewMatchActInput) => Promise<MatchAct | null>
  remove: (id: string) => Promise<boolean>
}

export const useActsStore = create<ActsState>((set, get) => ({
  matchId: null,
  items: [],
  loading: false,
  loaded: false,

  load: async (matchId) => {
    set({ matchId, loading: true, loaded: false })
    try {
      const items = await api.acts.list(matchId)
      set({ items, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true })
      toast.error(error)
    }
  },

  create: async (input) => {
    const matchId = get().matchId
    if (!matchId) {
      toast.error('No hay un partido seleccionado.')
      return null
    }
    try {
      const item = await api.acts.create({ ...input, matchId })
      set((state) => ({ items: [item, ...state.items] }))
      toast.success('Acta creada.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.acts.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Acta eliminada.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
