import { initialSportState, applySportAction, ruleFamily, sportScores } from '../src/features/sports/rules'
import type { SportAction } from '../src/features/sports/types'
import { EXTRA_SHORTCUT_ACTIONS, normalizeShortcut, validShortcut } from '../src/utils/shortcuts'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { dialog } from 'electron'
import { all, get, run } from './db'
import type {
  CompetitionProps,
  DownTimerSnapshot,
  ExportResult,
  ImportResult,
  Match,
  MatchAct,
  MatchEvent,
  MatchEventUpdate,
  MatchOfficial,
  MatchOfficialUpdate,
  MatchSet,
  MediaItem,
  NewMatchActInput,
  NewMatchEventInput,
  NewMatchInput,
  NewMatchOfficialInput,
  NewOperatorProfileInput,
  NewPlayerInput,
  NewProjectInput,
  NewScheduledSequenceInput,
  NewShortcutBindingInput,
  NewSponsorRotationInput,
  NewStandingEntryInput,
  NewTeamInput,
  NewVideoInput,
  OperatorProfile,
  Player,
  Project,
  ScheduledSequence,
  ShortcutBinding,
  SponsorRotation,
  StandingEntry,
  Team,
  VideoItem,
} from '../src/types'

const uid = (): string => randomUUID()
const now = (): number => Date.now()

/* ----------------------------- helpers ---------------------------- */

type Row = Record<string, unknown>

const str = (v: unknown, fallback = ''): string =>
  v === null || v === undefined ? fallback : String(v)
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' ? v : Number(v ?? fallback) || fallback
const nullableStr = (v: unknown): string | null =>
  v === null || v === undefined || v === '' ? null : String(v)

function rowToCompProps(value: unknown): CompetitionProps | null {
  if (!value || typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value) as Partial<CompetitionProps>
    const props: CompetitionProps = {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      code: typeof parsed.code === 'string' ? parsed.code : '',
      session: typeof parsed.session === 'string' ? parsed.session : '',
      court: typeof parsed.court === 'string' ? parsed.court : '',
      workingMode: parsed.workingMode === 'server' ? 'server' : 'standalone',
      serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : '',
      uploadResults: parsed.uploadResults !== false,
      uploadPlayByPlay: parsed.uploadPlayByPlay !== false,
    }
    const hasAny =
      props.title ||
      props.code ||
      props.session ||
      props.court ||
      props.serverUrl ||
      props.workingMode === 'server'
    return hasAny ? props : null
  } catch {
    return null
  }
}

const compPropsToDb = (props: CompetitionProps | null | undefined): string | null => {
  if (!props) return null
  const normalized: CompetitionProps = {
    title: props.title ?? '',
    code: props.code ?? '',
    session: props.session ?? '',
    court: props.court ?? '',
    workingMode: props.workingMode === 'server' ? 'server' : 'standalone',
    serverUrl: props.serverUrl ?? '',
    uploadResults: props.uploadResults !== false,
    uploadPlayByPlay: props.uploadPlayByPlay !== false,
  }
  const hasAny =
    normalized.title ||
    normalized.code ||
    normalized.session ||
    normalized.court ||
    normalized.serverUrl ||
    normalized.workingMode === 'server'
  return hasAny ? JSON.stringify(normalized) : null
}

function rowToProject(r: Row): Project {
  return {
    id: str(r.id),
    name: str(r.name),
    sport: str(r.sport) as Project['sport'],
    season: str(r.season),
    location: str(r.location),
    date: str(r.date),
    modality: str(r.modality) as Project['modality'],
    compProps: rowToCompProps(r.comp_props),
    status: str(r.status, 'active') as Project['status'],
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  }
}

function rowToTeam(r: Row): Team {
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    name: str(r.name),
    shortName: str(r.short_name),
    code: str(r.code),
    logo: nullableStr(r.logo),
    primaryColor: str(r.primary_color, '#2563EB'),
    secondaryColor: str(r.secondary_color, '#FFFFFF'),
    city: str(r.city),
    country: str(r.country),
    countryCode: str(r.country_code),
    lot: str(r.lot),
    createdAt: num(r.created_at),
  }
}

function rowToPlayer(r: Row): Player {
  return {
    id: str(r.id),
    teamId: str(r.team_id),
    firstName: str(r.first_name),
    lastName: str(r.last_name),
    number: r.number === null || r.number === undefined ? null : num(r.number),
    position: str(r.position),
    photo: nullableStr(r.photo),
    isStarter: num(r.is_starter, 1) === 1,
    createdAt: num(r.created_at),
  }
}

function rowToMatch(r: Row): Match {
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    homeTeamId: str(r.home_team_id),
    awayTeamId: str(r.away_team_id),
    homeScore: num(r.home_score),
    awayScore: num(r.away_score),
    status: str(r.status, 'scheduled') as Match['status'],
    period: str(r.period, 'first_half') as Match['period'],
    venue: str(r.venue),
    kickoff: str(r.kickoff),
    round: str(r.round),
    competition: str(r.competition),
    addedTime: num(r.added_time),
    timerRunning: num(r.timer_running) === 1,
    timerStartedAt: r.timer_started_at === null || r.timer_started_at === undefined ? null : num(r.timer_started_at),
    timerElapsed: num(r.timer_elapsed),
    homeFouls: num(r.home_fouls),
    awayFouls: num(r.away_fouls),
    homeTimeouts: num(r.home_timeouts),
    possession: r.possession === 'home' || r.possession === 'away' ? r.possession : null,
    awayTimeouts: num(r.away_timeouts),
    shotClock: downTimerFromDb(r.shot_clock),
    breakTimer: downTimerFromDb(r.break_timer),
    gameDurationMs: r.game_duration_ms == null ? null : num(r.game_duration_ms),
    timeoutActive: num(r.timeout_active) === 1,
    resultConfirmed: num(r.result_confirmed) === 1,
    sets: setsFromDb(r.sets),
    playerStats: statsFromDb(r.player_stats),
    sportState: r.sport_state ? JSON.parse(str(r.sport_state)) : null,
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  }
}

