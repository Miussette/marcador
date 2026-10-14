import type { SportMatchState } from '../features/sports/types'
/* ------------------------------------------------------------------ *
 *  Tipos de dominio compartidos entre proceso principal y renderer
 * ------------------------------------------------------------------ */

export const SPORT_CATEGORIES = [
  { id: 'pelota', label: 'Pelota', icon: 'circle-dot' },
  { id: 'atletismo', label: 'Atletismo', icon: 'activity' },
  { id: 'marcial', label: 'Artes marciales', icon: 'swords' },
  { id: 'artistico', label: 'Artístico', icon: 'star' },
  { id: 'acuatico', label: 'Acuáticos', icon: 'waves' },
  { id: 'hielo', label: 'Hielo', icon: 'snowflake' },
  { id: 'nieve', label: 'Nieve', icon: 'wind' },
  { id: 'ciclismo', label: 'Ciclismo', icon: 'bike' },
  { id: 'ecuestre', label: 'Ecuestre', icon: 'medal' },
  { id: 'precision', label: 'Precisión', icon: 'target' },
  { id: 'misc', label: 'Otros', icon: 'trophy' },
] as const

export type SportCategoryId = (typeof SPORT_CATEGORIES)[number]['id']

/**
 * Catálogo de deportes: `icon` es la clave del icono de lucide-react que
 * dibuja el selector (ver `SPORT_ICONS` en SportPicker).
 */
