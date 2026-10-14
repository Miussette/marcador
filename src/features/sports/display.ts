import type { DisplayState } from '@/types'
import { tennisPointLabel } from './rules'

export function scoreText(state: DisplayState, side: 'home' | 'away'): string {
  const sport = state.sportState
  if (sport?.family === 'tennis' && !sport.current.winner) return tennisPointLabel(sport, side)
  const i = side === 'home' ? 0 : 1
  if (sport?.sport === 'judo') return `${sport.current.ippon[i]}/${sport.current.waza[i]}/${sport.current.yuko[i]}`
  return String(side === 'home' ? state.homeScore : state.awayScore)
}

export function displayClock(state: DisplayState, elapsed: number): number {
  const sport = state.sportState
  return sport?.family === 'combat' && !sport.current.goldenScore ? Math.max(0, sport.config.roundSeconds * 1000 - elapsed) : elapsed
}