/** Parsea un DownTimerSnapshot persistido como JSON (null si no existe o es inválido). */
function downTimerFromDb(value: unknown): DownTimerSnapshot | null {
  if (!value || typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value) as Partial<DownTimerSnapshot>
    return {
      durationMs: num(parsed.durationMs, 24_000),
      running: parsed.running === true,
      endAt: parsed.endAt === null || parsed.endAt === undefined ? null : num(parsed.endAt),
      remainingMs: num(parsed.remainingMs),
    }
  } catch {
    return null
  }
}

const downTimerToDb = (timer: DownTimerSnapshot | null | undefined): string | null =>
  timer ? JSON.stringify(timer) : null

/** Parsea los sets de vóleibol persistidos como JSON (vacío si no existe o es inválido). */
function setsFromDb(value: unknown): MatchSet[] {
  if (!value || typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((s) => {
      const item = s as Partial<MatchSet>
      return { home: num(item.home), away: num(item.away) }
    })
  } catch {
    return []
  }
}

const setsToDb = (sets: MatchSet[] | null | undefined): string =>
  JSON.stringify(Array.isArray(sets) ? sets : [])

function rowToEvent(r: Row): MatchEvent {
  return {
    id: str(r.id),
    matchId: str(r.match_id),
    teamId: nullableStr(r.team_id),
    playerId: nullableStr(r.player_id),
    type: str(r.type) as MatchEvent['type'],
    minute: num(r.minute),
    description: str(r.description),
    secondaryPlayerId: nullableStr(r.secondary_player_id),
    createdAt: num(r.created_at),
  }
}

function rowToMedia(r: Row): MediaItem {
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    name: str(r.name),
    kind: str(r.kind) as MediaItem['kind'],
    data: str(r.data),
    duration: num(r.duration, 5),
    createdAt: num(r.created_at),
  }
}

/* ----------------------------- proyectos --------------------------- */

export function listProjects(): Project[] {
  return all<Row>('SELECT * FROM projects ORDER BY updated_at DESC').map(rowToProject)
}

export function getProject(id: string): Project | undefined {
  const r = get<Row>('SELECT * FROM projects WHERE id = ?', [id])
  return r ? rowToProject(r) : undefined
}