export const SPORTS = [
  /* ------------------------------ Pelota ------------------------------ */
  { id: 'football', label: 'Fútbol', category: 'pelota', icon: 'goal' },
  { id: 'football7', label: 'Fútbol 7', category: 'pelota', icon: 'goal' },
  { id: 'futsal', label: 'Futsal', category: 'pelota', icon: 'goal' },
  { id: 'basketball', label: 'Baloncesto', category: 'pelota', icon: 'circle-dot' },
  { id: 'basketball3x3', label: 'Baloncesto 3x3', category: 'pelota', icon: 'circle-dot' },
  { id: 'volleyball', label: 'Vóleibol', category: 'pelota', icon: 'circle-dot-dashed' },
  { id: 'beach_volleyball', label: 'Vóley playa', category: 'pelota', icon: 'circle-dot-dashed' },
  { id: 'snow_volleyball', label: 'Snow Vóley', category: 'pelota', icon: 'circle-dot-dashed' },
  { id: 'handball', label: 'Balonmano', category: 'pelota', icon: 'circle-dot' },
  { id: 'rugby', label: 'Rugby', category: 'pelota', icon: 'goal' },
  { id: 'american_football', label: 'Fútbol americano', category: 'pelota', icon: 'goal' },
  { id: 'flag_football', label: 'Flag Football', category: 'pelota', icon: 'flag' },
  { id: 'baseball', label: 'Béisbol', category: 'pelota', icon: 'circle-dot' },
  { id: 'field_hockey', label: 'Hockey césped', category: 'pelota', icon: 'activity' },
  { id: 'floorball', label: 'Floorball', category: 'pelota', icon: 'activity' },
  { id: 'netball', label: 'Netball', category: 'pelota', icon: 'circle-dot' },
  { id: 'korfball', label: 'Korfball', category: 'pelota', icon: 'circle-dot' },
  { id: 'tennis', label: 'Tenis', category: 'pelota', icon: 'target' },
  { id: 'table_tennis', label: 'Tenis de mesa', category: 'pelota', icon: 'target' },
  { id: 'badminton', label: 'Bádminton', category: 'pelota', icon: 'target' },
  { id: 'padel', label: 'Pádel', category: 'pelota', icon: 'target' },
  { id: 'squash', label: 'Squash', category: 'pelota', icon: 'target' },
  { id: 'pickleball', label: 'Pickleball', category: 'pelota', icon: 'target' },
  { id: 'billiards', label: 'Billar', category: 'pelota', icon: 'circle-dot-dashed' },
  { id: 'teqball', label: 'Teqball', category: 'pelota', icon: 'goal' },

  /* ---------------------------- Atletismo ----------------------------- */
  { id: 'running', label: 'Carreras', category: 'atletismo', icon: 'zap' },
  { id: 'relays', label: 'Relevos', category: 'atletismo', icon: 'move' },
  { id: 'long_jump', label: 'Salto de longitud', category: 'atletismo', icon: 'move-up' },
  { id: 'high_jump', label: 'Salto de altura', category: 'atletismo', icon: 'move-up' },
  { id: 'throws', label: 'Lanzamientos', category: 'atletismo', icon: 'target' },
  { id: 'cross_country', label: 'Cross country', category: 'atletismo', icon: 'activity' },
  { id: 'race_walking', label: 'Marcha', category: 'atletismo', icon: 'person-standing' },

  /* -------------------------- Artes marciales ------------------------- */
  { id: 'judo', label: 'Judo', category: 'marcial', icon: 'swords' },
  { id: 'karate', label: 'Karate', category: 'marcial', icon: 'swords' },
  { id: 'taekwondo', label: 'Taekwondo', category: 'marcial', icon: 'swords' },
  { id: 'wrestling', label: 'Lucha', category: 'marcial', icon: 'swords' },
  { id: 'boxing', label: 'Boxeo', category: 'marcial', icon: 'hand-fist' },
  { id: 'mma', label: 'MMA', category: 'marcial', icon: 'hand-fist' },

  /* ---------------------------- Artístico ----------------------------- */
  { id: 'gymnastics', label: 'Gimnasia artística', category: 'artistico', icon: 'star' },
  { id: 'rhythmic_gymnastics', label: 'Gimnasia rítmica', category: 'artistico', icon: 'star' },
  { id: 'figure_skating', label: 'Patinaje artístico', category: 'artistico', icon: 'snowflake' },

  /* --------------------------- Acuáticos ------------------------------- */
  { id: 'swimming', label: 'Natación', category: 'acuatico', icon: 'waves' },
  { id: 'water_polo', label: 'Waterpolo', category: 'acuatico', icon: 'waves' },
  { id: 'rowing', label: 'Remo', category: 'acuatico', icon: 'waves' },
  { id: 'canoeing', label: 'Piragüismo', category: 'acuatico', icon: 'waves' },
  { id: 'diving', label: 'Saltos acrobáticos', category: 'acuatico', icon: 'move-down' },

  /* ----------------------------- Hielo -------------------------------- */
  { id: 'ice_hockey', label: 'Hockey hielo', category: 'hielo', icon: 'activity' },
  { id: 'curling', label: 'Curling', category: 'hielo', icon: 'circle-dot' },
  { id: 'speed_skating', label: 'Patinaje velocidad', category: 'hielo', icon: 'wind' },

  /* ----------------------------- Nieve -------------------------------- */
  { id: 'alpine_ski', label: 'Esquí alpino', category: 'nieve', icon: 'snowflake' },
  { id: 'cross_country_ski', label: 'Esquí de fondo', category: 'nieve', icon: 'snowflake' },
  { id: 'snowboard', label: 'Snowboard', category: 'nieve', icon: 'wind' },
  { id: 'ski_jumping', label: 'Salto de esquí', category: 'nieve', icon: 'move-up' },
  { id: 'biathlon', label: 'Biatlón', category: 'nieve', icon: 'target' },

  /* ---------------------------- Ciclismo ------------------------------ */
  { id: 'road_cycling', label: 'Ciclismo de ruta', category: 'ciclismo', icon: 'bike' },
  { id: 'mountain_biking', label: 'Ciclismo de montaña', category: 'ciclismo', icon: 'bike' },
  { id: 'bmx', label: 'BMX', category: 'ciclismo', icon: 'bike' },
  { id: 'track_cycling', label: 'Ciclismo de pista', category: 'ciclismo', icon: 'bike' },
  { id: 'cyclocross', label: 'Ciclocross', category: 'ciclismo', icon: 'bike' },

  /* ---------------------------- Ecuestre ------------------------------ */
  { id: 'show_jumping', label: 'Salto ecuestre', category: 'ecuestre', icon: 'medal' },
  { id: 'dressage', label: 'Doma clásica', category: 'ecuestre', icon: 'medal' },
  { id: 'eventing', label: 'Concurso completo', category: 'ecuestre', icon: 'medal' },

  /* ---------------------------- Precisión ----------------------------- */
  { id: 'golf', label: 'Golf', category: 'precision', icon: 'flag' },
  { id: 'darts', label: 'Dardos', category: 'precision', icon: 'target' },
  { id: 'bowling', label: 'Boliche', category: 'precision', icon: 'circle-dot' },
  { id: 'archery', label: 'Tiro con arco', category: 'precision', icon: 'target' },

  /* ------------------------------ Otros ------------------------------- */
  { id: 'custom', label: 'Personalizado', category: 'misc', icon: 'trophy' },
] as const

