import { sportCategoryOf, type SportId } from '@/types'
import type { AthleticResult, Pair, RuleConfig, RuleFamily, SportAction, SportMatchState, SportSide, SportSnapshot } from './types'

const indexOf = (side: SportSide): 0 | 1 => side === 'home' ? 0 : 1
const opposite = (side: SportSide): SportSide => side === 'home' ? 'away' : 'home'
const sideOf = (index: number): SportSide => index === 0 ? 'home' : 'away'

export function ruleFamily(sport: string): RuleFamily | null {
  if (['tennis', 'padel'].includes(sport)) return 'tennis'
  if (['volleyball', 'beach_volleyball', 'snow_volleyball', 'table_tennis', 'badminton', 'squash'].includes(sport)) return 'sets'
  if (sport === 'baseball') return 'baseball'
  if (sportCategoryOf(sport) === 'marcial') return 'combat'
  if (sportCategoryOf(sport) === 'atletismo' || ['swimming', 'speed_skating', 'road_cycling', 'cross_country_ski'].includes(sport)) return 'athletics'
  return null
}

export function initialSportState(sport: SportId): SportMatchState {
  const family = ruleFamily(sport)
  if (!family) throw new Error('Este deporte utiliza el control general.')
  const field = ['long_jump', 'high_jump', 'throws'].includes(sport)
  const config: RuleConfig = {
    setsToWin: sport === 'volleyball' || sport === 'squash' || sport === 'table_tennis' ? 3 : 2,
    target: sport === 'volleyball' ? 25 : ['beach_volleyball', 'badminton'].includes(sport) ? 21 : sport === 'snow_volleyball' ? 15 : 11,
    decidingTarget: ['volleyball', 'beach_volleyball', 'snow_volleyball'].includes(sport) ? 15 : sport === 'badminton' ? 21 : 11,
    cap: sport === 'badminton' ? 30 : 0,
    gamesToWin: 6, tieBreak: 7, finalTieBreak: 7,
    deuce: sport === 'padel' ? 'star' : 'advantage',
    innings: 9, rounds: sport === 'wrestling' ? 2 : sport === 'judo' || sport === 'karate' ? 1 : 3,
    roundSeconds: sport === 'mma' ? 300 : sport === 'judo' ? 240 : sport === 'taekwondo' ? 120 : 180,
    attempts: field ? 3 : 1, unit: field ? 'meters' : 'seconds', lowerWins: !field,
  }
  const current: SportSnapshot = {
    points: [0, 0], games: [0, 0], sets: [], server: 'home', tieFirst: 'home', tieBreak: false, deuceReturns: 0,
    inning: 1, half: 'top', balls: 0, strikes: 0, outs: 0, bases: [false, false, false], hits: [0, 0], errors: [0, 0], inningRuns: [[0, 0]],
    round: 1, penalties: [0, 0], ippon: [0, 0], waza: [0, 0], yuko: [0, 0], goldenScore: false, results: [], winner: null,
  }
  return { version: 1, sport, family, config, current, history: [] }
}

export function setsWon(sets: Pair[]): Pair {
  return sets.reduce<Pair>((won, set) => { if (set[0] !== set[1]) won[set[0] > set[1] ? 0 : 1] += 1; return won }, [0, 0])
}

function validateConfig(config: RuleConfig): void {
  const bounds: [keyof RuleConfig, number, number][] = [
    ['setsToWin', 1, 5], ['target', 1, 99], ['decidingTarget', 1, 99], ['cap', 0, 199],
    ['gamesToWin', 1, 12], ['tieBreak', 1, 30], ['finalTieBreak', 1, 30], ['innings', 1, 20],
    ['rounds', 1, 15], ['roundSeconds', 10, 1800], ['attempts', 1, 12],
  ]
  for (const [key, min, max] of bounds) {
    const value = config[key]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`Valor inválido para ${key}.`)
  }
  if (!['advantage', 'golden', 'star'].includes(config.deuce) || !['seconds', 'meters', 'points'].includes(config.unit) || typeof config.lowerWins !== 'boolean') throw new Error('Configuración inválida.')
  if (config.cap > 0 && config.cap < Math.max(config.target, config.decidingTarget)) throw new Error('El límite no puede ser menor que los puntos necesarios para ganar.')
}

