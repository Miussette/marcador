import { useMemo, useState } from 'react'
import {
  Activity,
  Bike,
  CircleDot,
  CircleDotDashed,
  Flag,
  Goal,
  HandFist,
  Medal,
  Move,
  MoveDown,
  MoveUp,
  PersonStanding,
  Search,
  Snowflake,
  Star,
  Swords,
  Target,
  Trophy,
  Wind,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SPORTS, SPORT_CATEGORIES, sportCategoryOf, sportIconOf } from '@/types'
import type { SportCategoryId, SportId } from '@/types'
import { Input } from '@/components/ui/Form'
import { cn } from '@/utils/cn'
import { hasSportGlyph, SportGlyph } from './SportGlyph'

/** Clave de `SPORTS[].icon` → componente lucide. */
export const SPORT_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  bike: Bike,
  'circle-dot': CircleDot,
  'circle-dot-dashed': CircleDotDashed,
  flag: Flag,
  goal: Goal,
  'hand-fist': HandFist,
  medal: Medal,
  move: Move,
  'move-down': MoveDown,
  'move-up': MoveUp,
  'person-standing': PersonStanding,
  snowflake: Snowflake,
  star: Star,
  swords: Swords,
  target: Target,
  trophy: Trophy,
  wind: Wind,
  zap: Zap,
}

/** Icono de un deporte o categoría (con reclamo a Trophy). */
export function sportIcon(id: string): LucideIcon {
  return SPORT_ICONS[id] ?? Trophy
}

/** Icono del deporte a partir de su id (p. ej. 'football' → Goal). */
export function SportIcon({
  id,
  size = 15,
  className,
}: {
  id: string
  size?: number
  className?: string
}) {
  const Icon = sportIcon(sportIconOf(id))
  if (hasSportGlyph(id)) return <SportGlyph id={id} size={size} className={className} />
  return <Icon size={size} className={className} />
}

interface SportPickerProps {
  value: SportId
  onChange: (id: SportId) => void
}

/**
 * Selector de deporte estilo "Open Project": categorías a la izquierda,
 * rejilla de deportes con icono + buscador a la derecha.
 */
export function SportPicker({ value, onChange }: SportPickerProps) {
  const [category, setCategory] = useState<SportCategoryId>(sportCategoryOf(value))
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const map = new Map<SportCategoryId, number>()
    for (const sport of SPORTS) map.set(sport.category, (map.get(sport.category) ?? 0) + 1)
    return map
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return SPORTS.filter((s) => s.label.toLowerCase().includes(q))
    return SPORTS.filter((s) => s.category === category)
  }, [query, category])

  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[168px_1fr] sm:items-start">
      {/* Categorías (chips horizontales en móvil, columna en escritorio) */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:max-h-[336px] sm:flex-col sm:gap-0.5 sm:overflow-x-hidden sm:overflow-y-auto sm:px-0 sm:pb-0">
        {SPORT_CATEGORIES.map((cat) => {
          const Icon = sportIcon(cat.icon)
          const active = !query && cat.id === category
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id)
                setQuery('')
              }}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors sm:w-full',
                active ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{cat.label}</span>
              <span className={cn('ml-auto hidden text-xs sm:inline', active ? 'text-white/70' : 'text-muted/70')}>
                {counts.get(cat.id) ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Buscador + rejilla */}
      <div className="min-w-0">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar deporte…"
            className="pl-9"
            aria-label="Buscar deporte"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-center">
            <Search className="h-5 w-5 text-muted" />
            <p className="text-sm text-muted">
              Ningún deporte coincide con «{query.trim()}»
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid max-h-[336px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-5">
            {filtered.map((sport) => {
              const selected = sport.id === value
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => onChange(sport.id)}
                  aria-pressed={selected}
                  className={cn(
                    'group flex flex-col items-center gap-2 rounded-xl border p-2.5 text-center transition-colors',
                    selected
                      ? 'border-primary bg-primary/15'
                      : 'border-line bg-surface hover:border-muted hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                      selected ? 'bg-primary text-white' : 'bg-surface-2 text-muted group-hover:text-ink',
                    )}
                  >
                    <SportIcon id={sport.id} size={24} className="h-6 w-6" />
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium leading-tight',
                      selected ? 'text-ink' : 'text-muted group-hover:text-ink',
                    )}
                  >
                    {sport.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