export type SportId = (typeof SPORTS)[number]['id']

/** Icono lucide asignado a cada deporte/categoría (clave → componente). */
export function sportIconOf(id: SportId | string): string {
  return SPORTS.find((s) => s.id === id)?.icon ?? 'trophy'
}

export function sportCategoryOf(id: SportId | string): SportCategoryId {
  return SPORTS.find((s) => s.id === id)?.category ?? 'misc'
}

export const MODALITIES = [
  { id: 'league', label: 'Liga' },
  { id: 'cup', label: 'Copa' },
  { id: 'tournament', label: 'Torneo' },
  { id: 'friendly', label: 'Amistoso' },
  { id: 'other', label: 'Otro' },
] as const

export type ModalityId = (typeof MODALITIES)[number]['id']

export type ProjectStatus = 'active' | 'archived'

/** Modos de trabajo del sistema de marcador. */
export const WORKING_MODES = [
  { id: 'standalone', label: 'Standalone' },
  { id: 'server', label: 'Servidor (MMS)' },
] as const

export type WorkingModeId = (typeof WORKING_MODES)[number]['id']

/** Propiedades de competencia (modal "Competition Property"). */
export interface CompetitionProps {
  /** Título del partido / competencia (p. ej. "Baloncesto"). */
  title?: string
  /** Código corto de la competencia (p. ej. "BKB"). */
  code: string
  /** Sesión / jornada / grupo (p. ej. "01"). */
  session: string
  /** Cancha o pista asignada (p. ej. "[1] A"). */
  court: string
  /** Modo de trabajo: standalone o conectado a servidor MMS. */
  workingMode?: WorkingModeId
  /** URL del servidor (p. ej. "http://192.168.0.230"). */
  serverUrl?: string
  /** Subir resultados al servidor. */
  uploadResults?: boolean
  /** Subir play-by-play y estadísticas al servidor. */
  uploadPlayByPlay?: boolean
}

export interface Project {
  id: string
  name: string
  sport: SportId
  season: string
  location: string
  date: string
  modality: ModalityId
  compProps: CompetitionProps | null
  status: ProjectStatus
  createdAt: number
  updatedAt: number
}

export interface NewProjectInput {
  name: string
  sport: SportId
  season: string
  location: string
  date: string
  modality: ModalityId
  compProps?: CompetitionProps | null
}

export interface Team {
  id: string
  projectId: string
  name: string
  shortName: string
  code: string
  logo: string | null
  primaryColor: string
  secondaryColor: string
  city: string
  country: string
  /** Código ISO de país (p. ej. "ESP") usado en la pantalla de Participantes. */
  countryCode: string
  /** Dorsal/Lot del sorteo (columna "Lots" de Participantes). */
  lot: string
  createdAt: number
}

export type NewTeamInput = Omit<Team, 'id' | 'createdAt'>

export interface Player {
  id: string
  teamId: string
  firstName: string
  lastName: string
  number: number | null
  position: string
  photo: string | null
  isStarter: boolean
  createdAt: number
}

export type NewPlayerInput = Omit<Player, 'id' | 'createdAt'>

/* ------------------------------ Oficiales --------------------------- */

