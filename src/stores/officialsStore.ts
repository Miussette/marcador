import { create } from 'zustand'
import { api } from '@/services/api'
import type { MatchOfficial, NewMatchOfficialInput } from '@/types'
import { toast } from './toastStore'

interface OfficialsState {
  matchId: string | null
  officials: MatchOfficial[]
  loading: boolean
  loaded: boolean

  /** Carga (o recarga) los oficiales de un partido. */
  load: (matchId: string) => Promise<void>
  /** Sincroniza la lista completa (añade, actualiza y borra) y recarga. */
  replaceAll: (matchId: string, officials: NewMatchOfficialInput[]) => Promise<boolean>
  clear: () => void
}

export const useOfficialsStore = create<OfficialsState>((set, get) => ({
  matchId: null,
  officials: [],
  loading: false,
  loaded: false,

  load: async (matchId) => {
    const current = get()
    if (current.matchId === matchId && current.loaded && !current.loading) return
    set({ matchId, loading: true, loaded: false })
    try {
      const officials = await api.officials.listByMatch(matchId)
      set({ officials, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true })
      toast.error(error)
    }
  },

  replaceAll: async (matchId, officials) => {
    set({ loading: true })
    try {
      const saved = await api.officials.replaceAll(matchId, officials)
      set({ matchId, officials: saved, loading: false, loaded: true })
      return true
    } catch (error) {
      set({ loading: false })
      toast.error(error)
      return false
    }
  },

  clear: () => set({ matchId: null, officials: [], loading: false, loaded: false }),
}))
