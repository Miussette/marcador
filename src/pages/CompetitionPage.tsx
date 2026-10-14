import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Hash, Layers, MapPin, Pencil, Settings2, Shield, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { CompetitionPropsModal } from '@/features/projects/CompetitionPropsModal'
import { NewProjectModal } from '@/features/projects/NewProjectModal'
import { SportIcon } from '@/features/projects/SportPicker'
import { useMatchesStore } from '@/stores/matchesStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useTeamsStore } from '@/stores/teamsStore'
import type { CompetitionProps, NewProjectInput } from '@/types'
import { WORKING_MODES } from '@/types'
import { formatDate } from '@/utils/time'
import { modalityLabel, sportLabel } from '@/utils/format'

export function CompetitionPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const project = useProjectsStore((state) => state.projects.find((p) => p.id === projectId) ?? null)
  const update = useProjectsStore((state) => state.update)
  const teams = useTeamsStore((state) => state.teams)
  const matches = useMatchesStore((state) => state.matches)
  const [editing, setEditing] = useState(false)
  const [propsOpen, setPropsOpen] = useState(false)

  const initial = useMemo(
    () =>
      project
        ? {
            name: project.name,
            sport: project.sport,
            season: project.season,
            location: project.location,
            date: project.date,
            modality: project.modality,
            compProps: project.compProps,
          }
        : undefined,
    [project],
  )

  if (!project) return <LoadingBlock label="Cargando competencia…" />

  const finished = matches.filter((match) => match.status === 'finished').length
  const live = matches.filter((match) => match.status === 'live').length

  const handleSubmit = async (input: NewProjectInput): Promise<boolean> => {
    const updated = await update(project.id, input)
    return updated !== null
  }

  const handlePropsSubmit = async (input: {
    date?: string
    location?: string
    compProps: CompetitionProps
  }): Promise<boolean> => {
    const updated = await update(project.id, input)
    return updated !== null
  }

  const workingMode = WORKING_MODES.find((m) => m.id === project.compProps?.workingMode)

  return (
    <div>
      <PageHeader
        title="Competencia"
        description="Datos generales y propiedades de competencia que aparecen en partidos y marcador."
        actions={
          <>
            <Button variant="secondary" icon={<Settings2 size={15} />} onClick={() => setPropsOpen(true)}>
              Propiedades de competencia
            </Button>
            <Button variant="primary" icon={<Pencil size={15} />} onClick={() => setEditing(true)}>
              Editar competencia
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <SportIcon id={project.sport} size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">{project.name}</h2>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Badge tone="primary">{sportLabel(project.sport)}</Badge>
                <Badge tone="default">{modalityLabel(project.modality)}</Badge>
                <Badge tone={project.status === 'active' ? 'success' : 'default'}>
                  {project.status === 'active' ? 'Activo' : 'Archivado'}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <CalendarDays size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Fecha</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{formatDate(project.date)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <MapPin size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Ubicación</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{project.location || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <Shield size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Temporada</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{project.season || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <Users size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Participantes</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {teams.length} equipos · {matches.length} partidos
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <Hash size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Código</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{project.compProps?.code || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <Layers size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Sesión</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{project.compProps?.session || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <MapPin size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Cancha</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{project.compProps?.court || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <Settings2 size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Modo de trabajo</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{workingMode?.label ?? 'Standalone'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-app p-4">
              <Layers size={17} className="mt-0.5 text-muted" />
              <div>
                <dt className="label-muted">Servidor</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {project.compProps?.workingMode === 'server' ? project.compProps?.serverUrl || '—' : 'Sin conectar'}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <aside className="card h-fit p-6">
          <p className="label-muted mb-4">Estado del proyecto</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Partidos programados</span>
              <span className="font-bold text-ink tabular-nums">{matches.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">En juego</span>
              <span className="font-bold text-danger tabular-nums">{live}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Finalizados</span>
              <span className="font-bold text-success tabular-nums">{finished}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Equipos inscritos</span>
              <span className="font-bold text-ink tabular-nums">{teams.length}</span>
            </div>
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4">
            <Button variant="secondary" block onClick={() => navigate('matches')}>
              Gestionar partidos
            </Button>
            <Button variant="ghost" block onClick={() => navigate('teams')}>
              Gestionar equipos
            </Button>
          </div>
        </aside>
      </div>

      <NewProjectModal
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleSubmit}
        title="Editar competencia"
        submitLabel="Guardar cambios"
        initial={initial}
      />

      <CompetitionPropsModal
        open={propsOpen}
        onClose={() => setPropsOpen(false)}
        project={project}
        onSubmit={handlePropsSubmit}
      />
    </div>
  )
}