/** Tipos de oficial de un partido (columna "Tipo" de la tabla de oficiales). */
export const OFFICIAL_TYPES = [
  { id: 'referee', label: 'Árbitro' },
  { id: 'umpire', label: 'Umpire' },
  { id: 'scorer', label: 'Anotador' },
  { id: 'timer', label: 'Cronometrista' },
  { id: 'commissioner', label: 'Comisario' },
  { id: 'delegate', label: 'Delegado' },
  { id: 'observer', label: 'Observador' },
  { id: 'medical', label: 'Médico' },
  { id: 'other', label: 'Otro' },
] as const

export type OfficialTypeId = (typeof OFFICIAL_TYPES)[number]['id']

/** Grado/categoría del oficial (columna "Grade"). */
export const OFFICIAL_GRADES = [
  { id: 'fiba', label: 'FIBA' },
  { id: 'continental', label: 'Continental' },
  { id: 'national', label: 'Nacional' },
  { id: 'regional', label: 'Regional' },
  { id: 'local', label: 'Local' },
] as const

export interface MatchOfficial {
  id: string
  matchId: string
  /** Orden de aparición (1, 2, 3…). */
  order: number
  /** Tipo de oficial (clave de OFFICIAL_TYPES; texto libre permitido). */
  type: string
  name: string
  country: string
  /** Grado/categoría (clave de OFFICIAL_GRADES; texto libre permitido). */
  grade: string
  createdAt: number
}

export type NewMatchOfficialInput = Omit<MatchOfficial, 'id' | 'createdAt' | 'matchId'>

export type MatchOfficialUpdate = Partial<NewMatchOfficialInput>

export type MatchStatus = 'scheduled' | 'live' | 'finished'

export const PERIODS = [
  { id: 'first_half', label: 'Primer tiempo', short: '1er Tiempo' },
  { id: 'halftime', label: 'Descanso', short: 'Descanso' },
  { id: 'second_half', label: 'Segundo tiempo', short: '2do Tiempo' },
  { id: 'extra_time', label: 'Prórroga', short: 'Prórroga' },
  { id: 'penalties', label: 'Penales', short: 'Penales' },
  { id: 'finished', label: 'Finalizado', short: 'Final' },
] as const

/** Periodos de deportes con cuartos (básquetbol). */
export const BASKETBALL_PERIODS = [
  { id: 'first_quarter', label: 'Primer cuarto', short: '1er Cuarto' },
  { id: 'second_quarter', label: 'Segundo cuarto', short: '2do Cuarto' },
  { id: 'halftime', label: 'Descanso', short: 'Descanso' },
  { id: 'third_quarter', label: 'Tercer cuarto', short: '3er Cuarto' },
  { id: 'fourth_quarter', label: 'Cuarto cuarto', short: '4to Cuarto' },
  { id: 'extra_time', label: 'Prórroga', short: 'Prórroga' },
  { id: 'finished', label: 'Finalizado', short: 'Final' },
] as const

export type MatchPeriod = (typeof PERIODS)[number]['id'] | (typeof BASKETBALL_PERIODS)[number]['id']

/**
 * Cronómetro regresivo (shot clock, break timer) basado en timestamps:
 * mientras corre, el valor restante se deriva de `endAt`.
 */
export interface DownTimerSnapshot {
  durationMs: number
  running: boolean
  /** Timestamp final mientras corre (null si está pausado/detenido). */
  endAt: number | null
  /** ms restantes cuando está pausado o detenido. */
  remainingMs: number
}

export type PlayerStats = Record<string, { points: number; fouls: number }>

