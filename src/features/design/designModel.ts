import {
  DESIGN_CANVAS,
  SPORTS,
  sportCategoryOf,
  type SportId,
  type DesignItemType,
  type DesignItem,
  type DisplayState,
  type ScoreboardDesign,
} from '@/types'

export interface DesignItemMeta {
  id: DesignItemType
  label: string
  hint: string
}

/** Clave de settings donde se guarda el diseño personalizado. */
export const DESIGN_SETTING_KEY = 'scoreboard.design'

/** Catálogo de ítems que se pueden añadir al lienzo de diseño. */
export const DESIGN_ITEM_TYPES: DesignItemMeta[] = [
  { id: 'title', label: 'Título del partido', hint: 'Texto fijo (competencia / ronda)' },
  { id: 'text', label: 'Texto libre', hint: 'Etiqueta manual: FALTAS, LOCAL…' },
  { id: 'box', label: 'Bloque de fondo', hint: 'Rectángulo de color para agrupar' },
  { id: 'image', label: 'Imagen', hint: 'Logotipo o imagen decorativa' },
  { id: 'team_home', label: 'Nombre equipo local', hint: 'Se actualiza con el partido' },
  { id: 'team_away', label: 'Nombre equipo visitante', hint: 'Se actualiza con el partido' },
  { id: 'logo_home', label: 'Logotipo local', hint: 'Escudo o inicial del local' },
  { id: 'logo_away', label: 'Logotipo visitante', hint: 'Escudo o inicial del visitante' },
  { id: 'score_home', label: 'Marcador local', hint: 'Puntuación del equipo local' },
  { id: 'score_away', label: 'Marcador visitante', hint: 'Puntuación del equipo visitante' },
  { id: 'period', label: 'Periodo / Cuarto', hint: 'Etiqueta de periodo' },
  { id: 'clock', label: 'Reloj del partido', hint: 'Cronómetro mm:ss' },
  { id: 'shot_clock', label: 'Shot clock', hint: 'Cronómetro de posesión' },
  { id: 'fouls_home', label: 'Faltas local', hint: 'Total de faltas del local' },
  { id: 'fouls_away', label: 'Faltas visitante', hint: 'Total de faltas del visitante' },
  { id: 'player_row', label: 'Fila de jugador', hint: 'Número + nombre (plantilla)' },
  { id: 'player_stats_row', label: 'Jugador con estadísticas', hint: 'Número, nombre, cinco faltas y puntos' },
  { id: 'timeouts_home', label: 'Tiempos muertos local', hint: 'Indicadores de tiempos muertos utilizados' },
  { id: 'timeouts_away', label: 'Tiempos muertos visitante', hint: 'Indicadores de tiempos muertos utilizados' },
  { id: 'possession_home', label: 'Posesión local', hint: 'Flecha de posesión alterna' },
  { id: 'possession_away', label: 'Posesión visitante', hint: 'Flecha de posesión alterna' },
]

export const DESIGN_ITEM_LABEL: Record<DesignItemType, string> = DESIGN_ITEM_TYPES.reduce(
  (acc, meta) => ({ ...acc, [meta.id]: meta.label }),
  {} as Record<DesignItemType, string>,
)

let idSeq = 0
function nextId(type: string): string {
  idSeq += 1
  return `${type}-${Date.now().toString(36)}${idSeq.toString(36)}`
}

