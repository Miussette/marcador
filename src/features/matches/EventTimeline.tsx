import { useMemo, useState } from 'react'
import { ArrowLeftRight, Clock, Goal, Pencil, Search, Square, Target, Trash2, Trophy, Video, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Input, Select } from '@/components/ui/Form'
import type { MatchEvent, MatchEventType, Player, Team } from '@/types'
import { cn } from '@/utils/cn'

const ICONS: Record<MatchEventType, { icon: LucideIcon; label: string; className: string }> = {
  goal: { icon: Goal, label: 'Gol', className: 'text-success' },
  own_goal: { icon: Goal, label: 'Autogol', className: 'text-warning' },
  yellow: { icon: Square, label: 'Amarilla', className: 'text-warning fill-warning' },
  red: { icon: Square, label: 'Roja', className: 'text-danger fill-danger' },
  substitution: { icon: ArrowLeftRight, label: 'Sustitución', className: 'text-blue-300' },
  penalty: { icon: Target, label: 'Penal', className: 'text-ink' },
  var: { icon: Video, label: 'VAR', className: 'text-muted' },
  added_time: { icon: Clock, label: 'Tiempo añadido', className: 'text-warning' },
  assist: { icon: Goal, label: 'Asistencia', className: 'text-blue-300' },
  save: { icon: Target, label: 'Atajada', className: 'text-success' },
  foul: { icon: Square, label: 'Falta', className: 'text-warning' },
  offside: { icon: ArrowLeftRight, label: 'Fuera de juego', className: 'text-muted' },
  corner: { icon: Target, label: 'Córner', className: 'text-blue-300' },
  free_kick: { icon: Target, label: 'Tiro libre', className: 'text-ink' },
  set: { icon: Trophy, label: 'Set', className: 'text-amber-400' },
}

interface EventTimelineProps {
  events: MatchEvent[]
  home: Team | null
  away: Team | null
  players: Player[]
  onRemove: (eventId: string) => void
  onEdit: (event: MatchEvent) => void
}

/**
 * Registro de eventos del partido: lista completa con buscador de texto
 * (minuto, equipo, descripción…) y filtro por tipo de evento.
 */
export function EventTimeline({ events, home, away, players, onRemove, onEdit }: EventTimelineProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MatchEventType | 'all'>('all')

  const teamOf = (event: MatchEvent): Team | null =>
    event.teamId === home?.id ? home : event.teamId === away?.id ? away : null

  const playerOf = (playerId: string | null): Player | null => {
    if (!playerId) return null
    return players.find((p) => p.id === playerId) ?? null
  }

  const typesPresent = useMemo(() => {
    const seen = new Set<MatchEventType>()
    for (const event of events) seen.add(event.type)
    return [...seen]
  }, [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((event) => {
      if (typeFilter !== 'all' && event.type !== typeFilter) return false
      if (!q) return true
      const meta = ICONS[event.type] ?? ICONS.goal
      const team = teamOf(event)
      const player = playerOf(event.playerId)
      const secondary = playerOf(event.secondaryPlayerId)
      const haystack = [
        `${event.minute}'`,
        String(event.minute),
        meta.label,
        event.description,
        team?.name ?? '',
        team?.shortName ?? '',
        team?.code ?? '',
        player ? `${player.firstName} ${player.lastName}` : '',
        secondary ? `${secondary.firstName} ${secondary.lastName}` : '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [events, query, typeFilter, home, away, players])

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="label-muted">Registro de eventos</p>
        {events.length > 0 ? (
          <span className="text-xs tabular-nums text-muted">
            {filtered.length} de {events.length}
          </span>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs leading-relaxed text-muted">
          Sin eventos todavía.
          <br />
          Al marcar un gol se registrará automáticamente con su minuto.
        </p>
      ) : (
        <>
          {/* Buscador + filtro por tipo */}
          <div className="mb-3 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar minuto, equipo, detalle…"
                className="pl-9 pr-8"
                aria-label="Buscar eventos"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:text-ink"
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {/* `cn` no hace merge de Tailwind: el ancho va en un envoltorio
                para que `w-full` del Select no lo desborde. */}
            <div className="w-44 shrink-0">
              <Select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as MatchEventType | 'all')}
                aria-label="Filtrar por tipo de evento"
              >
                <option value="all">Todos los eventos</option>
                {typesPresent.map((type) => (
                  <option key={type} value={type}>
                    {ICONS[type]?.label ?? type}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs leading-relaxed text-muted">
              Ningún evento coincide con
              {query.trim() ? ` «${query.trim()}»` : ' el filtro actual'}.
            </p>
          ) : (
            <ul className="space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((event) => {
                const meta = ICONS[event.type] ?? ICONS.goal
                const Icon = meta.icon
                const team = teamOf(event)
                const player = playerOf(event.playerId)
                const secondary = playerOf(event.secondaryPlayerId)
                return (
                  <li
                    key={event.id}
                    className="group flex items-center gap-3 rounded-lg border border-line bg-app px-3 py-2"
                  >
                    <span className="w-10 shrink-0 font-mono text-sm font-bold tabular-nums text-ink">
                      {event.minute}'
                    </span>
                    <Icon size={16} className={cn('shrink-0', meta.className)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {meta.label}
                      {player ? ` — ${player.firstName} ${player.lastName}` : ''}
                      {secondary ? ` (${secondary.firstName} ${secondary.lastName})` : ''}
                      {event.description && event.description !== meta.label ? ` — ${event.description}` : ''}
                    </span>
                    {team ? (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black"
                        style={{ backgroundColor: team.primaryColor, color: '#fff' }}
                      >
                        {team.shortName || team.code || team.name.slice(0, 3).toUpperCase()}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEdit(event)}
                      title="Editar evento"
                      className="shrink-0 rounded p-1 text-muted opacity-0 transition-all hover:bg-primary/15 hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(event.id)}
                      title="Eliminar evento"
                      className="shrink-0 rounded p-1 text-muted opacity-0 transition-all hover:bg-danger/15 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