function endSet(state: SportMatchState, score: Pair): void {
  const current = state.current
  current.sets.push([...score])
  current.points = [0, 0]; current.games = [0, 0]; current.tieBreak = false; current.deuceReturns = 0
  if (state.sport === 'table_tennis') { current.server = opposite(current.tieFirst); current.tieFirst = current.server }
  const won = setsWon(current.sets)
  if (Math.max(...won) >= state.config.setsToWin) current.winner = sideOf(won[0] > won[1] ? 0 : 1)
}

function tennisPoint(state: SportMatchState, side: SportSide): void {
  const { current: c, config } = state
  const i = indexOf(side), other = 1 - i
  c.points[i] += 1
  if (c.tieBreak) {
    const lastSet = c.sets.length === 2 * config.setsToWin - 2
    if (c.points[i] >= (lastSet ? config.finalTieBreak : config.tieBreak) && c.points[i] - c.points[other] >= 2) {
      c.games[i] += 1
      c.server = opposite(c.tieFirst)
      endSet(state, c.games)
    } else if ((c.points[0] + c.points[1]) % 2 === 1) c.server = opposite(c.server)
    return
  }
  const sudden = config.deuce === 'golden' || (config.deuce === 'star' && c.deuceReturns >= 2)
  if (c.points[i] >= 4 && c.points[i] - c.points[other] >= (sudden ? 1 : 2)) {
    c.games[i] += 1; c.points = [0, 0]; c.deuceReturns = 0; c.server = opposite(c.server)
    if (c.games[i] >= config.gamesToWin && c.games[i] - c.games[other] >= 2) endSet(state, c.games)
    else if (c.games[0] === config.gamesToWin && c.games[1] === config.gamesToWin) { c.tieBreak = true; c.tieFirst = c.server }
  } else if (c.points[0] >= 4 && c.points[0] === c.points[1]) {
    c.points = [3, 3]; c.deuceReturns += 1
  }
}

function rallyPoint(state: SportMatchState, side: SportSide): void {
  const { current: c, config } = state
  const i = indexOf(side), other = 1 - i
  c.points[i] += 1
  if (state.sport === 'table_tennis') {
    const total = c.points[0] + c.points[1]
    if ((c.points[0] >= config.target - 1 && c.points[1] >= config.target - 1) || total % 2 === 0) c.server = opposite(c.server)
  } else c.server = side
  const target = c.sets.length === 2 * config.setsToWin - 2 ? config.decidingTarget : config.target
  if ((c.points[i] >= target && c.points[i] - c.points[other] >= 2) || (config.cap > 0 && c.points[i] >= config.cap)) endSet(state, c.points)
}

function baseballFinish(state: SportMatchState): void {
  const c = state.current
  if (c.inning >= state.config.innings && c.half === 'bottom' && c.points[0] > c.points[1]) c.winner = 'home'
}

function nextHalf(state: SportMatchState): void {
  const c = state.current
  if (c.half === 'top') {
    c.half = 'bottom'; baseballFinish(state)
  } else {
    if (c.inning >= state.config.innings && c.points[0] !== c.points[1]) c.winner = c.points[0] > c.points[1] ? 'home' : 'away'
    if (!c.winner) { c.inning += 1; c.half = 'top'; c.inningRuns.push([0, 0]) }
  }
  c.balls = 0; c.strikes = 0; c.outs = 0; c.bases = [false, false, false]
}

function baseballOut(state: SportMatchState): void {
  const c = state.current
  c.outs += 1; c.balls = 0; c.strikes = 0
  if (c.outs === 3) nextHalf(state)
}

