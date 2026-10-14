import type { SportAction } from '@/features/sports/types'
import { create } from 'zustand'
import { buildDisplayState, pushDisplayState } from '@/services/displaySync'
import { api } from '@/services/api'
import { timerElapsed } from '@/features/timer/timer'
import type {
  DownTimerSnapshot,
  Match,
  MatchEvent,
  MatchEventUpdate,
  MatchPeriod,
  MatchStatus,
  Project,
  Team,
  TimerSnapshot,
} from '@/types'
import { periodLabel } from '@/utils/format'
import { matchMinute } from '@/utils/time'
import { usePlayersStore } from './playersStore'
import { useCountdownStore } from './countdownStore'
import { useMatchesStore } from './matchesStore'
import { useSettingsStore } from './settingsStore'
import { toast } from './toastStore'

export type Side = 'home' | 'away'

interface ActiveMatchState {
  setPossession: (side: Side | null) => Promise<void>
  sportAction: (action: SportAction) => Promise<void>
  match: Match | null
  playersVisible: boolean | null
  setPlayersVisible: (visible: boolean) => void
  /** Proyecto del partido activo (aporta competencia/sede a la pantalla). */
  project: Project | null
  home: Team | null
  away: Team | null
  events: MatchEvent[]
  loading: boolean
  error: string | null
  saving: boolean

  load: (matchId: string) => Promise<boolean>
  unload: () => void
  syncNow: () => void

  addGoal: (side: Side) => Promise<void>
  removeGoal: (side: Side) => Promise<void>

  /* ------------- Básquetbol: puntos, faltas, tiempos fuera ------------- */
  /** Suma (o resta, con delta negativo) puntos al equipo. */
  addPoints: (side: Side, delta: number) => Promise<void>
  /** Ajusta las faltas acumuladas del equipo (mínimo 0). */
  adjustFouls: (side: Side, delta: number) => Promise<void>
  /** Ajusta los tiempos fuera usados por el equipo (0…5). */
  adjustTimeouts: (side: Side, delta: number) => Promise<void>
  /** Marca/desmarca el resultado como confirmado. */
  setResultConfirmed: (confirmed: boolean) => Promise<void>
  /** Sustituye el cronómetro de posesión (shot clock). */
  setShotClock: (timer: DownTimerSnapshot | null) => Promise<void>
  /** Sustituye el cronómetro de descanso (break timer). */
  setBreakTimer: (timer: DownTimerSnapshot | null) => Promise<void>

  /* ------------- Vóleibol: sets ------------- */
  /** Finaliza el set en curso: lo guarda en `sets` y reinicia los puntos. */
  winSet: (side: Side) => Promise<void>
  /** Deshace el último set guardado (restaura sus puntos al marcador actual). */
  undoSet: () => Promise<void>

  startClock: () => Promise<void>
  pauseClock: () => Promise<void>
  resumeClock: () => Promise<void>
  resetClock: () => Promise<void>
  adjustClock: (deltaMs: number) => Promise<void>

  setPeriod: (period: MatchPeriod) => Promise<void>
  setStatus: (status: MatchStatus) => Promise<void>
  adjustAddedTime: (delta: number) => Promise<void>

  removeEvent: (eventId: string) => Promise<void>
  updateEvent: (eventId: string, patch: MatchEventUpdate) => Promise<void>
  addEvent: (input: Omit<MatchEvent, 'id' | 'createdAt'>) => Promise<void>
  /** Sincroniza la lista de partidos del store con el partido en curso. */
  adoptMatch: (match: Match) => void
}

const timerOf = (match: Match): TimerSnapshot => ({
  running: match.timerRunning,
  startedAt: match.timerStartedAt,
  elapsed: match.timerElapsed,
})

