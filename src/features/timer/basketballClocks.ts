import type { Match } from '@/types'
import { createDownTimer, downTimerRemaining, pauseDownTimer, startDownTimer, timerElapsed } from './timer'

export function basketballDuration(match: Pick<Match, 'period' | 'gameDurationMs'>): number {
  return match.gameDurationMs ?? (match.period === 'extra_time' ? 300000 : 600000)
}
export function basketballRemaining(match: Match, now = Date.now()): number {
  return Math.max(0, basketballDuration(match) - timerElapsed({ running: match.timerRunning, startedAt: match.timerStartedAt, elapsed: match.timerElapsed }, now))
}
export function pauseBasketball(match: Match, now = Date.now()): Partial<Match> {
  return { timerRunning: false, timerStartedAt: null, timerElapsed: Math.min(basketballDuration(match), timerElapsed({ running: match.timerRunning, startedAt: match.timerStartedAt, elapsed: match.timerElapsed }, now)), shotClock: pauseDownTimer(match.shotClock ?? createDownTimer(24000), now) }
}
export function startBasketballShot(match: Match, now = Date.now()): Partial<Match> {
  return { shotClock: startDownTimer(match.shotClock ?? createDownTimer(24000), now), timeoutActive: false, breakTimer: match.timeoutActive && match.breakTimer ? pauseDownTimer(match.breakTimer, now) : match.breakTimer }
}
export function timeoutPatch(match: Match, now = Date.now()): Partial<Match> {
  return { ...pauseBasketball(match, now), timeoutActive: true, breakTimer: startDownTimer(createDownTimer(match.breakTimer?.durationMs ?? 60000), now) }
}
export function expiredBasketballPatch(match: Match, now = Date.now()): Partial<Match> | null {
  const gameExpired = match.timerRunning && basketballRemaining(match, now) <= 0
  const shotExpired = match.shotClock?.running && downTimerRemaining(match.shotClock, now) <= 0
  const breakExpired = match.breakTimer?.running && downTimerRemaining(match.breakTimer, now) <= 0
  if (!gameExpired && !shotExpired && !breakExpired) return null
  return { ...(gameExpired || shotExpired ? pauseBasketball(match, now) : {}), ...(breakExpired ? { breakTimer: { ...match.breakTimer!, running: false, endAt: null, remainingMs: 0 }, timeoutActive: false } : {}) }
}