export function createProject(input: NewProjectInput): Project {
  const name = input.name.trim()
  if (!name) throw new Error('El nombre de la competencia es obligatorio.')
  const id = uid()
  const ts = now()
  run(
    `INSERT INTO projects (id, name, sport, season, location, date, modality, comp_props, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [id, name, input.sport, input.season, input.location, input.date, input.modality, compPropsToDb(input.compProps), ts, ts],
  )
  return getProject(id) as Project
}

export function updateProject(id: string, patch: Partial<NewProjectInput>): Project {
  const current = getProject(id)
  if (!current) throw new Error('El proyecto no existe.')
  const next = { ...current, ...patch }
  if (!next.name.trim()) throw new Error('El nombre de la competencia no puede estar vacío.')
  const compProps = 'compProps' in patch ? (patch.compProps ?? null) : current.compProps
  run(
    `UPDATE projects SET name = ?, sport = ?, season = ?, location = ?, date = ?, modality = ?, comp_props = ?, updated_at = ? WHERE id = ?`,
    [next.name.trim(), next.sport, next.season, next.location, next.date, next.modality, compPropsToDb(compProps), now(), id],
  )
  return getProject(id) as Project
}

export function deleteProject(id: string): void {
  const matchIds = all<Row>('SELECT id FROM matches WHERE project_id = ?', [id]).map((r) => str(r.id))
  for (const mId of matchIds) run('DELETE FROM match_events WHERE match_id = ?', [mId])
  run('DELETE FROM matches WHERE project_id = ?', [id])
  run('DELETE FROM players WHERE team_id IN (SELECT id FROM teams WHERE project_id = ?)', [id])
  run('DELETE FROM teams WHERE project_id = ?', [id])
  run('DELETE FROM media WHERE project_id = ?', [id])
  run('DELETE FROM projects WHERE id = ?', [id])
}

export function duplicateProject(id: string): Project {
  const source = getProject(id)
  if (!source) throw new Error('El proyecto no existe.')
  const copy = createProject({ ...source, name: `${source.name} (copia)` })

  const teamMap = new Map<string, string>()
  for (const team of listTeams(id)) {
    const newTeamId = uid()
    teamMap.set(team.id, newTeamId)
    run(
      `INSERT INTO teams (id, project_id, name, short_name, code, logo, primary_color, secondary_color, city, country, country_code, lot, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newTeamId, copy.id, team.name, team.shortName, team.code, team.logo, team.primaryColor, team.secondaryColor, team.city, team.country, team.countryCode, team.lot, now()],
    )
  }
  for (const team of listTeams(id)) {
    for (const player of listPlayersByTeam(team.id)) {
      run(
        `INSERT INTO players (id, team_id, first_name, last_name, number, position, photo, is_starter, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uid(), teamMap.get(team.id) as string, player.firstName, player.lastName, player.number, player.position, player.photo, player.isStarter ? 1 : 0, now()],
      )
    }
  }
  return getProject(copy.id) as Project
}

const EXPORT_FORMAT = 'marcador-pro/project'
const EXPORT_VERSION = 1

interface ProjectBundle {
  format: string
  version: number
  exportedAt: number
  project: Project
  teams: Team[]
  players: Player[]
  matches: Match[]
  events: MatchEvent[]
  officials?: MatchOfficial[]
}

export async function exportProject(id: string): Promise<ExportResult> {
  const project = getProject(id)
  if (!project) return { ok: false, canceled: false, error: 'El proyecto no existe.' }
  const teams = listTeams(id)
  const matches = listMatches(id)
  const bundle: ProjectBundle = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now(),
    project,
    teams,
    players: teams.flatMap((t) => listPlayersByTeam(t.id)),
    matches,
    events: matches.flatMap((m) => listEvents(m.id)),
    officials: matches.flatMap((m) => listOfficialsByMatch(m.id)),
  }
  const safe = project.name.replace(/[^\wáéíóúñü -]/gi, '').trim() || 'proyecto'
  const result = await dialog.showSaveDialog({
    title: 'Exportar proyecto',
    defaultPath: `${safe}.marcador.json`,
    filters: [{ name: 'Proyecto Marcador Pro', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) return { ok: false, canceled: true }
  try {
    await fs.promises.writeFile(result.filePath, JSON.stringify(bundle, null, 2), 'utf8')
    return { ok: true, canceled: false, filePath: result.filePath }
  } catch (err) {
    return { ok: false, canceled: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function importProject(): Promise<ImportResult> {
  const result = await dialog.showOpenDialog({
    title: 'Importar proyecto',
    filters: [{ name: 'Proyecto Marcador Pro', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true }
  try {
    const raw = await fs.promises.readFile(result.filePaths[0], 'utf8')
    const bundle = JSON.parse(raw) as ProjectBundle
    if (bundle.format !== EXPORT_FORMAT || !bundle.project) {
      return { ok: false, canceled: false, error: 'El archivo no es un proyecto válido de Marcador Pro.' }
    }
    return { ok: true, canceled: false, project: insertBundle(bundle) }
  } catch (err) {
    return { ok: false, canceled: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Inserta un bundle regenerando todos los ids (evita colisiones). */
function insertBundle(bundle: ProjectBundle): Project {
  const project = createProject(bundle.project)
  const teamMap = new Map<string, string>()
  const playerMap = new Map<string, string>()
  const matchMap = new Map<string, string>()

  for (const team of bundle.teams ?? []) {
    const newId = uid()
    teamMap.set(team.id, newId)
    run(
      `INSERT INTO teams (id, project_id, name, short_name, code, logo, primary_color, secondary_color, city, country, country_code, lot, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, project.id, team.name, team.shortName, team.code, team.logo, team.primaryColor, team.secondaryColor, team.city, team.country, team.countryCode ?? '', team.lot ?? '', now()],
    )
  }
  for (const player of bundle.players ?? []) {
    const teamId = teamMap.get(player.teamId)
    if (!teamId) continue
    const newId = uid()
    playerMap.set(player.id, newId)
    run(
      `INSERT INTO players (id, team_id, first_name, last_name, number, position, photo, is_starter, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, teamId, player.firstName, player.lastName, player.number, player.position, player.photo, player.isStarter ? 1 : 0, now()],
    )
  }
  for (const match of bundle.matches ?? []) {
    const home = teamMap.get(match.homeTeamId)
    const away = teamMap.get(match.awayTeamId)
    if (!home || !away) continue
    const newId = uid()
    matchMap.set(match.id, newId)
    insertMatchRow({
      ...match,
      id: newId,
      projectId: project.id,
      homeTeamId: home,
      awayTeamId: away,
    })
    const playerStats = Object.fromEntries(Object.entries(match.playerStats ?? {}).filter(([id]) => playerMap.has(id)).map(([id, stat]) => [playerMap.get(id)!, stat]))
    updateMatch(newId, { playerStats, sportState: match.sportState ?? null, possession: match.possession ?? null, gameDurationMs: match.gameDurationMs ?? null, timeoutActive: match.timeoutActive ?? false })
  }
  for (const event of bundle.events ?? []) {
    const matchId = matchMap.get(event.matchId)
    if (!matchId) continue
    run(
      `INSERT INTO match_events (id, match_id, team_id, player_id, type, minute, description, secondary_player_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid(), matchId, event.teamId ? (teamMap.get(event.teamId) ?? null) : null, event.playerId ? (playerMap.get(event.playerId) ?? null) : null, event.type, event.minute, event.description, event.secondaryPlayerId ? (playerMap.get(event.secondaryPlayerId) ?? null) : null, now()],
    )
  }
  for (const official of bundle.officials ?? []) {
    const matchId = matchMap.get(official.matchId)
    if (!matchId) continue
    run(
      `INSERT INTO match_officials (id, match_id, ord, type, name, country, grade, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid(), matchId, official.order, official.type, official.name, official.country, official.grade, now()],
    )
  }
  return getProject(project.id) as Project
}

/* ------------------------------- equipos --------------------------- */

export function listTeams(projectId: string): Team[] {
  return all<Row>('SELECT * FROM teams WHERE project_id = ? ORDER BY name COLLATE NOCASE', [projectId]).map(rowToTeam)
}

export function getTeam(id: string): Team | undefined {
  const r = get<Row>('SELECT * FROM teams WHERE id = ?', [id])
  return r ? rowToTeam(r) : undefined
}

export function createTeam(input: NewTeamInput): Team {
  if (!input.name.trim()) throw new Error('El nombre del equipo es obligatorio.')
  const id = uid()
  run(
    `INSERT INTO teams (id, project_id, name, short_name, code, logo, primary_color, secondary_color, city, country, country_code, lot, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.projectId, input.name.trim(), input.shortName, input.code, input.logo, input.primaryColor, input.secondaryColor, input.city, input.country, input.countryCode ?? '', input.lot ?? '', now()],
  )
  return getTeam(id) as Team
}

export function updateTeam(id: string, patch: Partial<NewTeamInput>): Team {
  const current = getTeam(id)
  if (!current) throw new Error('El equipo no existe.')
  const next = { ...current, ...patch }
  if (!next.name.trim()) throw new Error('El nombre del equipo no puede estar vacío.')
  run(
    `UPDATE teams SET name = ?, short_name = ?, code = ?, logo = ?, primary_color = ?, secondary_color = ?, city = ?, country = ?, country_code = ?, lot = ? WHERE id = ?`,
    [next.name.trim(), next.shortName, next.code, next.logo, next.primaryColor, next.secondaryColor, next.city, next.country, next.countryCode ?? '', next.lot ?? '', id],
  )
  return getTeam(id) as Team
}

export function deleteTeam(id: string): void {
  const used = get<Row>('SELECT COUNT(*) AS c FROM matches WHERE home_team_id = ? OR away_team_id = ?', [id, id])
  if (num(used?.c) > 0) {
    throw new Error('No se puede eliminar: el equipo participa en uno o más partidos.')
  }
  run('DELETE FROM players WHERE team_id = ?', [id])
  run('DELETE FROM teams WHERE id = ?', [id])
}

/* ------------------------------ jugadores -------------------------- */

export function listPlayersByTeam(teamId: string): Player[] {
  return all<Row>('SELECT * FROM players WHERE team_id = ? ORDER BY is_starter DESC, number IS NULL, number, first_name COLLATE NOCASE', [teamId]).map(rowToPlayer)
}

export function getPlayer(id: string): Player | undefined {
  const r = get<Row>('SELECT * FROM players WHERE id = ?', [id])
  return r ? rowToPlayer(r) : undefined
}

export function createPlayer(input: NewPlayerInput): Player {
  if (!input.firstName.trim()) throw new Error('El nombre del jugador es obligatorio.')
  const id = uid()
  run(
    `INSERT INTO players (id, team_id, first_name, last_name, number, position, photo, is_starter, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.teamId, input.firstName.trim(), input.lastName, input.number, input.position, input.photo, input.isStarter ? 1 : 0, now()],
  )
  return getPlayer(id) as Player
}

export function updatePlayer(id: string, patch: Partial<NewPlayerInput>): Player {
  const current = getPlayer(id)
  if (!current) throw new Error('El jugador no existe.')
  const next = { ...current, ...patch }
  if (!next.firstName.trim()) throw new Error('El nombre del jugador no puede estar vacío.')
  run(
    `UPDATE players SET first_name = ?, last_name = ?, number = ?, position = ?, photo = ?, is_starter = ? WHERE id = ?`,
    [next.firstName.trim(), next.lastName, next.number, next.position, next.photo, next.isStarter ? 1 : 0, id],
  )
  return getPlayer(id) as Player
}

export function deletePlayer(id: string): void {
  run('DELETE FROM players WHERE id = ?', [id])
}

export function bulkCreatePlayers(inputs: NewPlayerInput[]): number {
  let count = 0
  for (const input of inputs) {
    if (!input.firstName.trim() && !input.lastName.trim()) continue
    createPlayer({ ...input, firstName: input.firstName.trim() || input.lastName.trim() })
    count++
  }
  return count
}

/* ------------------------------- partidos -------------------------- */

export function listMatches(projectId: string): Match[] {
  return all<Row>('SELECT * FROM matches WHERE project_id = ? ORDER BY kickoff DESC, created_at DESC', [projectId]).map(rowToMatch)
}

export function getMatch(id: string): Match | undefined {
  const r = get<Row>('SELECT * FROM matches WHERE id = ?', [id])
  return r ? rowToMatch(r) : undefined
}

function insertMatchRow(match: Match): void {
  run(
    `INSERT INTO matches (id, project_id, home_team_id, away_team_id, home_score, away_score, status, period, venue, kickoff, round, competition, added_time, timer_running, timer_started_at, timer_elapsed, home_fouls, away_fouls, home_timeouts, away_timeouts, shot_clock, break_timer, result_confirmed, sets, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      match.id,
      match.projectId,
      match.homeTeamId,
      match.awayTeamId,
      match.homeScore,
      match.awayScore,
      match.status,
      match.period,
      match.venue,
      match.kickoff,
      match.round,
      match.competition,
      match.addedTime,
      match.timerRunning ? 1 : 0,
      match.timerStartedAt,
      match.timerElapsed,
      match.homeFouls ?? 0,
      match.awayFouls ?? 0,
      match.homeTimeouts ?? 0,
      match.awayTimeouts ?? 0,
      downTimerToDb(match.shotClock),
      downTimerToDb(match.breakTimer),
      match.resultConfirmed ? 1 : 0,
      setsToDb(match.sets),
      match.createdAt,
      match.updatedAt,
    ],
  )
}

export function createMatch(input: NewMatchInput): Match {
  if (!input.homeTeamId || !input.awayTeamId) throw new Error('Selecciona ambos equipos.')
  if (input.homeTeamId === input.awayTeamId) throw new Error('El equipo local y visitante deben ser distintos.')
  const home = getTeam(input.homeTeamId)
  const away = getTeam(input.awayTeamId)
  if (!home || !away) throw new Error('Los equipos seleccionados no existen.')
  const id = uid()
  const ts = now()
  const project = getProject(input.projectId)
  insertMatchRow({
    id,
    projectId: input.projectId,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled',
    period: project && ['basketball', 'basketball3x3'].includes(project.sport) ? 'first_quarter' : 'first_half',
    venue: input.venue,
    kickoff: input.kickoff,
    round: input.round,
    competition: input.competition || (project ? project.name : ''),
    addedTime: 0,
    timerRunning: false,
    timerStartedAt: null,
    timerElapsed: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeTimeouts: 0,
    awayTimeouts: 0,
    shotClock: null,
    breakTimer: null,
    resultConfirmed: false,
    sets: [],
    createdAt: ts,
    updatedAt: ts,
  })
  if (project && ruleFamily(project.sport)) updateMatch(id, { sportState: initialSportState(project.sport) })
  return getMatch(id) as Match
}

const MATCH_PATCH_COLUMNS: Record<string, string> = {
  gameDurationMs: 'game_duration_ms',
  timeoutActive: 'timeout_active',
  homeTeamId: 'home_team_id',
  awayTeamId: 'away_team_id',
  homeScore: 'home_score',
  awayScore: 'away_score',
  status: 'status',
  period: 'period',
  venue: 'venue',
  kickoff: 'kickoff',
  round: 'round',
  competition: 'competition',
  addedTime: 'added_time',
  timerRunning: 'timer_running',
  timerStartedAt: 'timer_started_at',
  timerElapsed: 'timer_elapsed',
  homeFouls: 'home_fouls',
  awayFouls: 'away_fouls',
  homeTimeouts: 'home_timeouts',
  possession: 'possession',
  awayTimeouts: 'away_timeouts',
  resultConfirmed: 'result_confirmed',
}

/** Columnas de la tabla `matches` que almacenan temporizadores en formato JSON. */
const MATCH_TIMER_COLUMNS: Record<string, string> = {
  shotClock: 'shot_clock',
  breakTimer: 'break_timer',
}

/** Columnas de la tabla `matches` que almacenan arrays en formato JSON (vóleibol). */
const MATCH_ARRAY_COLUMNS: Record<string, string> = {
  sets: 'sets',
}

export function updateMatch(id: string, patch: Partial<Match>): Match {
  const current = getMatch(id)
  if (!current) throw new Error('El partido no existe.')
  const next = { ...current, ...patch } as Match
  if ('gameDurationMs' in patch && next.gameDurationMs != null && (!Number.isFinite(next.gameDurationMs) || next.gameDurationMs < 0)) throw new Error('Duración de juego inválida.')
  if ('possession' in patch && next.possession !== null && next.possession !== 'home' && next.possession !== 'away') throw new Error('Posesión inválida.')
  if (next.homeTeamId === next.awayTeamId) throw new Error('El equipo local y visitante deben ser distintos.')

  const sets: string[] = []
  const params: unknown[] = []
  for (const [key, column] of Object.entries(MATCH_PATCH_COLUMNS)) {
    if (!(key in patch)) continue
    const value = (next as unknown as Record<string, unknown>)[key]
    sets.push(`${column} = ?`)
    params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value ?? null)
  }
  for (const [key, column] of Object.entries(MATCH_TIMER_COLUMNS)) {
    if (!(key in patch)) continue
    sets.push(`${column} = ?`)
    params.push(downTimerToDb((next as unknown as Record<string, unknown>)[key] as DownTimerSnapshot | null))
  }
  for (const [key, column] of Object.entries(MATCH_ARRAY_COLUMNS)) {
    if (!(key in patch)) continue
    sets.push(`${column} = ?`)
    params.push(setsToDb((next as unknown as Record<string, unknown>)[key] as MatchSet[]))
  }
  if ('sportState' in patch) { sets.push('sport_state = ?'); params.push(next.sportState ? JSON.stringify(next.sportState) : null) }
  if ('playerStats' in patch) {
    sets.push('player_stats = ?')
    params.push(JSON.stringify(next.playerStats ?? {}))
  }
  if (sets.length === 0) return current
  sets.push('updated_at = ?')
  params.push(now(), id)
  run(`UPDATE matches SET ${sets.join(', ')} WHERE id = ?`, params)
  return getMatch(id) as Match
}