export interface Match {
  possession?: 'home' | 'away' | null
  sportState?: SportMatchState | null
  playerStats?: PlayerStats
  id: string
  projectId: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  status: MatchStatus
  period: MatchPeriod
  venue: string
  kickoff: string
  round: string
  competition: string
  /** Minutos de tiempo añadido (por tiempo) */
  addedTime: number
  /** Cronómetro basado en timestamps: NO se incrementa por tick. */
  timerRunning: boolean
  /** Epoch ms en el que arrancó el tramo actual del cronómetro. */
  timerStartedAt: number | null
  /** Milisegundos acumulados fuera del tramo en curso. */
  timerElapsed: number
  /* ------------- Básquetbol (opcionales; defaults para fútbol) ------------- */
  /** Faltas acumuladas del equipo local. */
  homeFouls: number
  /** Faltas acumuladas del equipo visitante. */
  awayFouls: number
  /** Tiempos fuera del equipo local. */
  homeTimeouts: number
  /** Tiempos fuera del equipo visitante. */
  awayTimeouts: number
  /** Shot clock (posesión, 24 s / 14 s). */
  shotClock: DownTimerSnapshot | null
  /** Break timer (descanso entre periodos). */
  breakTimer: DownTimerSnapshot | null
  /** Resultado confirmado por el operador ("Confirmar Resultado"). */
  resultConfirmed: boolean
  /* ------------- Vóleibol (opcionales; defaults vacíos) ------------- */
  /** Sets ya finalizados. El set en curso usa homeScore/awayScore. */
  sets: MatchSet[]
  createdAt: number
  updatedAt: number
}

/** Resultado de un set finalizado (vóleibol). */
export interface MatchSet {
  home: number
  away: number
}

export interface NewMatchInput {
  projectId: string
  homeTeamId: string
  awayTeamId: string
  venue: string
  kickoff: string
  round: string
  competition: string
}

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'yellow'
  | 'red'
  | 'substitution'
  | 'penalty'
  | 'var'
  | 'added_time'
  | 'assist'
  | 'save'
  | 'foul'
  | 'offside'
  | 'corner'
  | 'free_kick'
  | 'set'

export interface MatchEvent {
  id: string
  matchId: string
  teamId: string | null
  playerId: string | null
  type: MatchEventType
  minute: number
  description: string
  /** Jugador secundario (p. ej. asistente en un gol, sustituido en un cambio). */
  secondaryPlayerId: string | null
  createdAt: number
}

export type NewMatchEventInput = Omit<MatchEvent, 'id' | 'createdAt'>

export interface MatchEventUpdate {
  minute?: number
  description?: string
  playerId?: string | null
  secondaryPlayerId?: string | null
  teamId?: string | null
}

export interface MediaItem {
  id: string
  projectId: string
  name: string
  kind: 'image' | 'text'
  data: string
  duration: number
  createdAt: number
}

/* ------------------------- Multimedia avanzada ------------------------- */

export type VideoStatus = 'ready' | 'playing' | 'paused' | 'ended'

export interface VideoItem {
  id: string
  projectId: string
  name: string
  /** Data URL o ruta del video. */
  src: string
  /** Duración en segundos (0 si se desconoce). */
  duration: number
  createdAt: number
}

export type NewVideoInput = Omit<VideoItem, 'id' | 'createdAt' | 'projectId'> & { projectId?: string }

export interface ScheduledSequence {
  id: string
  projectId: string
  name: string
  /** IDs de elementos multimedia en orden de reproducción. */
  itemIds: string[]
  /** Intervalo entre elementos en segundos. */
  intervalSec: number
  /** Si está activa, se reproduce en bucle. */
  loop: boolean
  createdAt: number
}

export type NewScheduledSequenceInput = Omit<ScheduledSequence, 'id' | 'createdAt' | 'projectId'> & {
  projectId?: string
}

export interface SponsorRotation {
  id: string
  projectId: string
  name: string
  /** IDs de imágenes de sponsors en orden de rotación. */
  imageIds: string[]
  /** Intervalo entre cambios en segundos. */
  intervalSec: number
  /** Si la rotación está activa. */
  active: boolean
  createdAt: number
}

export type NewSponsorRotationInput = Omit<SponsorRotation, 'id' | 'createdAt' | 'projectId'> & {
  projectId?: string
}

/* ------------------------- Tabla de posiciones ------------------------- */

export interface StandingEntry {
  id: string
  projectId: string
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  createdAt: number
}

