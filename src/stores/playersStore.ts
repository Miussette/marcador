import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewPlayerInput, Player } from '@/types'
import { playersFromCsv, type ParsedPlayerRow } from '@/utils/csv'
import { toast } from './toastStore'

interface PlayersState {
  selectedTeamId: string | null
  playersByTeam: Record<string, Player[]>
  loadingTeamId: string | null

  select: (teamId: string | null) => Promise<void>
  reloadTeam: (teamId: string) => Promise<void>
  create: (input: NewPlayerInput) => Promise<Player | null>
  update: (id: string, patch: Partial<NewPlayerInput>) => Promise<Player | null>
  remove: (id: string, teamId: string) => Promise<boolean>
  importCsv: (teamId: string, text: string) => Promise<{ imported: number; total: number }>
  clearTeam: (teamId: string) => void
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
  selectedTeamId: null,
  playersByTeam: {},
  loadingTeamId: null,

  select: async (teamId) => {
    set({ selectedTeamId: teamId })
    if (teamId) await get().reloadTeam(teamId)
  },

  reloadTeam: async (teamId) => {
    set({ loadingTeamId: teamId })
    try {
      const players = await api.players.listByTeam(teamId)
      set((state) => ({ playersByTeam: { ...state.playersByTeam, [teamId]: players }, loadingTeamId: null }))
    } catch (error) {
      set({ loadingTeamId: null })
      toast.error(error)
    }
  },

  create: async (input) => {
    try {
      const player = await api.players.create(input)
      set((state) => ({
        playersByTeam: {
          ...state.playersByTeam,
          [input.teamId]: [...(state.playersByTeam[input.teamId] ?? []), player],
        },
      }))
      toast.success('Jugador añadido.')
      return player
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  update: async (id, patch) => {
    try {
      const player = await api.players.update(id, patch)
      set((state) => {
        const teamId = patch.teamId
        const playersByTeam = { ...state.playersByTeam }
        if (teamId) {
          for (const key of Object.keys(playersByTeam)) {
            playersByTeam[key] = playersByTeam[key].filter((p) => p.id !== id)
          }
          playersByTeam[teamId] = [...(playersByTeam[teamId] ?? []), player]
        } else {
          for (const key of Object.keys(playersByTeam)) {
            playersByTeam[key] = playersByTeam[key].map((p) => (p.id === id ? player : p))
          }
        }
        return { playersByTeam }
      })
      toast.success('Jugador actualizado.')
      return player
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id, teamId) => {
    try {
      await api.players.remove(id)
      set((state) => ({
        playersByTeam: {
          ...state.playersByTeam,
          [teamId]: (state.playersByTeam[teamId] ?? []).filter((p) => p.id !== id),
        },
      }))
      toast.success('Jugador eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },

  importCsv: async (teamId, text) => {
    const parsed: ParsedPlayerRow[] = playersFromCsv(text)
    const rows = parsed.filter((r) => !r.skipped)
    if (rows.length === 0) throw new Error('El archivo CSV no contiene jugadores.')
    const inputs: NewPlayerInput[] = rows.map((row) => ({
      teamId,
      firstName: row.firstName || row.lastName,
      lastName: row.firstName ? row.lastName : '',
      number: row.number,
      position: row.position,
      photo: null,
      isStarter: true,
    }))
    const imported = await api.players.bulkCreate(inputs)
    await get().reloadTeam(teamId)
    return { imported, total: rows.length }
  },

  clearTeam: (teamId) =>
    set((state) => {
      const playersByTeam = { ...state.playersByTeam }
      delete playersByTeam[teamId]
      return { playersByTeam, selectedTeamId: state.selectedTeamId === teamId ? null : state.selectedTeamId }
    }),
}))