/** Crea un ítem con los valores por defecto de su tipo, centrado en el lienzo. */
export function createDesignItem(type: DesignItemType, order = 0): DesignItem {
  const base: DesignItem = {
    id: nextId(type),
    type,
    x: Math.round(DESIGN_CANVAS.width / 2 - 240) + order * 24,
    y: Math.round(DESIGN_CANVAS.height / 2 - 60) + order * 24,
    w: 480,
    h: 120,
    text: '',
    color: '#F8FAFC',
    bg: 'transparent',
    fontSize: 56,
    align: 'center',
    radius: 12,
    src: null,
  }

  switch (type) {
    case 'title':
      return { ...base, w: 760, h: 90, fontSize: 52, text: 'NOMBRE DEL PARTIDO' }
    case 'text':
      return { ...base, w: 320, h: 70, fontSize: 40, color: '#94A3B8', text: 'ETIQUETA' }
    case 'box':
      return { ...base, w: 420, h: 220, bg: '#101722', color: 'transparent', fontSize: 1 }
    case 'image':
      return { ...base, w: 240, h: 240, bg: 'transparent', color: 'transparent', fontSize: 1 }
    case 'team_home':
    case 'team_away':
      return { ...base, w: 400, h: 90, fontSize: 48, text: type === 'team_home' ? 'LOCAL' : 'VISITANTE', side: type === 'team_home' ? 'home' : 'away' }
    case 'logo_home':
    case 'logo_away':
      return { ...base, w: 160, h: 160, side: type === 'logo_home' ? 'home' : 'away' }
    case 'score_home':
    case 'score_away':
      return { ...base, w: 400, h: 220, fontSize: 150, bg: '#101722', side: type === 'score_home' ? 'home' : 'away' }
    case 'period':
      return { ...base, w: 400, h: 80, fontSize: 44, bg: '#1B222B', text: '' }
    case 'clock':
      return { ...base, w: 420, h: 140, fontSize: 96, bg: '#0B0F14', color: '#F8FAFC' }
    case 'shot_clock':
      return { ...base, w: 320, h: 130, fontSize: 84, bg: '#DC2626', color: '#FFFFFF' }
    case 'fouls_home':
    case 'fouls_away':
      return {
        ...base,
        w: 400,
        h: 100,
        fontSize: 68,
        bg: '#101722',
        side: type === 'fouls_home' ? 'home' : 'away',
      }
    case 'player_row':
      return { ...base, w: 360, h: 64, fontSize: 30, bg: '#0E141C', color: '#E2E8F0', align: 'left', index: 1, side: 'home', text: '' }
    case 'player_stats_row':
      return { ...base, w: 410, h: 64, fontSize: 32, align: 'left', index: 1, side: 'home' }
    case 'timeouts_home':
    case 'timeouts_away':
      return { ...base, w: 260, h: 70, fontSize: 54, side: type === 'timeouts_home' ? 'home' : 'away' }
    case 'possession_home':
    case 'possession_away':
      return { ...base, w: 160, h: 100, fontSize: 80, side: type === 'possession_home' ? 'home' : 'away' }
  }
}

/** Etiqueta visible en el selector de ítems. */
export function designItemLabel(item: DesignItem, order: number): string {
  const base = DESIGN_ITEM_LABEL[item.type] ?? item.type
  if (item.type === 'player_row' || item.type === 'player_stats_row') {
    const side = item.side === 'away' ? 'visitante' : 'local'
    return `${base} ${side} ${String(item.index ?? order + 1).padStart(2, '0')}`
  }
  if (item.type === 'text' && item.text.trim()) return `${base}: ${item.text.trim()}`
  return `${String(order + 1).padStart(2, '0')} · ${base}`
}

function row(side: 'home' | 'away', index: number, x: number): DesignItem {
  const item = createDesignItem('player_row')
  return { ...item, id: nextId('player_row'), side, index, x, y: 40 + (index - 1) * 74, w: 380, h: 64 }
}

/**
 * Plantilla por defecto: composición de baloncesto con columnas de jugadores,
 * bloques de marcador, reloj central y faltas (patrón de la pantalla de diseño).
 */
