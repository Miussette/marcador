import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Play, Pencil, Plus, Radio, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { TD, TH, THead, TR, Table } from '@/components/ui/Table'
import { TeamBadge } from '@/components/TeamBadge'
import { MatchFormModal } from '@/features/matches/MatchFormModal'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { useMatchesStore } from '@/stores/matchesStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useTeamsStore } from '@/stores/teamsStore'
import type { Match } from '@/types'
import { STATUS_META } from '@/utils/format'
import { formatDate } from '@/utils/time'
import { cn } from '@/utils/cn'

function formatKickoff(kickoff: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/.exec(kickoff ?? '')
  if (!match) return { date: '—', time: '' }
  return { date: formatDate(match[1]), time: match[2] ?? '' }
}

export function MatchesPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const project = useProjectsStore((state) => state.projects.find((p) => p.id === projectId) ?? null)
  const { matches, loading, loaded, activeMatchId, create, remove, setActive } = useMatchesStore()
  const teams = useTeamsStore((state) => state.teams)
  const loadTeams = useTeamsStore((state) => state.load)
  const adoptMatch = useActiveMatchStore((state) => state.adoptMatch)
  const unloadMatch = useActiveMatchStore((state) => state.unload)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Match | null>(null)
  const [deleting, setDeleting] = useState<Match | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (teams.length === 0) void loadTeams(projectId)
  }, [teams.length, projectId, loadTeams])

  const teamById = useMemo(() => {
    const map = new Map<string, (typeof teams)[number]>()
    for (const team of teams) map.set(team.id, team)
    return map
  }, [teams])

  const activeMatch = matches.find((match) => match.id === activeMatchId) ?? null

  const handleCreate = async (input: Parameters<typeof create>[0]): Promise<Match | null> => {
    const match = await create(input)
    if (match) setCreateOpen(false)
    return match
  }

  const openControl = async (match: Match): Promise<void> => {
    unloadMatch()
    await setActive(match.id)
    adoptMatch(match)
    navigate(`/p/${projectId}/control/${match.id}`)
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const ok = await remove(deleting.id)
      if (ok) setDeleting(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Partidos"
        description="Programa encuentros y abre el panel de control para operarlos en vivo."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nuevo partido
          </Button>
        }
      />

      {activeMatch ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-danger animate-pulse-dot" />
            <div>
              <p className="label-muted text-danger">Partido activo</p>
              <p className="text-sm font-semibold text-ink">
                {teamById.get(activeMatch.homeTeamId)?.name ?? 'Local'} {activeMatch.homeScore} —{' '}
                {activeMatch.awayScore} {teamById.get(activeMatch.awayTeamId)?.name ?? 'Visitante'}
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" icon={<Play size={14} />} onClick={() => void openControl(activeMatch)}>
            Continuar control
          </Button>
        </div>
      ) : null}

      {!loaded && loading ? (
        <LoadingBlock label="Cargando partidos…" />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin partidos programados"
          description="Crea el primer partido del proyecto para empezar a operar el marcador."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nuevo partido
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Fecha</TH>
              <TH>Local</TH>
              <TH className="text-center">Marcador</TH>
              <TH>Visitante</TH>
              <TH>Estado</TH>
              <TH>Detalle</TH>
              <TH className="text-right">Acciones</TH>
            </tr>
          </THead>
          <tbody>
            {matches.map((match) => {
              const kickoff = formatKickoff(match.kickoff)
              const home = teamById.get(match.homeTeamId) ?? null
              const away = teamById.get(match.awayTeamId) ?? null
              const status = STATUS_META[match.status]
              return (
                <TR key={match.id}>
                  <TD className="whitespace-nowrap">
                    <p className="font-semibold text-ink">{kickoff.date}</p>
                    <p className="text-xs text-muted">{kickoff.time || '—'}</p>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <TeamBadge team={home} size="xs" />
                      <span className="font-medium text-ink">{home?.name ?? 'Equipo eliminado'}</span>
                    </div>
                  </TD>
                  <TD className="text-center">
                    <span
                      className={cn(
                        'inline-block rounded-md bg-app px-3 py-1 font-mono text-base font-bold tabular-nums text-ink',
                        match.status === 'live' && 'text-success',
                      )}
                    >
                      {match.homeScore} : {match.awayScore}
                    </span>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <TeamBadge team={away} size="xs" />
                      <span className="font-medium text-ink">{away?.name ?? 'Equipo eliminado'}</span>
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={match.status === 'live' ? 'danger' : match.status === 'finished' ? 'success' : 'default'} dot={match.status === 'live'}>
                      {status.label}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-muted">
                    <p>{match.venue || 'Sin sede'}</p>
                    <p>{match.round || 'Sin jornada'}</p>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Play size={14} />}
                        onClick={() => void openControl(match)}
                      >
                        Control
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => setEditing(match)} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        icon={<Trash2 size={15} />}
                        onClick={() => setDeleting(match)}
                      />
                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <MatchFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        teams={teams}
        defaultCompetition={project?.name ?? ''}
        defaultVenue={project?.location ?? ''}
        onSubmit={handleCreate}
      />
      <MatchFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        projectId={projectId}
        teams={teams}
        defaultCompetition={project?.name ?? ''}
        defaultVenue={project?.location ?? ''}
        match={editing}
        onSubmit={async (input) => {
          if (!editing) return null
          return useMatchesStore.getState().update(editing.id, input)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar partido"
        message={
          deleting
            ? 'Se eliminará el partido y todos sus eventos (goles, tarjetas…). Esta acción no se puede deshacer.'
            : ''
        }
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