export function sportAction(id: string, action: SportAction): Match {
  const match = getMatch(id)
  if (!match) throw new Error('El partido no existe.')
  const project = getProject(match.projectId)
  if (!project || !ruleFamily(match.sportState?.sport ?? project.sport)) throw new Error('Este deporte utiliza el control general.')
  if (match.status === 'finished' && !['undo', 'reset', 'configure'].includes(action.type) && match.sportState?.family !== 'athletics') throw new Error('El resultado está finalizado.')
  if (!match.sportState && action.type !== 'reset' && (match.homeScore || match.awayScore || match.sets.length)) throw new Error('Reinicia el reglamento para activar los controles en este partido existente.')
  const state = applySportAction(match.sportState ?? initialSportState(project.sport), action)
  const [homeScore, awayScore] = sportScores(state)
  const elapsed = match.timerElapsed + (match.timerRunning && match.timerStartedAt ? Math.max(0, Date.now() - match.timerStartedAt) : 0)
  const resetTimer = action.type === 'reset' || action.type === 'round' || action.type === 'golden'
  return updateMatch(id, {
    sportState: state, homeScore, awayScore,
    sets: state.current.sets.map(([home, away]) => ({ home, away })),
    status: state.current.winner ? 'finished' : action.type === 'reset' ? 'scheduled' : action.type === 'configure' || (state.family === 'athletics' && match.status === 'finished') ? match.status : 'live',
    ...(state.current.winner || resetTimer || action.type === 'undo' ? { timerRunning: false, timerStartedAt: null, timerElapsed: resetTimer ? 0 : elapsed } : {}),
  })
}

