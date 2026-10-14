import type { SportId } from '@/types'

export type SportSide = 'home' | 'away'
export type Pair = [number, number]
export type RuleFamily = 'tennis' | 'sets' | 'baseball' | 'combat' | 'athletics'
export interface RuleConfig {
  setsToWin: number
  target: number
  decidingTarget: number
  cap: number
  gamesToWin: number
  tieBreak: number
  finalTieBreak: number
  deuce: 'advantage' | 'golden' | 'star'
  innings: number
  rounds: number
  roundSeconds: number
  attempts: number
  unit: 'seconds' | 'meters' | 'points'
  lowerWins: boolean
}
export interface AthleticResult {
  id: string
  name: string
  attempts: (number | null)[]
  status: 'valid' | 'dns' | 'dnf' | 'dq'
}
export interface SportSnapshot {
  points: Pair
  games: Pair
  sets: Pair[]
  server: SportSide
  tieFirst: SportSide
  tieBreak: boolean
  deuceReturns: number
  inning: number
  half: 'top' | 'bottom'
  balls: number
  strikes: number
  outs: number
  bases: [boolean, boolean, boolean]
  hits: Pair
  errors: Pair
  inningRuns: Pair[]
  round: number
  penalties: Pair
  ippon: Pair
  waza: Pair
  yuko: Pair
  goldenScore: boolean
  results: AthleticResult[]
  winner: SportSide | 'draw' | null
}
export interface SportMatchState {
  version: 1
  sport: SportId
  family: RuleFamily
  config: RuleConfig
  current: SportSnapshot
  history: SportSnapshot[]
}
export type SportAction =
  | { type: 'point'; side: SportSide; delta?: number }
  | { type: 'undo' | 'reset' | 'ball' | 'strike' | 'foul' | 'out' | 'batter' | 'half' | 'round' | 'golden' }
  | { type: 'configure'; config: Partial<RuleConfig> }
  | { type: 'serve'; side: SportSide }
  | { type: 'base'; index: number }
  | { type: 'run' | 'hit' | 'error'; side: SportSide; delta: number }
  | { type: 'penalty'; side: SportSide }
  | { type: 'technique'; side: SportSide; technique: 'ippon' | 'waza' | 'yuko' }
  | { type: 'finish'; winner: SportSide | 'draw' }
  | { type: 'result'; result: AthleticResult }
  | { type: 'removeResult'; id: string }
