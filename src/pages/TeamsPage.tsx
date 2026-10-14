import { useEffect, useState } from 'react'
import { Pencil, Plus, Shield, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { TeamBadge } from '@/components/TeamBadge'
import { TeamFormModal } from '@/features/teams/TeamFormModal'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { usePlayersStore } from '@/stores/playersStore'
import { useTeamsStore } from '@/stores/teamsStore'
import type { Team } from '@/types'

export function TeamsPage() {
  const { teams, loading, loaded, create, update, remove } = useTeamsStore()
  const playersByTeam = usePlayersStore((state) => state.playersByTeam)
  const reloadTeam = usePlayersStore((state) => state.reloadTeam)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState<Team | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    for (const team of teams) {
      if (!playersByTeam[team.id]) void reloadTeam(team.id)
    }
  }, [teams, playersByTeam, reloadTeam])

  const handleCreate = async (input: Parameters<typeof create>[0]): Promise<boolean> => {
    const team = await create(input)
    if (team) {
      setModalOpen(false)
      useActiveMatchStore.getState().syncNow()
      return true
    }
    return false
  }

  const handleUpdate = async (input: Parameters<typeof update>[1]): Promise<boolean> => {
    if (!editing) return false
    const team = await update(editing.id, input)
    if (team) {
      setEditing(null)
      useActiveMatchStore.getState().syncNow()
      return true
    }
    return false
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

  const deletingPlayers = deleting ? (playersByTeam[deleting.id]?.length ?? 0) : 0

  return (
    <div>
      <PageHeader
        title="Equipos"
        description="Identidad de cada equipo: logo, colores y datos para el marcador."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Nuevo equipo
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando equipos…" />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Este proyecto no tiene equipos"
          description="Crea al menos dos equipos para poder programar partidos."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Nuevo equipo
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <article key={team.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-start gap-4">
                <TeamBadge team={team} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-ink" title={team.name}>
                    {team.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {[team.shortName, team.code].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {[team.city, team.country].filter(Boolean).join(', ') || 'Sin ubicación'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded border border-line"
                  style={{ backgroundColor: team.primaryColor }}
                  title="Color principal"
                />
                <span
                  className="h-5 w-5 rounded border border-line"
                  style={{ backgroundColor: team.secondaryColor }}
                  title="Color secundario"
                />
                <Badge tone="primary">
                  <Users size={11} /> {playersByTeam[team.id]?.length ?? '—'} jugadores
                </Badge>
              </div>

              <div className="mt-auto flex gap-2">
                <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => setEditing(team)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleting(team)}
                >
                  Eliminar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <TeamFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
      <TeamFormModal open={editing !== null} team={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar equipo"
        message={
          deleting
            ? `Se eliminará "${deleting.name}" y sus ${deletingPlayers} jugador(es). No puede eliminarse si participa en partidos.`
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
