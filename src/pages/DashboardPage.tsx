import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Play, Plus, Radio, Shield, Trophy, User, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { TeamBadge } from '@/components/TeamBadge'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { useMatchesStore } from '@/stores/matchesStore'
import { usePlayersStore } from '@/stores/playersStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useTeamsStore } from '@/stores/teamsStore'
import type { Match, Team } from '@/types'
import { STATUS_META, modalityLabel, sportLabel } from '@/utils/format'
import { formatDate } from '@/utils/time'
import { cn } from '@/utils/cn'

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Shield
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent ?? '#2563EB'}22`, color: accent ?? '#60A5FA' }}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl leading-none font-black text-ink tabular-nums">{value}</p>
        <p className="label-muted mt-1.5">{label}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const project = useProjectsStore((state) => state.projects.find((p) => p.id === projectId) ?? null)
  const teams = useTeamsStore((state) => state.teams)
  const teamsLoaded = useTeamsStore((state) => state.loaded)
  const { matches, loaded: matchesLoaded, activeMatchId } = useMatchesStore()
  const playersByTeam = usePlayersStore((state) => state.playersByTeam)
  const reloadTeam = usePlayersStore((state) => state.reloadTeam)
  const unloadMatch = useActiveMatchStore((state) => state.unload)
  const adoptMatch = useActiveMatchStore((state) => state.adoptMatch)
  const setActive = useMatchesStore((state) => state.setActive)

  useEffect(() => {
    for (const team of teams) {
      if (!playersByTeam[team.id]) void reloadTeam(team.id)
    }
  }, [teams, playersByTeam, reloadTeam])

  const teamById = useMemo(() => {
    const map = new Map<string, Team>()
    for (const team of teams) map.set(team.id, team)
    return map
  }, [teams])

  const totalPlayers = teams.reduce((total, team) => total + (playersByTeam[team.id]?.length ?? 0), 0)
  const liveCount = matches.filter((match) => match.status === 'live').length
  const finishedCount = matches.filter((match) => match.status === 'finished').length
  const activeMatch = matches.find((match) => match.id === activeMatchId) ?? null
  const recent = matches.slice(0, 5)

  const openControl = async (match: Match): Promise<void> => {
    unloadMatch()
    await setActive(match.id)
    adoptMatch(match)
    navigate(`/p/${projectId}/control/${match.id}`)
  }

  return (
    <div>
      <PageHeader
        title={project ? project.name : 'Dashboard'}
        description={
          project
            ? `${sportLabel(project.sport)} · ${modalityLabel(project.modality)} · ${project.season || 'Sin temporada'}`
            : 'Resumen del proyecto'
        }
        actions={
          <>
            <Button variant="outline" icon={<Shield size={15} />} onClick={() => navigate('teams')}>
              Nuevo equipo
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('matches')}>
              Nuevo partido
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={Shield} label="Equipos" value={teamsLoaded ? teams.length : '—'} accent="#2563EB" />
        <StatCard icon={Users} label="Jugadores" value={totalPlayers} accent="#22C55E" />
        <StatCard icon={CalendarDays} label="Partidos" value={matchesLoaded ? matches.length : '—'} accent="#F59E0B" />
        <StatCard icon={Radio} label="En juego" value={liveCount} accent="#EF4444" />
      </div>

      {activeMatch ? (
        <div className="card mt-5 flex flex-wrap items-center justify-between gap-4 border-danger/40 p-5">
          <div className="flex items-center gap-4">
            <TeamBadge team={teamById.get(activeMatch.homeTeamId) ?? null} size="md" />
            <div className="text-center">
              <p className="label-muted text-danger">En vivo</p>
              <p className="mt-1 font-mono text-3xl leading-none font-black tabular-nums text-ink">
                {activeMatch.homeScore} — {activeMatch.awayScore}
              </p>
            </div>
            <TeamBadge team={teamById.get(activeMatch.awayTeamId) ?? null} size="md" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-ink">
                {teamById.get(activeMatch.homeTeamId)?.name ?? 'Local'} vs{' '}
                {teamById.get(activeMatch.awayTeamId)?.name ?? 'Visitante'}
              </p>
              <p className="text-xs text-muted">{activeMatch.venue || activeMatch.round || 'Partido activo'}</p>
            </div>
          </div>
          <Button variant="danger" icon={<Play size={16} />} onClick={() => void openControl(activeMatch)}>
            Continuar control
          </Button>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Últimos partidos</p>
            <Button size="sm" variant="ghost" onClick={() => navigate('matches')}>
              Ver todos
            </Button>
          </div>

          {!matchesLoaded && matches.length === 0 ? (
            <p className="text-xs text-muted">Cargando partidos…</p>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin partidos"
              description="Programa tu primer encuentro para comenzar a operar el marcador."
              action={
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('matches')}>
                  Nuevo partido
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {recent.map((match) => {
                const home = teamById.get(match.homeTeamId) ?? null
                const away = teamById.get(match.awayTeamId) ?? null
                const status = STATUS_META[match.status]
                return (
                  <li
                    key={match.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-line bg-app px-3 py-2.5 transition-colors',
                      match.status === 'live' && 'border-danger/50',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamBadge team={home} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-right text-xs font-semibold text-ink">
                        {home?.name ?? '—'}
                      </span>
                      <span className="font-mono text-sm font-black tabular-nums text-ink">
                        {match.homeScore} : {match.awayScore}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                        {away?.name ?? '—'}
                      </span>
                      <TeamBadge team={away} size="xs" />
                    </div>
                    <Badge
                      tone={match.status === 'live' ? 'danger' : match.status === 'finished' ? 'success' : 'default'}
                      dot={match.status === 'live'}
                    >
                      {status.label}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Abrir control"
                      icon={<Play size={14} />}
                      onClick={() => void openControl(match)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <p className="label-muted mb-4">Resumen de la competencia</p>
          {project ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label-muted">Deporte</dt>
                <dd className="mt-1 font-semibold text-ink">{sportLabel(project.sport)}</dd>
              </div>
              <div>
                <dt className="label-muted">Modalidad</dt>
                <dd className="mt-1 font-semibold text-ink">{modalityLabel(project.modality)}</dd>
              </div>
              <div>
                <dt className="label-muted">Temporada</dt>
                <dd className="mt-1 font-semibold text-ink">{project.season || '—'}</dd>
              </div>
              <div>
                <dt className="label-muted">Fecha</dt>
                <dd className="mt-1 font-semibold text-ink">{formatDate(project.date)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="label-muted">Ubicación</dt>
                <dd className="mt-1 font-semibold text-ink">{project.location || '—'}</dd>
              </div>
              <div>
                <dt className="label-muted">Finalizados</dt>
                <dd className="mt-1 font-semibold text-ink tabular-nums">{finishedCount}</dd>
              </div>
              <div>
                <dt className="label-muted">Entrenadores / cuerpos técnicos</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-semibold text-ink">
                  <User size={13} className="text-muted" /> {teams.length} equipos
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted">Cargando…</p>
          )}
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" size="sm" icon={<Trophy size={14} />} onClick={() => navigate('competition')}>
              Ver competencia
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('settings')}>
              Configuración
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
