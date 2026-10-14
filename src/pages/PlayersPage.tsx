import { useEffect, useMemo, useState } from 'react'
import { FileDown, FileUp, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock, Spinner } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { TD, TH, THead, TR, Table } from '@/components/ui/Table'
import { PlayerFormModal } from '@/features/players/PlayerFormModal'
import { usePlayersStore } from '@/stores/playersStore'
import { useTeamsStore } from '@/stores/teamsStore'
import { toast } from '@/stores/toastStore'
import { api } from '@/services/api'
import type { Player } from '@/types'
import { PLAYERS_CSV_TEMPLATE } from '@/utils/csv'
import { cn } from '@/utils/cn'

export function PlayersPage() {
  const teams = useTeamsStore((state) => state.teams)
  const teamsLoaded = useTeamsStore((state) => state.loaded)
  const selectedTeamId = usePlayersStore((state) => state.selectedTeamId)
  const playersByTeam = usePlayersStore((state) => state.playersByTeam)
  const loadingTeamId = usePlayersStore((state) => state.loadingTeamId)
  const selectTeam = usePlayersStore((state) => state.select)
  const createPlayer = usePlayersStore((state) => state.create)
  const updatePlayer = usePlayersStore((state) => state.update)
  const removePlayer = usePlayersStore((state) => state.remove)
  const importCsv = usePlayersStore((state) => state.importCsv)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [deleting, setDeleting] = useState<Player | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!teamsLoaded) return
    if (teams.length === 0) {
      if (selectedTeamId) void selectTeam(null)
      return
    }
    const exists = selectedTeamId && teams.some((team) => team.id === selectedTeamId)
    if (!exists) void selectTeam(teams[0].id)
  }, [teamsLoaded, teams, selectedTeamId, selectTeam])

  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId) ?? null, [teams, selectedTeamId])
  const players = selectedTeamId ? (playersByTeam[selectedTeamId] ?? []) : []
  const loading = Boolean(selectedTeamId && loadingTeamId === selectedTeamId && !playersByTeam[selectedTeamId])

  const handleCreate = async (input: Parameters<typeof createPlayer>[0]): Promise<boolean> => {
    const player = await createPlayer(input)
    if (player) {
      setCreateOpen(false)
      return true
    }
    return false
  }

  const handleUpdate = async (input: Parameters<typeof updatePlayer>[1]): Promise<boolean> => {
    if (!editing) return false
    const player = await updatePlayer(editing.id, input)
    if (player) {
      setEditing(null)
      return true
    }
    return false
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const ok = await removePlayer(deleting.id, deleting.teamId)
      if (ok) setDeleting(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleImport = async (): Promise<void> => {
    if (!selectedTeamId) return
    setImporting(true)
    try {
      const text = await api.files.pickTextFile(['csv', 'txt'])
      if (!text) return
      const result = await importCsv(selectedTeamId, text)
      toast.success(`${result.imported} de ${result.total} jugadores importados.`)
    } catch (error) {
      toast.error(error)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = (): void => {
    const blob = new Blob([PLAYERS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'jugadores-plantilla.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Jugadores"
        description="Plantillas por equipo, con número, posición y estado titular/suplente."
        actions={
          selectedTeam ? (
            <>
              <Button variant="outline" icon={<FileDown size={15} />} onClick={downloadTemplate}>
                Plantilla CSV
              </Button>
              <Button
                variant="secondary"
                icon={<FileUp size={15} />}
                onClick={() => void handleImport()}
                loading={importing}
              >
                Importar CSV
              </Button>
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                Nuevo jugador
              </Button>
            </>
          ) : null
        }
      />

      {!teamsLoaded ? (
        <LoadingBlock label="Cargando equipos…" />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Primero crea equipos"
          description="Los jugadores pertenecen a un equipo. Ve a la sección de Equipos y crea al menos uno."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit p-2">
            <p className="label-muted px-3 py-2">Equipos</p>
            <ul className="space-y-1">
              {teams.map((team) => (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => void selectTeam(team.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      selectedTeamId === team.id
                        ? 'bg-primary/15 font-semibold text-blue-300'
                        : 'text-muted hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    <span className="truncate">{team.name}</span>
                    <span className="shrink-0 text-xs text-muted">{playersByTeam[team.id]?.length ?? '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section>
            {!selectedTeam ? (
              <EmptyState icon={Users} title="Selecciona un equipo" description="Elige un equipo para ver su plantilla." />
            ) : loading ? (
              <LoadingBlock label="Cargando plantilla…" />
            ) : players.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title={`Sin jugadores en ${selectedTeam.name}`}
                description="Añade jugadores manualmente o importa un CSV con el formato nombre,apellido,numero,posicion."
                action={
                  <div className="flex gap-2">
                    <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                      Nuevo jugador
                    </Button>
                    <Button variant="outline" icon={<FileUp size={15} />} onClick={() => void handleImport()} loading={importing}>
                      Importar CSV
                    </Button>
                  </div>
                }
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH className="w-16">Nº</TH>
                    <TH>Jugador</TH>
                    <TH>Posición</TH>
                    <TH>Rol</TH>
                    <TH className="text-right">Acciones</TH>
                  </tr>
                </THead>
                <tbody>
                  {players.map((player) => (
                    <TR key={player.id}>
                      <TD className="tabular-nums font-mono text-base font-bold text-ink">
                        {player.number ?? '—'}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt=""
                              className="h-9 w-9 rounded-lg border border-line object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-[11px] font-bold text-muted">
                              {player.firstName.slice(0, 1).toUpperCase()}
                              {player.lastName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-ink">
                              {player.firstName} {player.lastName}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD className="text-muted">{player.position || '—'}</TD>
                      <TD>
                        <Badge tone={player.isStarter ? 'success' : 'warning'}>
                          {player.isStarter ? 'Titular' : 'Suplente'}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" icon={<Pencil size={15} />} onClick={() => setEditing(player)} />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10 hover:text-danger"
                            icon={<Trash2 size={15} />}
                            onClick={() => setDeleting(player)}
                          />
                        </div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            {loading ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <Spinner size={14} /> Actualizando…
              </div>
            ) : null}
          </section>
        </div>
      )}

      {selectedTeamId ? (
        <PlayerFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          teamId={selectedTeamId}
          onSubmit={handleCreate}
        />
      ) : null}
      <PlayerFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        teamId={editing?.teamId ?? ''}
        player={editing}
        onSubmit={handleUpdate}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar jugador"
        message={
          deleting ? `Se eliminará ${deleting.firstName} ${deleting.lastName} de la plantilla.` : ''
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
