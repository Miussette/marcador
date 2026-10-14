import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, FolderOpen, Import, Plus, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { TD, TH, THead, TR, Table } from '@/components/ui/Table'
import { NewProjectModal } from '@/features/projects/NewProjectModal'
import { SportIcon } from '@/features/projects/SportPicker'
import { useProjectsStore } from '@/stores/projectsStore'
import type { NewProjectInput, Project } from '@/types'
import { formatDate } from '@/utils/time'
import { modalityLabel, sportLabel } from '@/utils/format'
import { cn } from '@/utils/cn'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, loading, loaded, error, busyId, load, create, remove, duplicate, exportProject, importProject } =
    useProjectsStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!loaded && !loading) void load()
  }, [loaded, loading, load])

  const handleCreate = async (input: NewProjectInput): Promise<boolean> => {
    const project = await create(input)
    if (project) {
      setCreateOpen(false)
      navigate(`/p/${project.id}`)
      return true
    }
    return false
  }

  const handleImport = async (): Promise<void> => {
    setImporting(true)
    try {
      const project = await importProject()
      if (project) navigate(`/p/${project.id}`)
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const ok = await remove(confirmDelete.id)
      if (ok) setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <PageHeader
        title="Proyectos"
        description="Administra tus competencias: equipos, partidos y pantallas de marcador."
        actions={
          <>
            <Button variant="outline" icon={<Import size={16} />} onClick={() => void handleImport()} loading={importing}>
              Importar
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nuevo proyecto
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {!loaded && loading ? (
        <LoadingBlock label="Cargando proyectos…" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aún no hay proyectos"
          description="Crea tu primera competencia para empezar a registrar equipos, partidos y marcadores."
          action={
            <div className="flex gap-2">
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                Nuevo proyecto
              </Button>
              <Button variant="outline" icon={<Import size={16} />} onClick={() => void handleImport()} loading={importing}>
                Importar
              </Button>
            </div>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Nombre</TH>
              <TH>Deporte</TH>
              <TH>Modalidad</TH>
              <TH>Fecha</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acciones</TH>
            </tr>
          </THead>
          <tbody>
            {projects.map((project) => (
              <TR key={project.id} onClick={() => navigate(`/p/${project.id}`)}>
                <TD>
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink">{project.name}</span>
                    <span className="text-xs text-muted">
                      {project.season || '—'} · {project.location || 'Sin ubicación'}
                    </span>
                  </div>
                </TD>
                <TD className="text-muted">
                  <span className="flex items-center gap-2">
                    <SportIcon id={project.sport} />
                    {sportLabel(project.sport)}
                  </span>
                </TD>
                <TD className="text-muted">{modalityLabel(project.modality)}</TD>
                <TD className="tabular-nums text-muted">{formatDate(project.date)}</TD>
                <TD>
                  <Badge tone={project.status === 'active' ? 'success' : 'default'}>
                    {project.status === 'active' ? 'Activo' : 'Archivado'}
                  </Badge>
                </TD>
                <TD onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<FolderOpen size={14} />}
                      onClick={() => navigate(`/p/${project.id}`)}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Duplicar proyecto"
                      icon={<Copy size={15} />}
                      loading={busyId === project.id}
                      onClick={() => void duplicate(project.id)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Exportar proyecto"
                      icon={<Upload size={15} />}
                      loading={busyId === project.id}
                      onClick={() => void exportProject(project.id)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Eliminar proyecto"
                      className={cn('text-danger hover:bg-danger/10 hover:text-danger')}
                      icon={<Trash2 size={15} />}
                      onClick={() => setConfirmDelete(project)}
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <NewProjectModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Eliminar proyecto"
        message={
          confirmDelete
            ? `Se eliminará "${confirmDelete.name}" junto con sus equipos, jugadores, partidos y eventos. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