export function deleteMatch(id: string): void {
  run('DELETE FROM match_events WHERE match_id = ?', [id])
  run('DELETE FROM match_officials WHERE match_id = ?', [id])
  run('DELETE FROM matches WHERE id = ?', [id])
}

/* ------------------------------ oficiales -------------------------- */

export function listOfficialsByMatch(matchId: string): MatchOfficial[] {
  return all<Row>('SELECT * FROM match_officials WHERE match_id = ? ORDER BY ord ASC, created_at ASC', [matchId]).map(rowToOfficial)
}

function rowToOfficial(r: Row): MatchOfficial {
  return {
    id: str(r.id),
    matchId: str(r.match_id),
    order: num(r.ord, 1),
    type: str(r.type),
    name: str(r.name),
    country: str(r.country),
    grade: str(r.grade),
    createdAt: num(r.created_at),
  }
}

export function createOfficial(input: NewMatchOfficialInput & { matchId: string }): MatchOfficial {
  const id = uid()
  const order =
    input.order && input.order > 0
      ? input.order
      : num(get<Row>('SELECT COALESCE(MAX(ord), 0) + 1 AS next FROM match_officials WHERE match_id = ?', [input.matchId])?.next, 1)
  run(
    `INSERT INTO match_officials (id, match_id, ord, type, name, country, grade, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.matchId, order, input.type, input.name, input.country, input.grade, now()],
  )
  const r = get<Row>('SELECT * FROM match_officials WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo crear el oficial.')
  return rowToOfficial(r)
}

export function updateOfficial(id: string, patch: MatchOfficialUpdate): MatchOfficial {
  const current = get<Row>('SELECT * FROM match_officials WHERE id = ?', [id])
  if (!current) throw new Error('El oficial no existe.')
  const next = { ...rowToOfficial(current), ...patch }
  run(
    `UPDATE match_officials SET ord = ?, type = ?, name = ?, country = ?, grade = ? WHERE id = ?`,
    [next.order, next.type, next.name, next.country, next.grade, id],
  )
  const r = get<Row>('SELECT * FROM match_officials WHERE id = ?', [id])
  if (!r) throw new Error('El oficial no existe.')
  return rowToOfficial(r)
}

export function deleteOfficial(id: string): void {
  run('DELETE FROM match_officials WHERE id = ?', [id])
}

export function replaceAllOfficials(matchId: string, inputs: (NewMatchOfficialInput & { id?: string })[]): MatchOfficial[] {
  run('DELETE FROM match_officials WHERE match_id = ?', [matchId])
  const result: MatchOfficial[] = []
  inputs.forEach((input, index) => {
    if (!input.name.trim() && !input.type.trim()) return
    const id = input.id ?? uid()
    run(
      `INSERT INTO match_officials (id, match_id, ord, type, name, country, grade, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, matchId, index + 1, input.type, input.name, input.country, input.grade, now()],
    )
    const r = get<Row>('SELECT * FROM match_officials WHERE id = ?', [id])
    if (r) result.push(rowToOfficial(r))
  })
  return result
}