export function defaultDesign(sport: SportId = 'basketball'): ScoreboardDesign {
  if (sport !== 'basketball' && sport !== 'basketball3x3') return sportDesign(sport)
  const items: DesignItem[] = []
  const push = (item: DesignItem): void => void items.push(item)

  // Fila superior
  push({ ...createDesignItem('title'), x: 720, y: 24, w: 480, h: 72, fontSize: 44, text: 'NOMBRE DEL PARTIDO' })

  // Nombres de equipo
  push({ ...createDesignItem('team_home'), x: 520, y: 116, w: 400, h: 70, fontSize: 46 })
  push({ ...createDesignItem('team_away'), x: 1000, y: 116, w: 400, h: 70, fontSize: 46 })

  // Marcadores con su bloque de fondo
  push({ ...createDesignItem('box'), x: 520, y: 200, w: 400, h: 250, bg: '#101722' })
  push({ ...createDesignItem('score_home'), x: 520, y: 215, w: 400, h: 220, fontSize: 150 })
  push({ ...createDesignItem('box'), x: 1000, y: 200, w: 400, h: 250, bg: '#101722' })
  push({ ...createDesignItem('score_away'), x: 1000, y: 215, w: 400, h: 220, fontSize: 150 })

  // Periodo + reloj
  push({ ...createDesignItem('period'), x: 760, y: 478, w: 400, h: 74, fontSize: 42 })
  push({ ...createDesignItem('clock'), x: 760, y: 566, w: 400, h: 132, fontSize: 92, bg: '#0B0F14' })

  // Faltas de cada equipo
  push({ ...createDesignItem('text'), x: 520, y: 712, w: 400, h: 50, fontSize: 30, text: 'FALTAS', color: '#94A3B8' })
  push({ ...createDesignItem('fouls_home'), x: 520, y: 766, w: 400, h: 96, fontSize: 64 })
  push({ ...createDesignItem('text'), x: 1000, y: 712, w: 400, h: 50, fontSize: 30, text: 'FALTAS', color: '#94A3B8' })
  push({ ...createDesignItem('fouls_away'), x: 1000, y: 766, w: 400, h: 96, fontSize: 64 })

  // Shot clock bajo el reloj
  push({ ...createDesignItem('shot_clock'), x: 800, y: 716, w: 320, h: 120, fontSize: 78 })

  // Columnas de jugadores (14 por banda)
  for (let i = 1; i <= 14; i += 1) {
    push(row('home', i, 40))
    push(row('away', i, 1500))
  }

  return { enabled: true, sport, background: null, items }
}

/** FIBA 1: composición de la referencia, editable como cualquier diseño. */
export function fiba1Design(): ScoreboardDesign {
  const items: DesignItem[] = []
  const add = (type: DesignItemType, changes: Partial<DesignItem>) => items.push({ ...createDesignItem(type), radius: 0, bg: 'transparent', fontFamily: 'Arial, sans-serif', ...changes })
  add('box', { x: 0, y: 0, w: 1920, h: 1080, bg: 'linear-gradient(105deg, #080808, #1b1b1b 45%, #080808)', fontSize: 1 })
  add('title', { x: 435, y: 32, w: 1050, h: 85, text: '', fontSize: 54 })
  for (const side of ['home', 'away'] as const) {
    const x = side === 'home' ? 430 : 1180
    add(side === 'home' ? 'team_home' : 'team_away', { x: x - 40, y: 145, w: 400, h: 100, fontSize: 56, color: '#ffff00', fullTeamName: true })
    add(side === 'home' ? 'score_home' : 'score_away', { x: x + 10, y: 265, w: 300, h: 300, fontSize: 250, color: '#ff0000' })
    add(side === 'home' ? 'timeouts_home' : 'timeouts_away', { x: x + 20, y: 595, w: 270, h: 80, color: '#b8b8b8', fontSize: 62 })
    add(side === 'home' ? 'possession_home' : 'possession_away', { x: x + 65, y: 700, w: 190, h: 110, color: '#d0d0d0' })
    add('text', { x, y: 835, w: 310, h: 60, text: 'FALTAS', fontSize: 44, color: '#ffff00' })
    add(side === 'home' ? 'fouls_home' : 'fouls_away', { x, y: 910, w: 310, h: 110, fontSize: 100, color: '#ffff00' })
    for (let index = 1; index <= 12; index++) add('player_stats_row', { side, index, x: side === 'home' ? 10 : 1510, y: 36 + (index - 1) * 83, w: 400, h: 65, fontSize: 34 })
  }
  add('period', { x: 760, y: 310, w: 400, h: 90, color: '#00ff00', fontSize: 54 })
  add('shot_clock', { x: 815, y: 470, w: 290, h: 120, color: '#ffff00', fontSize: 100 })
  add('clock', { x: 655, y: 675, w: 610, h: 230, color: '#ffffff', fontSize: 170, clockStyle: 'basketball' })
  return { enabled: true, sport: 'basketball', preset: 'fiba1', background: null, items }
}

