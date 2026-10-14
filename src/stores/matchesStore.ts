import { create } from 'zustand'
import { api } from '@/services/api'
import type { Match, NewMatchInput, Project } from '@/types'
import { toast } from './toastStore'

const ACTIVE_MATCH_KEY = 'activeMatchId'

interface MatchesState {
  projectId: string | null
  matches: Match[]
  loading: boolean
  loaded: boolean
  error: string | null
  activeMatchId: string | null

  load: (projectId: string) => Promise<void>
  refresh: () => Promise<void>
  create: (input: NewMatchInput) => Promise<Match | null>
  update: (id: string, patch: Partial<Match>) => Promise<Match | null>
  remove: (id: string) => Promise<boolean>
  setActive: (matchId: string | null) => Promise<void>
  /** Recupera (tras un cierre inesperado) el partido que estaba activo. */
  restoreActive: () => Promise<Match | null>
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  projectId: null,
  matches: [],
  loading: false,
  loaded: false,
  error: null,
  activeMatchId: null,

  load: async (projectId) => {
    set({ projectId, loading: true, error: null, loaded: false })
    try {
      const matches = await api.matches.list(projectId)
      set({ matches, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true, error: error instanceof Error ? error.message : String(error) })
      toast.error(error)
    }
  },

  refresh: async () => {
    const projectId = get().projectId
    if (!projectId) return
    try {
      const matches = await api.matches.list(projectId)
      set({ matches })
    } catch (error) {
      toast.error(error)
    }
  },

  create: async (input) => {
    try {
      const match = await api.matches.create(input)
      set((state) => ({ matches: [match, ...state.matches] }))
      toast.success('Partido creado.')
      return match
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  update: async (id, patch) => {
    try {
      const match = await api.matches.update(id, patch)
      set((state) => ({ matches: state.matches.map((m) => (m.id === id ? match : m)) }))
      return match
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.matches.remove(id)
      const state = get()
      set({
        matches: state.matches.filter((m) => m.id !== id),
        activeMatchId: state.activeMatchId === id ? null : state.activeMatchId,
      })
      if (state.activeMatchId === id) await api.settings.set(ACTIVE_MATCH_KEY, '')
      toast.success('Partido eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },

  setActive: async (matchId) => {
    set({ activeMatchId: matchId })
    try {
      await api.settings.set(ACTIVE_MATCH_KEY, matchId ?? '')
    } catch (error) {
      toast.error(error)
    }
  },

  restoreActive: async () => {
    try {
      const stored = await api.settings.get(ACTIVE_MATCH_KEY)
      if (!stored) return null
      const match = await api.matches.get(stored)
      if (!match) {
        set({ activeMatchId: null })
        return null
      }
      set({ activeMatchId: match.id })
      return match
    } catch (error) {
      console.warn('[matches] No se pudo recuperar el partido activo:', error)
      return null
    }
  },
}))

/** Hook auxiliar: proyecto activo a partir de un match. */
export function projectOfMatch(match: Match | null, projects: Project[]): Project | null {
  if (!match) return null
  return projects.find((p) => p.id === match.projectId) ?? null
}