/* ------------------------------- eventos --------------------------- */

export function listEvents(matchId: string): MatchEvent[] {
  return all<Row>('SELECT * FROM match_events WHERE match_id = ? ORDER BY minute ASC, created_at ASC', [matchId]).map(rowToEvent)
}

export function createEvent(input: NewMatchEventInput): MatchEvent {
  const id = uid()
  run(
    `INSERT INTO match_events (id, match_id, team_id, player_id, type, minute, description, secondary_player_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.matchId, input.teamId, input.playerId, input.type, input.minute, input.description, input.secondaryPlayerId ?? null, now()],
  )
  const r = get<Row>('SELECT * FROM match_events WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo crear el evento.')
  return rowToEvent(r)
}

export function deleteEvent(id: string): void {
  run('DELETE FROM match_events WHERE id = ?', [id])
}

/* ------------------------------ multimedia ------------------------- */

export function listMedia(projectId: string): MediaItem[] {
  return all<Row>('SELECT * FROM media WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map(rowToMedia)
}

export function createMedia(input: {
  projectId: string
  name: string
  kind: 'image' | 'text'
  data: string
  duration: number
}): MediaItem {
  if (!input.name.trim()) throw new Error('El nombre del elemento es obligatorio.')
  const id = uid()
  run(
    'INSERT INTO media (id, project_id, name, kind, data, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.projectId, input.name.trim(), input.kind, input.data, input.duration, now()],
  )
  const r = get<Row>('SELECT * FROM media WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar el elemento multimedia.')
  return rowToMedia(r)
}

export function deleteMedia(id: string): void {
  run('DELETE FROM media WHERE id = ?', [id])
}

/* ----------------------------- configuración ----------------------- */

export function getSetting(key: string): string | null {
  const r = get<Row>('SELECT value FROM settings WHERE key = ?', [key])
  return r ? nullableStr(r.value) : null
}

export function setSetting(key: string, value: string): void {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ])
}

/* ------------------------- Multimedia avanzada ------------------------- */

export function listVideos(projectId: string): VideoItem[] {
  return all<Row>('SELECT * FROM videos WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map((r) => ({
    id: str(r.id),
    projectId: str(r.project_id),
    name: str(r.name),
    src: str(r.src),
    duration: num(r.duration),
    createdAt: num(r.created_at),
  }))
}

export function createVideo(input: NewVideoInput): VideoItem {
  if (!input.name.trim()) throw new Error('El nombre del video es obligatorio.')
  const id = uid()
  run('INSERT INTO videos (id, project_id, name, src, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    input.projectId,
    input.name.trim(),
    input.src,
    input.duration,
    now(),
  ])
  const r = get<Row>('SELECT * FROM videos WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar el video.')
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    name: str(r.name),
    src: str(r.src),
    duration: num(r.duration),
    createdAt: num(r.created_at),
  }
}

export function deleteVideo(id: string): void {
  run('DELETE FROM videos WHERE id = ?', [id])
}

export function listScheduledSequences(projectId: string): ScheduledSequence[] {
  return all<Row>('SELECT * FROM scheduled_sequences WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map(
    (r) => ({
      id: str(r.id),
      projectId: str(r.project_id),
      name: str(r.name),
      itemIds: JSON.parse(str(r.item_ids)) as string[],
      intervalSec: num(r.interval_sec),
      loop: num(r.loop) === 1,
      createdAt: num(r.created_at),
    }),
  )
}

export function createScheduledSequence(input: NewScheduledSequenceInput): ScheduledSequence {
  if (!input.name.trim()) throw new Error('El nombre de la secuencia es obligatorio.')
  const id = uid()
  run(
    'INSERT INTO scheduled_sequences (id, project_id, name, item_ids, interval_sec, loop, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.projectId, input.name.trim(), JSON.stringify(input.itemIds), input.intervalSec, input.loop ? 1 : 0, now()],
  )
  const r = get<Row>('SELECT * FROM scheduled_sequences WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar la secuencia.')
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    name: str(r.name),
    itemIds: JSON.parse(str(r.item_ids)) as string[],
    intervalSec: num(r.interval_sec),
    loop: num(r.loop) === 1,
    createdAt: num(r.created_at),
  }
}

export function deleteScheduledSequence(id: string): void {
  run('DELETE FROM scheduled_sequences WHERE id = ?', [id])
}

export function listSponsorRotations(projectId: string): SponsorRotation[] {
  return all<Row>('SELECT * FROM sponsor_rotations WHERE project_id = ? ORDER BY created_at DESC', [projectId]).map(
    (r) => ({
      id: str(r.id),
      projectId: str(r.project_id),
      name: str(r.name),
      imageIds: JSON.parse(str(r.image_ids)) as string[],
      intervalSec: num(r.interval_sec),
      active: num(r.active) === 1,
      createdAt: num(r.created_at),
    }),
  )
}

export function createSponsorRotation(input: NewSponsorRotationInput): SponsorRotation {
  if (!input.name.trim()) throw new Error('El nombre de la rotación es obligatorio.')
  const id = uid()
  run(
    'INSERT INTO sponsor_rotations (id, project_id, name, image_ids, interval_sec, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.projectId, input.name.trim(), JSON.stringify(input.imageIds), input.intervalSec, input.active ? 1 : 0, now()],
  )
  const r = get<Row>('SELECT * FROM sponsor_rotations WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar la rotación.')
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    name: str(r.name),
    imageIds: JSON.parse(str(r.image_ids)) as string[],
    intervalSec: num(r.interval_sec),
    active: num(r.active) === 1,
    createdAt: num(r.created_at),
  }
}

export function deleteSponsorRotation(id: string): void {
  run('DELETE FROM sponsor_rotations WHERE id = ?', [id])
}

/* ------------------------- Tabla de posiciones ------------------------- */

export function listStandings(projectId: string): StandingEntry[] {
  return all<Row>('SELECT * FROM standings WHERE project_id = ? ORDER BY points DESC, goal_difference DESC', [
    projectId,
  ]).map((r) => ({
    id: str(r.id),
    projectId: str(r.project_id),
    teamId: str(r.team_id),
    played: num(r.played),
    won: num(r.won),
    drawn: num(r.drawn),
    lost: num(r.lost),
    goalsFor: num(r.goals_for),
    goalsAgainst: num(r.goals_against),
    goalDifference: num(r.goal_difference),
    points: num(r.points),
    createdAt: num(r.created_at),
  }))
}

export function createStandingEntry(input: NewStandingEntryInput): StandingEntry {
  const id = uid()
  run(
    'INSERT INTO standings (id, project_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      input.projectId,
      input.teamId,
      input.played,
      input.won,
      input.drawn,
      input.lost,
      input.goalsFor,
      input.goalsAgainst,
      input.goalDifference,
      input.points,
      now(),
    ],
  )
  const r = get<Row>('SELECT * FROM standings WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar la entrada.')
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    teamId: str(r.team_id),
    played: num(r.played),
    won: num(r.won),
    drawn: num(r.drawn),
    lost: num(r.lost),
    goalsFor: num(r.goals_for),
    goalsAgainst: num(r.goals_against),
    goalDifference: num(r.goal_difference),
    points: num(r.points),
    createdAt: num(r.created_at),
  }
}

export function updateStandingEntry(id: string, patch: Partial<NewStandingEntryInput>): StandingEntry {
  const current = get<Row>('SELECT * FROM standings WHERE id = ?', [id])
  if (!current) throw new Error('La entrada no existe.')
  const next = { ...current, ...patch }
  run(
    'UPDATE standings SET played = ?, won = ?, drawn = ?, lost = ?, goals_for = ?, goals_against = ?, goal_difference = ?, points = ? WHERE id = ?',
    [next.played, next.won, next.drawn, next.lost, next.goalsFor, next.goalsAgainst, next.goalDifference, next.points, id],
  )
  const r = get<Row>('SELECT * FROM standings WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo actualizar la entrada.')
  return {
    id: str(r.id),
    projectId: str(r.project_id),
    teamId: str(r.team_id),
    played: num(r.played),
    won: num(r.won),
    drawn: num(r.drawn),
    lost: num(r.lost),
    goalsFor: num(r.goals_for),
    goalsAgainst: num(r.goals_against),
    goalDifference: num(r.goal_difference),
    points: num(r.points),
    createdAt: num(r.created_at),
  }
}

export function deleteStandingEntry(id: string): void {
  run('DELETE FROM standings WHERE id = ?', [id])
}

/* ------------------------- Atajos configurables ------------------------- */

export function listShortcuts(): ShortcutBinding[] {
  return all<Row>('SELECT * FROM shortcuts ORDER BY action ASC').map((r) => ({
    id: str(r.id),
    action: str(r.action),
    keys: str(r.keys),
    enabled: num(r.enabled) === 1,
    createdAt: num(r.created_at),
  }))
}

export function createShortcut(input: NewShortcutBindingInput): ShortcutBinding {
  validateShortcut(input)
  input = { ...input, keys: normalizeShortcut(input.keys) }
  const id = uid()
  run('INSERT INTO shortcuts (id, action, keys, enabled, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    input.action,
    input.keys,
    input.enabled ? 1 : 0,
    now(),
  ])
  const r = get<Row>('SELECT * FROM shortcuts WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar el atajo.')
  return {
    id: str(r.id),
    action: str(r.action),
    keys: str(r.keys),
    enabled: num(r.enabled) === 1,
    createdAt: num(r.created_at),
  }
}

export function updateShortcut(id: string, patch: Partial<NewShortcutBindingInput>): ShortcutBinding {
  const current = get<Row>('SELECT * FROM shortcuts WHERE id = ?', [id])
  if (!current) throw new Error('El atajo no existe.')
  const next = { ...current, ...patch }
  validateShortcut({ action: String(next.action), keys: String(next.keys), enabled: Boolean(next.enabled) }, id)
  next.keys = normalizeShortcut(String(next.keys))
  run('UPDATE shortcuts SET action = ?, keys = ?, enabled = ? WHERE id = ?', [
    next.action,
    next.keys,
    next.enabled ? 1 : 0,
    id,
  ])
  const r = get<Row>('SELECT * FROM shortcuts WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo actualizar el atajo.')
  return {
    id: str(r.id),
    action: str(r.action),
    keys: str(r.keys),
    enabled: num(r.enabled) === 1,
    createdAt: num(r.created_at),
  }
}

export function deleteShortcut(id: string): void {
  run('DELETE FROM shortcuts WHERE id = ?', [id])
}

/* ------------------------- Perfil de operador ------------------------- */

export function listOperatorProfiles(): OperatorProfile[] {
  return all<Row>('SELECT * FROM operator_profiles ORDER BY name ASC').map((r) => ({
    id: str(r.id),
    name: str(r.name),
    role: str(r.role),
    email: str(r.email),
    createdAt: num(r.created_at),
  }))
}

export function createOperatorProfile(input: NewOperatorProfileInput): OperatorProfile {
  if (!input.name.trim()) throw new Error('El nombre del operador es obligatorio.')
  const id = uid()
  run('INSERT INTO operator_profiles (id, name, role, email, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    input.name.trim(),
    input.role,
    input.email,
    now(),
  ])
  const r = get<Row>('SELECT * FROM operator_profiles WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar el perfil.')
  return {
    id: str(r.id),
    name: str(r.name),
    role: str(r.role),
    email: str(r.email),
    createdAt: num(r.created_at),
  }
}

export function deleteOperatorProfile(id: string): void {
  run('DELETE FROM operator_profiles WHERE id = ?', [id])
}

/* ------------------------- Actas de partido ------------------------- */

export function listMatchActs(matchId: string): MatchAct[] {
  return all<Row>('SELECT * FROM match_acts WHERE match_id = ? ORDER BY created_at DESC', [matchId]).map((r) => ({
    id: str(r.id),
    matchId: str(r.match_id),
    content: str(r.content),
    createdAt: num(r.created_at),
  }))
}

export function getMatchAct(id: string): MatchAct | undefined {
  const r = get<Row>('SELECT * FROM match_acts WHERE id = ?', [id])
  if (!r) return undefined
  return {
    id: str(r.id),
    matchId: str(r.match_id),
    content: str(r.content),
    createdAt: num(r.created_at),
  }
}

export function createMatchAct(input: NewMatchActInput): MatchAct {
  const id = uid()
  run('INSERT INTO match_acts (id, match_id, content, created_at) VALUES (?, ?, ?, ?)', [
    id,
    input.matchId,
    input.content,
    now(),
  ])
  const r = get<Row>('SELECT * FROM match_acts WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo guardar el acta.')
  return {
    id: str(r.id),
    matchId: str(r.match_id),
    content: str(r.content),
    createdAt: num(r.created_at),
  }
}

export function deleteMatchAct(id: string): void {
  run('DELETE FROM match_acts WHERE id = ?', [id])
}

/* ------------------------- Actualización de eventos ------------------------- */

export function updateEvent(id: string, patch: MatchEventUpdate): MatchEvent {
  const current = get<Row>('SELECT * FROM match_events WHERE id = ?', [id])
  if (!current) throw new Error('El evento no existe.')
  const next = { ...current, ...patch }
  run(
    'UPDATE match_events SET minute = ?, description = ?, player_id = ?, secondary_player_id = ?, team_id = ? WHERE id = ?',
    [next.minute, next.description, next.playerId, next.secondaryPlayerId, next.teamId, id],
  )
  const r = get<Row>('SELECT * FROM match_events WHERE id = ?', [id])
  if (!r) throw new Error('No se pudo actualizar el evento.')
  return rowToEvent(r)
}

export function getVideo(id: string): VideoItem | undefined {
  const row = get<Row>('SELECT project_id FROM videos WHERE id = ?', [id])
  return row ? listVideos(String(row.project_id)).find(item => item.id === id) : undefined
}
export function getScheduledSequence(id: string): ScheduledSequence | undefined {
  const row = get<Row>('SELECT project_id FROM scheduled_sequences WHERE id = ?', [id])
  return row ? listScheduledSequences(String(row.project_id)).find(item => item.id === id) : undefined
}
export function getSponsorRotation(id: string): SponsorRotation | undefined {
  const row = get<Row>('SELECT project_id FROM sponsor_rotations WHERE id = ?', [id])
  return row ? listSponsorRotations(String(row.project_id)).find(item => item.id === id) : undefined
}

function statsFromDb(value: unknown): NonNullable<Match['playerStats']> {
  try {
    const parsed = JSON.parse(String(value ?? '{}'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: NonNullable<Match['playerStats']> = {}
    for (const [id, value] of Object.entries(parsed)) {
      const stat = value as { points?: number; fouls?: number }
      if (stat && Number.isFinite(stat.points) && Number.isFinite(stat.fouls)) result[id] = { points: Math.max(0, stat.points!), fouls: Math.max(0, stat.fouls!) }
    }
    return result
  } catch { return {} }
}
export function adjustPlayerStat(matchId: string, playerId: string, key: 'points' | 'fouls', delta: number): Match {
  const match = getMatch(matchId)
  const player = get<Row>('SELECT team_id FROM players WHERE id = ?', [playerId])
  if (!match || !player || ![match.homeTeamId, match.awayTeamId].includes(String(player.team_id))) throw new Error('El jugador no pertenece al partido.')
  if (!['points', 'fouls'].includes(key) || !Number.isInteger(delta) || Math.abs(delta) > 3) throw new Error('Ajuste de estad?stica inv?lido.')
  const stats = match.playerStats ?? {}
  const current = stats[playerId] ?? { points: 0, fouls: 0 }
  const next = Math.max(0, current[key] + delta)
  const patch: Partial<Match> = { playerStats: { ...stats, [playerId]: { ...current, [key]: next } } }
  if (key === 'points') {
    const scoreKey = String(player.team_id) === match.homeTeamId ? 'homeScore' : 'awayScore'
    patch[scoreKey] = Math.max(0, match[scoreKey] + next - current.points)
  }
  return updateMatch(matchId, patch)
}

function validateShortcut(input: NewShortcutBindingInput, excludeId?: string): void {
  const actions = ['goal.home', 'goal.away', 'goal.removeHome', 'goal.removeAway', 'clock.toggle', 'clock.reset', 'display.fullscreen', 'event.add', 'countdown.toggle']
  if (!actions.concat(EXTRA_SHORTCUT_ACTIONS.map(item => item.value)).includes(input.action) || !validShortcut(input.keys)) throw new Error('Acci?n o combinaci?n de teclas inv?lida. Ejemplo: CTRL+Q.')
  if (input.enabled && listShortcuts().some(item => item.id !== excludeId && item.enabled && normalizeShortcut(item.keys) === normalizeShortcut(input.keys))) throw new Error('Esa combinaci?n ya est? asignada a otro atajo activo.')
}