export type NewStandingEntryInput = Omit<StandingEntry, 'id' | 'createdAt' | 'projectId'> & { projectId?: string }

/* ------------------------- Atajos configurables ------------------------- */

export interface ShortcutBinding {
  id: string
  /** Acción que dispara el atajo (p. ej. 'goal.home', 'clock.toggle'). */
  action: string
  /** Tecla o combinación (p. ej. 'Q', 'CTRL+Q', 'F11'). */
  keys: string
  /** Si el atajo está habilitado. */
  enabled: boolean
  createdAt: number
}

export type NewShortcutBindingInput = Omit<ShortcutBinding, 'id' | 'createdAt'>

/* ------------------------- Perfil de operador ------------------------- */

export interface OperatorProfile {
  id: string
  name: string
  role: string
  email: string
  createdAt: number
}

export type NewOperatorProfileInput = Omit<OperatorProfile, 'id' | 'createdAt'>

/* ------------------------- Acta PDF ------------------------- */

export interface MatchAct {
  id: string
  matchId: string
  /** Contenido del acta en formato JSON. */
  content: string
  createdAt: number
}

export type NewMatchActInput = Omit<MatchAct, 'id' | 'createdAt'>

export type ScoreboardLayout = 'classic' | 'modern' | 'minimal' | 'broadcast'

export const SCOREBOARD_LAYOUTS: { id: ScoreboardLayout; label: string; hint: string }[] = [
  { id: 'classic', label: 'Classic', hint: 'Barra clara, tipografía tradicional' },
  { id: 'modern', label: 'Modern', hint: 'Bloques con color de equipo' },
  { id: 'minimal', label: 'Minimal', hint: 'Limpio y sobrio' },
  { id: 'broadcast', label: 'Broadcast', hint: 'Estilo transmisión TV' },
]

/* --------------------------- Cronómetro --------------------------- */

export interface TimerSnapshot {
  running: boolean
  startedAt: number | null
  /** ms acumulados sin contar el tramo en curso */
  elapsed: number
}

/* --------------------------- Cuenta atrás -------------------------- */

/**
 * Cuenta atrás regresiva (calentamiento, descansos…).
 * Basada en timestamps como el cronómetro: `endAt` marca cuándo termina.
 */
export interface CountdownSnapshot {
  durationMs: number
  running: boolean
  /** Timestamp final mientras está en marcha (null si no corre). */
  endAt: number | null
  /** ms restantes cuando está pausada o detenida. */
  remainingMs: number
  /** Si es true se muestra en la ventana Display. */
  visible: boolean
}

/* --------------------------- Diseño del marcador -------------------- */

/**
 * Lienzo virtual de diseño: todas las coordenadas de los ítems se expresan
 * en esta unidad y la pantalla/editor las escalan al tamaño real.
 */
export const DESIGN_CANVAS = { width: 1920, height: 1080 } as const

export type DesignItemType =
  | 'title'
  | 'text'
  | 'box'
  | 'image'
  | 'team_home'
  | 'team_away'
  | 'logo_home'
  | 'logo_away'
  | 'score_home'
  | 'score_away'
  | 'period'
  | 'clock'
  | 'shot_clock'
  | 'fouls_home'
  | 'fouls_away'
  | 'player_row'
  | 'player_stats_row'
  | 'timeouts_home'
  | 'timeouts_away'
  | 'possession_home'
  | 'possession_away'

export type DesignAlign = 'left' | 'center' | 'right'

/** Un elemento colocado en el lienzo de diseño. */
export interface DesignItem {
  fontFamily?: string
  activeColor?: string
  indicatorColor?: string
  fullTeamName?: boolean
  clockStyle?: 'standard' | 'basketball'
  id: string
  type: DesignItemType
  /** Posición y tamaño en el lienzo virtual. */
  x: number
  y: number
  w: number
  h: number
  /** Texto fijo (título, etiqueta…) o etiqueta del jugador. */
  text: string
  color: string
  bg: string
  /** Tamaño de fuente en unidades del lienzo virtual. */
  fontSize: number
  align: DesignAlign
  /** Radio de esquina en unidades del lienzo virtual. */
  radius: number
  /** Lado para ítems con nombre/logotipo/faltas. */
  side?: 'home' | 'away'
  /** Fila de jugador (1…N). */
  index?: number
  /** Imagen (ítem `image`). */
  src: string | null
}