function baseballWalk(state: SportMatchState): void {
  const c = state.current
  if (c.bases[0] && c.bases[1] && c.bases[2]) {
    const batting = c.half === 'top' ? 1 : 0
    c.points[batting] += 1; c.inningRuns[c.inning - 1][batting] += 1
  }
  if (c.bases[0] && c.bases[1]) c.bases[2] = true
  if (c.bases[0]) c.bases[1] = true
  c.bases[0] = true; c.balls = 0; c.strikes = 0
  baseballFinish(state)
}

export function applySportAction(previous: SportMatchState, action: SportAction): SportMatchState {
  const state: SportMatchState = structuredClone(previous)
  if (action.type === 'undo') {
    const last = state.history.pop()
    if (!last) throw new Error('No hay acciones para deshacer.')
    state.current = last
    return state
  }
  if (action.type === 'configure') {
    if (state.history.length || state.current.winner) throw new Error('Configura el reglamento antes de registrar acciones. Para cambiarlo, reinicia este marcador.')
    const allowed = Object.keys(state.config)
    if (Object.keys(action.config).some(key => !allowed.includes(key))) throw new Error('Opción de reglamento desconocida.')
    state.config = { ...state.config, ...action.config }
    validateConfig(state.config)
    return state
  }
  if (action.type === 'reset') {
    const initial = initialSportState(state.sport)
    initial.config = state.config
    return initial
  }
  if (state.current.winner) throw new Error('El resultado está finalizado. Deshaz la última acción para corregirlo.')
  const c = state.current
  if ('side' in action && !['home', 'away'].includes(action.side)) throw new Error('Participante inválido.')
  state.history.push(structuredClone(c)); state.history = state.history.slice(-100)
  if (action.type === 'serve' && ['tennis', 'sets'].includes(state.family)) {
    c.server = action.side; if ((c.tieBreak || state.sport === 'table_tennis') && c.points[0] + c.points[1] === 0) c.tieFirst = action.side
  } else if (action.type === 'point' && state.family === 'tennis') tennisPoint(state, action.side)
  else if (action.type === 'point' && state.family === 'sets') rallyPoint(state, action.side)
  else if (state.family === 'baseball') {
    switch (action.type) {
      case 'ball': c.balls += 1; if (c.balls === 4) baseballWalk(state); break
      case 'strike': c.strikes += 1; if (c.strikes === 3) baseballOut(state); break
      case 'foul': c.strikes = Math.min(2, c.strikes + 1); break
      case 'out': baseballOut(state); break
      case 'batter': c.balls = 0; c.strikes = 0; break
      case 'half': nextHalf(state); break
      case 'base': if (![0, 1, 2].includes(action.index)) throw new Error('Base inválida.'); c.bases[action.index] = !c.bases[action.index]; break
      case 'run': case 'hit': case 'error': {
        if (!Number.isInteger(action.delta) || Math.abs(action.delta) !== 1) throw new Error('Ajuste inválido.')
        const i = indexOf(action.side)
        if (action.type === 'run') {
          if (i !== (c.half === 'top' ? 1 : 0)) throw new Error('Solo puede anotar el equipo al bate.')
          const inning = c.inningRuns[c.inning - 1]
          if (action.delta < 0 && inning[i] === 0) throw new Error('No hay carreras para restar en esta entrada.')
          inning[i] += action.delta; c.points[i] += action.delta; baseballFinish(state)
        } else {
          const values = action.type === 'hit' ? c.hits : c.errors
          values[i] = Math.max(0, values[i] + action.delta)
        }
        break
      }
      default: throw new Error('Acción no disponible para béisbol.')
    }
  } else if (state.family === 'combat') {
    switch (action.type) {
      case 'point': {
        if (state.sport === 'judo') throw new Error('En judo registra la técnica: ippon, waza-ari o yuko.')
        const delta = action.delta ?? 1
        if (!Number.isInteger(delta) || Math.abs(delta) > 10 || delta === 0) throw new Error('Puntuación inválida.')
        c.points[indexOf(action.side)] = Math.max(0, c.points[indexOf(action.side)] + delta)
        break
      }
      case 'penalty': {
        const i = indexOf(action.side)
        c.penalties[i] += 1
        if (state.sport === 'judo' && c.penalties[i] >= 3) c.winner = opposite(action.side)
        break
      }
      case 'technique': {
        if (state.sport !== 'judo' || !['ippon', 'waza', 'yuko'].includes(action.technique)) throw new Error('Técnica inválida.')
        const i = indexOf(action.side)
        c[action.technique][i] += 1
        if (action.technique === 'ippon' || c.waza[i] >= 2 || c.goldenScore) c.winner = action.side
        c.points = [c.ippon[0] * 100 + c.waza[0] * 10 + c.yuko[0], c.ippon[1] * 100 + c.waza[1] * 10 + c.yuko[1]]
        break
      }
      case 'golden': if (state.sport !== 'judo') throw new Error('Golden Score solo corresponde a judo.'); c.goldenScore = true; break
      case 'round': if (c.round >= state.config.rounds) throw new Error('Ya estás en el último round. Registra la decisión del árbitro.'); c.round += 1; break
      case 'finish': if (!['home', 'away', 'draw'].includes(action.winner)) throw new Error('Resultado inválido.'); c.winner = action.winner; break
      default: throw new Error('Acción no disponible para combate.')
    }
  } else if (state.family === 'athletics') {
    if (action.type === 'result') {
      const r = action.result
      if (!r.id || typeof r.id !== 'string' || !r.name?.trim() || r.name.length > 200 || !['valid', 'dns', 'dnf', 'dq'].includes(r.status) || !Array.isArray(r.attempts) || r.attempts.length > state.config.attempts || r.attempts.some(value => value !== null && (!Number.isFinite(value) || value < 0))) throw new Error('Resultado inválido.')
      c.results = [...c.results.filter(result => result.id !== r.id), { ...r, name: r.name.trim() }]
    } else if (action.type === 'removeResult') c.results = c.results.filter(r => r.id !== action.id)
    else throw new Error('Acción no disponible para pruebas de marcas.')
  } else throw new Error('Acción no disponible para este deporte.')
  return state
}