export const useActiveMatchStore = create<ActiveMatchState>((set, get) => {
  const sync = (match: Match): void => {
    const { home, away, project } = get()
    const countdown = useCountdownStore.getState()
    void pushDisplayState(
      buildDisplayState({
        match,
        showPlayers: get().playersVisible ?? (!match.timerRunning && match.timerElapsed === 0 && match.status !== 'finished'),
        playersByTeam: usePlayersStore.getState().playersByTeam,
        home,
        away,
        project,
        countdown: countdown.initialized
          ? {
              durationMs: countdown.durationMs,
              running: countdown.running,
              endAt: countdown.endAt,
              remainingMs: countdown.remainingMs,
              visible: countdown.visible,
            }
          : null,
      }),
    )
  }

  const updateList = (match: Match): void => {
    const store = useMatchesStore.getState()
    useMatchesStore.setState({ matches: store.matches.map((m) => (m.id === match.id ? match : m)) })
  }

  /** Persiste un parche del partido y propaga el estado a la pantalla. */
  const commit = async (patch: Partial<Match>): Promise<Match | null> => {
    const current = get().match
    if (!current) return null
    set({ saving: true })
    try {
      const updated = await api.matches.update(current.id, patch)
      set({ match: updated, ...(updated.timerRunning && !current.timerRunning ? { playersVisible: false } : {}) })
      updateList(updated)
      sync(updated)
      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/no existe|not found/i.test(message)) {
        // El partido fue eliminado (p. ej. se borró su proyecto): se descarta
        // el estado activo para no seguir reintentando guardados inútiles.
        get().unload()
        // Limpia también la pantalla externa (evita mostrar un partido borrado).
        void pushDisplayState(null)
        toast.error('El partido ya no existe (fue eliminado).')
      } else {
        toast.error(error)
      }
      return null
    } finally {
      set({ saving: false })
    }
  }

  return {
    setPossession: async possession => { await commit({ possession }) },
    sportAction: async action => {
      const current = get().match
      if (!current || get().saving) return
      set({ saving: true })
      try {
        const updated = await api.matches.sportAction(current.id, action)
        set({ match: updated, playersVisible: false }); updateList(updated); sync(updated)
      } catch (error) { toast.error(error) } finally { set({ saving: false }) }
    },
    match: null,
    playersVisible: null,
    setPlayersVisible: (visible) => {
      set({ playersVisible: visible })
      get().syncNow()
    },
    project: null,
    home: null,
    away: null,
    events: [],
    loading: false,
    error: null,
    saving: false,

    load: async (matchId) => {
      set({ loading: true, error: null })
      try {
        const match = await api.matches.get(matchId)
        if (!match) {
          set({ loading: false, error: 'No se encontró el partido solicitado.' })
          return false
        }
        const [teams, events, project] = await Promise.all([
          api.teams.list(match.projectId),
          api.events.list(matchId),
          api.projects.get(match.projectId).catch(() => null),
        ])
        const home = teams.find((t) => t.id === match.homeTeamId) ?? null
        const away = teams.find((t) => t.id === match.awayTeamId) ?? null
        // Sanidad: un partido finalizado no puede quedar "grabando" con el
        // cronómetro en marcha (p. ej. estado cambiado en otra sesión). Se
        // congela al abrirlo para que la BD y la pantalla dejen de contar.
        let resolved = match
        if (match.status === 'finished' && match.timerRunning) {
          try {
            resolved = await api.matches.update(match.id, {
              timerRunning: false,
              timerStartedAt: null,
              timerElapsed: timerElapsed(timerOf(match)),
            })
            updateList(resolved)
          } catch {
            resolved = match
          }
        }
        set({ playersVisible: null, match: resolved, project, home, away, events, loading: false, error: null })
        sync(resolved)
        await useMatchesStore.getState().setActive(matchId)
        return true
      } catch (error) {
        set({ loading: false, error: error instanceof Error ? error.message : String(error) })
        toast.error(error)
        return false
      }
    },

    unload: () => set({ match: null, project: null, home: null, away: null, events: [], error: null }),

    syncNow: () => {
      const match = get().match
      if (match) sync(match)
    },

    adoptMatch: (match) => {
      set({ match })
      updateList(match)
      sync(match)
    },

    addGoal: async (side) => {
      const match = get().match
      if (!match) return
      const patch: Partial<Match> =
        side === 'home' ? { homeScore: match.homeScore + 1 } : { awayScore: match.awayScore + 1 }
      const updated = await commit(patch)
      if (!updated) return

      try {
        const teamId = side === 'home' ? updated.homeTeamId : updated.awayTeamId
        const event = await api.events.create({
          matchId: updated.id,
          teamId,
          playerId: null,
          type: 'goal',
          minute: matchMinute(timerElapsed(timerOf(updated))),
          description: side === 'home' ? 'Gol local' : 'Gol visitante',
          secondaryPlayerId: null,
        })
        set((state) => ({ events: [...state.events, event] }))
      } catch (error) {
        toast.error(error)
      }

      if (useSettingsStore.getState().get('display.goalOverlay', 'true') === 'true') {
        try {
          await api.display.overlay({ kind: 'text', text: '¡GOOOL!', dataUrl: null, durationMs: 3000 })
        } catch {
          /* la pantalla puede no estar abierta */
        }
      }
    },

    removeGoal: async (side) => {
      const match = get().match
      if (!match) return
      if (side === 'home') {
        if (match.homeScore <= 0) return
        await commit({ homeScore: match.homeScore - 1 })
      } else {
        if (match.awayScore <= 0) return
        await commit({ awayScore: match.awayScore - 1 })
      }
    },

    addPoints: async (side, delta) => {
      const match = get().match
      if (!match || delta === 0) return
      const key = side === 'home' ? 'homeScore' : 'awayScore'
      const next = Math.max(0, match[key] + delta)
      if (next === match[key]) return
      await commit({ [key]: next } as Partial<Match>)
    },

    adjustFouls: async (side, delta) => {
      const match = get().match
      if (!match || delta === 0) return
      const key = side === 'home' ? 'homeFouls' : 'awayFouls'
      const next = Math.max(0, match[key] + delta)
      if (next === match[key]) return
      await commit({ [key]: next } as Partial<Match>)
    },

    winSet: async (side) => {
      const match = get().match
      if (!match) return
      const currentSet = { home: match.homeScore, away: match.awayScore }
      // Evita guardar sets vacíos (0-0): el operador debe puntuar primero.
      if (currentSet.home === 0 && currentSet.away === 0) {
        toast.error('Suma puntos antes de finalizar el set.')
        return
      }
      const updated = await commit({
        sets: [...(match.sets ?? []), currentSet],
        homeScore: 0,
        awayScore: 0,
      })
      if (!updated) return
      try {
        const event = await api.events.create({
          matchId: updated.id,
          teamId: side === 'home' ? updated.homeTeamId : updated.awayTeamId,
          playerId: null,
          type: 'set',
          minute: matchMinute(timerElapsed(timerOf(updated))),
          description:
            (side === 'home' ? 'Set local ' : 'Set visitante ') +
            `${currentSet.home}-${currentSet.away}`,
          secondaryPlayerId: null,
        })
        set((state) => ({ events: [...state.events, event] }))
      } catch (error) {
        toast.error(error)
      }
    },

    undoSet: async () => {
      const match = get().match
      if (!match || !match.sets || match.sets.length === 0) return
      const last = match.sets[match.sets.length - 1]
      await commit({
        sets: match.sets.slice(0, -1),
        homeScore: last.home,
        awayScore: last.away,
      })
    },

    adjustTimeouts: async (side, delta) => {
      const match = get().match
      if (!match || delta === 0) return
      const key = side === 'home' ? 'homeTimeouts' : 'awayTimeouts'
      const next = Math.min(5, Math.max(0, match[key] + delta))
      if (next === match[key]) return
      await commit({ [key]: next } as Partial<Match>)
    },

    setResultConfirmed: async (confirmed) => {
      const match = get().match
      if (!match || match.resultConfirmed === confirmed) return
      await commit({ resultConfirmed: confirmed })
      toast.info(confirmed ? 'Resultado confirmado.' : 'Confirmación de resultado anulada.')
    },

    setShotClock: async (timer) => {
      const match = get().match
      if (!match) return
      await commit({ shotClock: timer })
    },

    setBreakTimer: async (timer) => {
      const match = get().match
      if (!match) return
      await commit({ breakTimer: timer })
    },

    startClock: async () => {
      const match = get().match
      if (!match) return
      if (match.status === 'finished') {
        toast.info('Partido finalizado: cambia el estado a "En juego" para controlar el cronómetro.')
        return
      }
      const patch: Partial<Match> = {
        timerRunning: true,
        timerStartedAt: Date.now(),
        timerElapsed: 0,
      }
      if (match.status === 'scheduled') patch.status = 'live'
      await commit(patch)
    },

    pauseClock: async () => {
      const match = get().match
      if (!match || !match.timerRunning) return
      await commit({
        timerRunning: false,
        timerStartedAt: null,
        timerElapsed: timerElapsed(timerOf(match)),
      })
    },

    resumeClock: async () => {
      const match = get().match
      if (!match || match.timerRunning) return
      if (match.sportState?.family === 'combat' && !match.sportState.current.goldenScore && match.timerElapsed >= match.sportState.config.roundSeconds * 1000) {
        toast.info('El round terminó. Reinicia el reloj o avanza al siguiente round.')
        return
      }
      if (match.status === 'finished') {
        toast.info('Partido finalizado: cambia el estado a "En juego" para controlar el cronómetro.')
        return
      }
      await commit({ timerRunning: true, timerStartedAt: Date.now(), ...(match.status === 'scheduled' ? { status: 'live' } : {}) })
    },

    resetClock: async () => {
      if (!get().match) return
      await commit({ timerRunning: false, timerStartedAt: null, timerElapsed: 0 })
    },

    adjustClock: async (deltaMs) => {
      const match = get().match
      if (!match) return
      const timer = timerOf(match)
      const total = Math.max(0, timerElapsed(timer) + deltaMs)
      if (timer.running) {
        await commit({ timerRunning: true, timerStartedAt: Date.now() - total, timerElapsed: 0 })
      } else {
        await commit({ timerRunning: false, timerStartedAt: null, timerElapsed: total })
      }
    },

    setPeriod: async (period) => {
      const match = get().match
      if (!match || match.period === period) return
      await commit({
        period,
        timerRunning: false,
        timerStartedAt: null,
        timerElapsed: 0,
        status: period === 'finished' ? 'finished' : match.status === 'finished' ? 'live' : match.status,
      })
      toast.info(`Periodo: ${periodLabel(period)} (cronómetro a 00:00)`)
    },

    setStatus: async (status) => {
      const match = get().match
      if (!match || match.status === status) return
      const patch: Partial<Match> = { status }
      if (status === 'finished' && match.timerRunning) {
        patch.timerRunning = false
        patch.timerStartedAt = null
        patch.timerElapsed = timerElapsed(timerOf(match))
      }
      const updated = await commit(patch)
      if (updated && status === 'finished') {
        toast.info('Partido finalizado · cronómetro detenido.')
      }
    },

    adjustAddedTime: async (delta) => {
      const match = get().match
      if (!match) return
      const next = Math.min(20, Math.max(0, match.addedTime + delta))
      if (next === match.addedTime) return
      await commit({ addedTime: next })
    },

    removeEvent: async (eventId) => {
      try {
        await api.events.remove(eventId)
        set((state) => ({ events: state.events.filter((e) => e.id !== eventId) }))
        toast.info('Evento eliminado.')
      } catch (error) {
        toast.error(error)
      }
    },

    updateEvent: async (eventId, patch) => {
      try {
        const updated = await api.events.update(eventId, patch)
        set((state) => ({
          events: state.events.map((e) => (e.id === eventId ? updated : e)),
        }))
        toast.success('Evento actualizado.')
      } catch (error) {
        toast.error(error)
      }
    },

    addEvent: async (input) => {
      try {
        const event = await api.events.create(input)
        set((state) => ({ events: [...state.events, event] }))
        toast.success('Evento registrado.')
      } catch (error) {
        toast.error(error)
      }
    },
  }
})

/** Minuto actual del cronómetro (para pintar la timeline). */
export function currentMatchMinute(match: Match | null): number {
  if (!match) return 0
  return matchMinute(timerElapsed(timerOf(match)))
}
