import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarRange, Play, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { MatchCalendar } from '@/components/MatchCalendar'
import { calendarDayKey } from '@/utils/calendar'
import { TeamBadge } from '@/components/TeamBadge'
import { useMatchesStore } from '@/stores/matchesStore'
import { useTeamsStore } from '@/stores/teamsStore'
import type { Match } from '@/types'
import { STATUS_META } from '@/utils/format'
import { cn } from '@/utils/cn'

type Tab = 'calendar' | 'results'

/** Clave de agrupación "YYYY-MM-DD" a partir del kickoff del partido. */
function dayKey(match: Match): string {
  return calendarDayKey(match.kickoff)
}

/** Fecha legible en español para una clave de día. */
function formatDay(key: string): string {
  if (key === 'sin-fecha') return 'Sin fecha'
  const date = new Date(`${key}T12:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(match: Match): string {
  const date = new Date(match.kickoff)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Calendario y resultados de la competencia:
 *  - "Calendario": próximos partidos (programados/en juego) agrupados por fecha.
 *  - "Resultados": partidos finalizados, del más reciente al más antiguo.
 */
export function CalendarPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { matches, loading, loaded } = useMatchesStore()
  const teams = useTeamsStore((state) => state.teams)

  const [tab, setTab] = useState<Tab>('calendar')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    void useMatchesStore.getState().load(projectId)
  }, [projectId])

  useEffect(() => {
    void useTeamsStore.getState().load(projectId)
  }, [projectId])

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  /** Próximos: programados y en juego, del más próximo al más lejano. */
  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status !== 'finished')
        .sort((a, b) => (a.kickoff || '').localeCompare(b.kickoff || '')),
    [matches],
  )

  /** Resultados: finalizados, del más reciente al más antiguo. */
  const results = useMemo(
    () => matches.filter((m) => m.status === 'finished').sort((a, b) => (b.kickoff || '').localeCompare(a.kickoff || '')),
    [matches],
  )

  /** Agrupa una lista de partidos por día (clave YYYY-MM-DD). */
  const groupByDay = (list: Match[]): [string, Match[]][] => {
    const groups = new Map<string, Match[]>()
    for (const match of list) {
      const key = dayKey(match)
      const bucket = groups.get(key)
      if (bucket) bucket.push(match)
      else groups.set(key, [match])
    }
    return [...groups.entries()]
  }

  const visibleUpcoming = selectedDay ? upcoming.filter(match => dayKey(match) === selectedDay) : upcoming
  const calendarGroups = useMemo(() => groupByDay(visibleUpcoming), [upcoming, selectedDay])
  const resultGroups = useMemo(() => groupByDay(results), [results])

  if (!loaded && loading) {
    return <LoadingBlock label="Cargando calendario…" />
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calendar', label: 'Calendario' },
    { id: 'results', label: 'Resultados' },
  ]

  return (
    <div>
      <PageHeader
        title="Calendario y resultados"
        description="Consulta los próximos partidos y los resultados de la competencia."
      />

      {/* Pestañas */}
      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors',
              tab === t.id ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-70">
              {t.id === 'calendar' ? upcoming.length : results.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'calendar' && <MatchCalendar matches={matches} teamById={teamById} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpenMatch={match => navigate(`/p/${projectId}/control/${match.id}`)} />}

      {tab === 'calendar' ? (
        visibleUpcoming.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Sin partidos próximos"
            description="Programa partidos en la sección Partidos para verlos aquí."
            action={
              <Button variant="primary" icon={<Play size={16} />} onClick={() => navigate(`/p/${projectId}/matches`)}>
                Ir a partidos
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {calendarGroups.map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                  <CalendarRange size={15} />
                  {formatDay(day)}
                </h2>
                <div className="space-y-2">
                  {list.map((match) => {
                    const home = teamById.get(match.homeTeamId)
                    const away = teamById.get(match.awayTeamId)
                    const status = STATUS_META[match.status]
                    return (
                      <article
                        key={match.id}
                        className="card flex flex-wrap items-center justify-between gap-4 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="w-14 shrink-0 text-center">
                            <p className="font-mono text-lg font-black tabular-nums text-ink">{formatTime(match)}</p>
                          </div>
                          <div className="flex min-w-0 items-center gap-3">
                            <TeamBadge team={home ?? null} size="sm" />
                            <span className="text-sm font-bold text-ink">{home?.name ?? 'Local'}</span>
                            <span className="text-xs font-black text-muted">VS</span>
                            <span className="text-sm font-bold text-ink">{away?.name ?? 'Visitante'}</span>
                            <TeamBadge team={away ?? null} size="sm" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {[match.round, match.venue].filter(Boolean).map((txt) => (
                            <span key={txt} className="hidden text-xs text-muted sm:inline">
                              {txt}
                            </span>
                          ))}
                          <Badge tone={match.status === 'live' ? 'danger' : 'default'} dot={match.status === 'live'}>
                            {status.label}
                          </Badge>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate(`/p/${projectId}/control/${match.id}`)}
                          >
                            Controlar
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )
      ) : results.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin resultados"
          description="Los partidos finalizados aparecerán aquí con su marcador."
        />
      ) : (
        <div className="space-y-6">
          {resultGroups.map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <Trophy size={15} />
                {formatDay(day)}
              </h2>
              <div className="space-y-2">
                {list.map((match) => {
                  const home = teamById.get(match.homeTeamId)
                  const away = teamById.get(match.awayTeamId)
                  const homeWin = match.homeScore > match.awayScore
                  const draw = match.homeScore === match.awayScore
                  return (
                    <article key={match.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                          <span
                            className={cn(
                              'truncate text-sm',
                              homeWin || draw ? 'font-black text-ink' : 'font-medium text-muted',
                            )}
                          >
                            {home?.name ?? 'Local'}
                          </span>
                          <TeamBadge team={home ?? null} size="sm" />
                        </div>
                        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface-2 px-4 py-2">
                          <span
                            className={cn(
                              'font-mono text-xl font-black tabular-nums',
                              homeWin ? 'text-ink' : 'text-muted',
                            )}
                          >
                            {match.homeScore}
                          </span>
                          <span className="text-muted">–</span>
                          <span
                            className={cn(
                              'font-mono text-xl font-black tabular-nums',
                              !homeWin && !draw ? 'text-ink' : 'text-muted',
                            )}
                          >
                            {match.awayScore}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <TeamBadge team={away ?? null} size="sm" />
                          <span
                            className={cn(
                              'truncate text-sm',
                              !homeWin && !draw ? 'font-black text-ink' : 'font-medium text-muted',
                            )}
                          >
                            {away?.name ?? 'Visitante'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {[match.round, match.venue].filter(Boolean).map((txt) => (
                          <span key={txt} className="hidden text-xs text-muted sm:inline">
                            {txt}
                          </span>
                        ))}
                        <Badge tone="success">Final</Badge>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