/** Diseño personalizado de la pantalla de marcador. */
export interface ScoreboardDesign {
  preset?: 'default' | 'fiba1' | 'fiba2'
  sport?: SportId
  /** Si está desactivado se usan las plantillas nativas (classic/modern/…). */
  enabled: boolean
  background: string | null
  items: DesignItem[]
}

/* ----------------------- Sincronización display ------------------- */

export interface DisplayTeamInfo {
  players?: Player[]
  id: string
  name: string
  shortName: string
  logo: string | null
  primaryColor: string
  secondaryColor: string
}

export interface DisplayState {
  playerStats?: PlayerStats
  homeTimeouts?: number
  awayTimeouts?: number
  possession?: 'home' | 'away' | null
  sportState?: SportMatchState | null
  showPlayers?: boolean
  matchId: string | null
  competition: string
  round: string
  venue: string
  status: MatchStatus
  period: MatchPeriod
  periodLabel: string
  addedTime: number
  homeScore: number
  awayScore: number
  home: DisplayTeamInfo | null
  away: DisplayTeamInfo | null
  timer: TimerSnapshot
  countdown: CountdownSnapshot | null
  /** Básquetbol: faltas por equipo (null si el deporte no usa faltas). */
  homeFouls: number | null
  awayFouls: number | null
  /** Básquetbol: cronómetro de posesión basado en timestamps (null si no está en uso). */
  shotClock: DownTimerSnapshot | null
  /** Vóleibol: sets finalizados (vacío en otros deportes). */
  sets: MatchSet[]
  layout: ScoreboardLayout
  /** Diseño personalizado (lo inyecta el proceso principal desde la configuración). */
  design: ScoreboardDesign | null
  updatedAt: number
}

/**
 * Estado que emite el renderer hacia la ventana Display:
 * `layout` y `design` los añade el proceso principal (ambos viven en settings).
 */
export type DisplaySyncState = Omit<DisplayState, 'layout' | 'design'>

export interface OverlayPayload {
  id: string
  kind: 'text' | 'image' | 'video'
  sourceKind?: 'video' | 'sequence' | 'sponsor'
  sourceId?: string
  videoId?: string
  text: string
  dataUrl: string | null
  durationMs: number
}

export interface DisplayInfo {
  id: number
  label: string
  primary: boolean
  width: number
  height: number
  bounds: { x: number; y: number; width: number; height: number }
}

export interface DisplayOpenOptions {
  displayId?: number
  /** Si es true, abre directamente en pantalla completa. Por defecto: ventana sin bordes (movible). */
  fullscreen?: boolean
}

export interface ExportResult {
  ok: boolean
  canceled: boolean
  filePath?: string
  error?: string
}

export interface ImportResult {
  ok: boolean
  canceled: boolean
  project?: Project
  error?: string
}

/* ----------------------------- OBS Studio ----------------------------- */

export type ObsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type ObsStreamingStatus = 'offline' | 'starting' | 'streaming' | 'stopping'

export interface ObsConnectionConfig {
  host: string
  port: number
  password: string
}

export interface ObsScene {
  sceneName: string
  sceneIndex: number
}

export interface ObsSource {
  sourceName: string
  sourceType: string
  visible: boolean
}

export interface ObsState {
  connectionStatus: ObsConnectionStatus
  streamingStatus: ObsStreamingStatus
  currentScene: string | null
  scenes: ObsScene[]
  sources: ObsSource[]
  error: string | null
}

/** Estado del servidor web local (marcador para OBS). */
export interface ObsServerState {
  running: boolean
  port: number
  url: string | null
}

export interface ScreenAssignment {
  controlDisplayId: number | null
  scoreboardDisplayId: number | null
  liveDisplayId: number | null
}