/** FIBA 2: marcador compacto sin jugadores, basado en la referencia. */
export function fiba2Design(): ScoreboardDesign {
  const items: DesignItem[] = []
  const add = (type: DesignItemType, changes: Partial<DesignItem>) => items.push({ ...createDesignItem(type), radius: 0, bg: 'transparent', fontFamily: 'Arial, sans-serif', ...changes })
  add('box', { x: 0, y: 0, w: 1920, h: 1080, bg: 'repeating-linear-gradient(90deg, #ffffff02 0px, #ffffff02 1px, transparent 1px, transparent 5px), linear-gradient(105deg, #080808, #1b1b1b 45%, #080808)', fontSize: 1 })
  add('title', { x: 300, y: 115, w: 1320, h: 100, text: '', fontSize: 78 })
  for (const side of ['home', 'away'] as const) {
    const home = side === 'home'
    add(home ? 'team_home' : 'team_away', { x: home ? 315 : 1085, y: 220, w: 520, h: 100, fontSize: 80, color: '#ffff00', fullTeamName: true })
    add(home ? 'score_home' : 'score_away', { x: home ? 385 : 1155, y: 335, w: 380, h: 285, fontSize: 270, color: '#ff0000' })
    add(home ? 'timeouts_home' : 'timeouts_away', { x: home ? 225 : 1470, y: 645, w: 200, h: 75, fontSize: 76, color: '#909090' })
    add(home ? 'possession_home' : 'possession_away', { x: home ? 40 : 1740, y: 670, w: 130, h: 130, color: '#b8b8b8' })
    add('text', { x: home ? 175 : 1520, y: 790, w: 220, h: 60, text: 'FOUL', fontSize: 40, color: '#ffff00' })
    add(home ? 'fouls_home' : 'fouls_away', { x: home ? 175 : 1520, y: 850, w: 220, h: 100, fontSize: 92, color: '#ffff00' })
  }
  add('period', { x: 730, y: 360, w: 460, h: 80, fontSize: 54, color: '#00ff00' })
  add('clock', { x: 650, y: 660, w: 620, h: 240, fontSize: 230, color: '#ffffff', clockStyle: 'basketball' })
  return { enabled: true, sport: 'basketball', preset: 'fiba2', background: null, items }
}

export function designFamily(sport: SportId): string {
  if (sport === 'basketball' || sport === 'basketball3x3') return 'basketball'
  if (['volleyball', 'beach_volleyball', 'snow_volleyball', 'tennis', 'table_tennis', 'badminton', 'padel', 'squash', 'pickleball', 'teqball'].includes(sport)) return 'sets'
  if (sportCategoryOf(sport) === 'marcial') return 'combat'
  if (['football', 'football7', 'futsal', 'rugby', 'american_football', 'flag_football', 'handball', 'field_hockey', 'ice_hockey', 'floorball', 'water_polo', 'netball', 'korfball'].includes(sport)) return 'football'
  return 'general'
}

function sportDesign(sport: SportId): ScoreboardDesign {
  const family = designFamily(sport)
  const items: DesignItem[] = []
  const add = (type: DesignItemType, changes: Partial<DesignItem>): void => {
    items.push({ ...createDesignItem(type), ...changes })
  }
  add('title', { x: 460, y: 70, w: 1000, h: 90 })
  add('text', { x: 660, y: 170, w: 600, h: 60, text: SPORTS.find(s => s.id === sport)?.label.toUpperCase() ?? '' })
  const radius = family === 'combat' ? 150 : family === 'sets' ? 36 : 12
  for (const side of ['home', 'away'] as const) {
    const x = side === 'home' ? 280 : 1120
    add(side === 'home' ? 'team_home' : 'team_away', { x, y: 300, w: 520, h: 90 })
    add(side === 'home' ? 'score_home' : 'score_away', { x, y: 410, w: 520, h: 300, fontSize: 180, bg: side === 'home' ? '#1D4ED8' : '#B91C1C', radius })
    if (family === 'football') add(side === 'home' ? 'logo_home' : 'logo_away', { x: x + 180, y: 760, w: 160, h: 160, radius: 80 })
  }
  if (family === 'sets') {
    add('period', { x: 760, y: 780, w: 400, h: 90, radius: 36 })
    add('text', { x: 660, y: 890, w: 600, h: 60, text: 'PUNTOS DEL SET' })
  } else {
    add('period', { x: 760, y: 260, w: 400, h: 70 })
    add('clock', { x: 710, y: 780, w: 500, h: 140, radius: family === 'combat' ? 70 : 12 })
  }
  return { enabled: true, sport, background: null, items }
}

