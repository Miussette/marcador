import { sportPeriod } from '@/features/sports/rules'
import type { CountdownSnapshot, DisplayState, DisplaySyncState, Match, Project, Team, Player } from '@/types'
import { periodLabel } from '@/utils/format'
import { api } from './api'
import { basketballDuration } from '@/features/timer/basketballClocks'

export function buildDisplayState(input: {
  match: Match
  showPlayers?: boolean
  playersByTeam?: Record<string, Player[]>
  home: Team | null
  away: Team | null
  /** Proyecto del partido: aporta competencia/sede si el partido no los trae. */
  project?: Project | null
  /** Estado de la cuenta atrás (la pantalla la dibuja encima). */
  countdown?: CountdownSnapshot | null
}): DisplaySyncState {
  const { match, home, away, project, countdown } = input
  const teamInfo = (team: Team | null): DisplayState['home'] =>
    team
      ? {
          players: input.playersByTeam?.[team.id] ?? [],
          id: team.id,
          name: team.name,
          shortName: team.shortName || team.name,
          logo: team.logo,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
        }
      : null

  return {
    gameDurationMs: ['basketball', 'basketball3x3'].includes(project?.sport ?? '') ? basketballDuration(match) : null,
    timeoutTimer: match.timeoutActive ? match.breakTimer : null,
    playerStats: match.playerStats ?? {},
    homeTimeouts: match.homeTimeouts,
    awayTimeouts: match.awayTimeouts,
    possession: match.possession ?? null,
    sportState: match.sportState ? { ...match.sportState, history: [] } : null,
    showPlayers: input.showPlayers ?? false,
    matchId: match.id,
    competition: match.competition || project?.name || '',
    round: match.round,
    venue: match.venue || project?.location || '',
    status: match.status,
    period: match.period,
    periodLabel: match.sportState ? sportPeriod(match.sportState) : periodLabel(match.period),
    addedTime: match.addedTime,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    home: teamInfo(home),
    away: teamInfo(away),
    timer: {
      running: match.timerRunning,
      startedAt: match.timerStartedAt,
      elapsed: match.timerElapsed,
    },
    countdown: countdown ?? null,
    homeFouls: match.sportState ? null : match.homeFouls ?? 0,
    awayFouls: match.sportState ? null : match.awayFouls ?? 0,
    shotClock: match.shotClock ?? null,
    sets: match.sets ?? [],
    updatedAt: Date.now(),
  }
}

/** Empuja el estado actual a la ventana Display (null = pantalla de espera; silencioso si falla). */
export async function pushDisplayState(state: DisplaySyncState | null): Promise<void> {
  if (!window.api) return
  try {
    await api.display.sync(state)
  } catch (error) {
    console.warn('[display] No se pudo sincronizar la pantalla:', error)
  }
}
