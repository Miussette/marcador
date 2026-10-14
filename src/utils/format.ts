import { BASKETBALL_PERIODS, MODALITIES, PERIODS, SPORTS } from '@/types'
import type { MatchPeriod, MatchStatus, ModalityId, SportId } from '@/types'

/** Lista completa de periodos (fútbol + básquetbol) para búsquedas de etiqueta. */
const ALL_PERIODS = [...PERIODS, ...BASKETBALL_PERIODS]

export function sportLabel(id: SportId | string): string {
  return SPORTS.find((s) => s.id === id)?.label ?? String(id)
}

export function modalityLabel(id: ModalityId | string): string {
  return MODALITIES.find((m) => m.id === id)?.label ?? String(id)
}

export function periodLabel(id: MatchPeriod | string): string {
  return ALL_PERIODS.find((p) => p.id === id)?.label ?? String(id)
}

export function periodShort(id: MatchPeriod | string): string {
  return ALL_PERIODS.find((p) => p.id === id)?.short ?? String(id)
}

/** true si el deporte se juega con cuartos (básquetbol). */
export function isQuarterSport(sport: SportId | string): boolean {
  return sport === 'basketball' || sport === 'basketball3x3'
}

/** true si el deporte se juega por sets (vóleibol). */
export function isSetSport(sport: SportId | string): boolean {
  return sport === 'volleyball' || sport === 'beach_volleyball' || sport === 'snow_volleyball'
}

export const STATUS_META: Record<MatchStatus, { label: string; dot: string; text: string }> = {
  scheduled: { label: 'Programado', dot: 'bg-muted', text: 'text-muted' },
  live: { label: 'En juego', dot: 'bg-danger', text: 'text-danger' },
  finished: { label: 'Finalizado', dot: 'bg-success', text: 'text-success' },
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Texto legible sobre un color de fondo (hex). */
export function contrastText(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '#FFFFFF'
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0B0F14' : '#FFFFFF'
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Ocurrió un error inesperado.'
}