/** Analiza el JSON guardado en settings y valida la forma mínima. */
export function parseDesign(raw: string | null | undefined): ScoreboardDesign | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Partial<ScoreboardDesign>
    if (!Array.isArray(candidate.items)) return null
    const items = candidate.items.filter((item): item is DesignItem => isDesignItem(item))
    return {
      enabled: candidate.enabled !== false,
      preset: candidate.preset === 'fiba1' || candidate.preset === 'fiba2' || candidate.preset === 'default' ? candidate.preset : undefined,
      sport: SPORTS.some(s => s.id === candidate.sport) ? candidate.sport : undefined,
      background: typeof candidate.background === 'string' && candidate.background ? candidate.background : null,
      backgroundColor: typeof candidate.backgroundColor === 'string' ? candidate.backgroundColor : undefined,
      items,
    }
  } catch {
    return null
  }
}

function isDesignItem(value: unknown): value is DesignItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<DesignItem>
  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    DESIGN_ITEM_TYPES.some((meta) => meta.id === item.type) &&
    typeof item.x === 'number' &&
    typeof item.y === 'number' &&
    typeof item.w === 'number' &&
    typeof item.h === 'number'
  )
}

export function serializeDesign(design: ScoreboardDesign): string {
  return JSON.stringify(design)
}

/** Una imagen de pantalla sustituye los bloques que cubren todo el lienzo. */
export function visibleDesignItems(design: ScoreboardDesign): DesignItem[] {
  return design.items.filter(item => !(design.background && item.type === 'box' && item.x === 0 && item.y === 0 && item.w === DESIGN_CANVAS.width && item.h === DESIGN_CANVAS.height))
}

/** Recorta un valor al lienzo para que ningún ítem se salga. */
export function clampItem(item: DesignItem): DesignItem {
  const w = Math.max(24, Math.min(item.w, DESIGN_CANVAS.width))
  const h = Math.max(24, Math.min(item.h, DESIGN_CANVAS.height))
  const x = Math.max(0, Math.min(item.x, DESIGN_CANVAS.width - w))
  const y = Math.max(0, Math.min(item.y, DESIGN_CANVAS.height - h))
  return { ...item, x, y, w, h }
}

/** Cambia el tipo de un ítem conservando su identidad y su posición en el lienzo. */
export function applyItemType(item: DesignItem, type: DesignItemType): DesignItem {
  const defaults = createDesignItem(type)
  return { ...item, ...defaults, id: item.id, x: item.x, y: item.y }
}

/** Copia un ítem con id nuevo, desplazada para que se distinga del original. */
export function cloneItem(item: DesignItem, dx = 32, dy = 32): DesignItem {
  return clampItem({ ...item, id: nextId(item.type), x: item.x + dx, y: item.y + dy })
}

/** Estado de muestra: permite previsualizar el diseño sin partido activo. */
export function previewState(sport: SportId = 'basketball'): DisplayState {
  const family = designFamily(sport)
  const now = Date.now()
  return {
    matchId: null,
    competition: 'Liga Nacional',
    round: 'Jornada 3',
    venue: 'Pabellón Central',
    status: 'live',
    period: 'first_quarter',
    periodLabel: family === 'basketball' ? '1er Cuarto' : family === 'sets' ? 'SET 1' : family === 'combat' ? 'ROUND 1' : family === 'football' ? '1er tiempo' : 'EN CURSO',
    addedTime: 0,
    homeScore: family === 'basketball' ? 58 : family === 'sets' ? 15 : 2,
    awayScore: family === 'basketball' ? 61 : family === 'sets' ? 12 : 1,
    home: {
      id: 'home',
      name: 'Los Halcones',
      shortName: 'HAL',
      logo: null,
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
    },
    away: {
      id: 'away',
      name: 'Aurora Team',
      shortName: 'AUR',
      logo: null,
      primaryColor: '#DC2626',
      secondaryColor: '#991B1B',
    },
    timer: { running: true, startedAt: now - 512_000, elapsed: 512_000 },
    countdown: null,
    homeFouls: 12,
    awayFouls: 9,
    shotClock: { durationMs: 24_000, running: true, endAt: now + 13_400, remainingMs: 13_400 },
    sets: [{ home: 25, away: 23 }],
    layout: 'broadcast',
    design: null,
    updatedAt: now,
  }
}