export function tennisPointLabel(state: SportMatchState, side: SportSide): string {
  const c = state.current, i = indexOf(side)
  if (c.tieBreak) return String(c.points[i])
  if (c.points[0] >= 3 && c.points[1] >= 3) return c.points[i] > c.points[1 - i] ? 'AD' : '40'
  return ['0', '15', '30', '40'][Math.min(3, c.points[i])]
}

export function sportPeriod(state: SportMatchState): string {
  const c = state.current
  if (c.winner) return 'Finalizado'
  if (state.family === 'tennis' || state.family === 'sets') return `Set ${c.sets.length + 1}${c.tieBreak ? ' · Tie-break' : state.config.deuce === 'star' && c.points[0] === 3 && c.points[1] === 3 && c.deuceReturns >= 2 ? ' · Star Point' : ''}`
  if (state.family === 'baseball') return `${c.inning}ª entrada · ${c.half === 'top' ? 'Alta' : 'Baja'}`
  if (state.family === 'combat') return c.goldenScore ? 'Golden Score' : `Round ${c.round} de ${state.config.rounds}`
  return 'Resultados de la prueba'
}

export function rankedResults(state: SportMatchState): { result: AthleticResult; best: number | null; rank: number | null }[] {
  const rows = state.current.results.map(result => {
    const marks = result.attempts.filter((mark): mark is number => mark !== null)
    return { result, best: result.status === 'valid' && marks.length ? (state.config.lowerWins ? Math.min(...marks) : Math.max(...marks)) : null, rank: null as number | null }
  }).sort((a, b) => a.best === null ? (b.best === null ? 0 : 1) : b.best === null ? -1 : state.config.lowerWins ? a.best - b.best : b.best - a.best)
  rows.forEach((row, index) => { if (row.best !== null) row.rank = index > 0 && row.best === rows[index - 1].best ? rows[index - 1].rank : index + 1 })
  return rows
}

export function sportScores(state: SportMatchState): Pair {
  if (state.family === 'tennis' || state.family === 'sets') return state.current.winner ? setsWon(state.current.sets) : state.current.points
  return state.current.points
}
