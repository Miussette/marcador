import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewTeamInput, Team } from '@/types'
import { toast } from './toastStore'

interface TeamsState {
  projectId: string | null
  teams: Team[]
  loading: boolean
  loaded: boolean
  error: string | null

  load: (projectId: string) => Promise<void>
  refresh: () => Promise<void>
  create: (input: Omit<NewTeamInput, 'projectId'>) => Promise<Team | null>
  update: (id: string, patch: Partial<NewTeamInput>) => Promise<Team | null>
  remove: (id: string) => Promise<boolean>
  byId: (id: string | null | undefined) => Team | null
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  projectId: null,
  teams: [],
  loading: false,
  loaded: false,
  error: null,

  load: async (projectId) => {
    set({ projectId, loading: true, error: null, loaded: false })
    try {
      const teams = await api.teams.list(projectId)
      set({ teams, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true, error: error instanceof Error ? error.message : String(error) })
      toast.error(error)
    }
  },

  refresh: async () => {
    const projectId = get().projectId
    if (!projectId) return
    try {
      const teams = await api.teams.list(projectId)
      set({ teams, loaded: true })
    } catch (error) {
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
      const team = await api.teams.create({ ...input, projectId })
      set((state) => ({ teams: [...state.teams, team].sort((a, b) => a.name.localeCompare(b.name)) }))
      toast.success(`Equipo "${team.name}" creado.`)
      return team
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  update: async (id, patch) => {
    try {
      const team = await api.teams.update(id, patch)
      set((state) => ({
        teams: state.teams.map((t) => (t.id === id ? team : t)).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      toast.success('Equipo actualizado.')
      return team
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.teams.remove(id)
      set((state) => ({ teams: state.teams.filter((t) => t.id !== id) }))
      toast.success('Equipo eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },

  byId: (id) => (id ? (get().teams.find((t) => t.id === id) ?? null) : null),
}))
