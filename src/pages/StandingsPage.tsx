import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Form'
import { TD, TH, THead, TR, Table } from '@/components/ui/Table'
import { TeamBadge } from '@/components/TeamBadge'
import { useStandingsStore } from '@/stores/standingsStore'
import { useTeamsStore } from '@/stores/teamsStore'
import { toast } from '@/stores/toastStore'
import type { StandingEntry } from '@/types'

export function StandingsPage() {
  const { projectId = '' } = useParams()
  const { entries, loading, loaded, create, remove } = useStandingsStore()
  const teams = useTeamsStore((state) => state.teams)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<StandingEntry | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    teamId: '',
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  })

  useEffect(() => {
    void useStandingsStore.getState().load(projectId)
  }, [projectId])

  const teamById = new Map(teams.map((t) => [t.id, t]))

  const saveEntry = async (): Promise<void> => {
    if (!form.teamId) {
      toast.error('Selecciona un equipo.')
      return
    }
    setSaving(true)
    try {
      const goalDifference = form.goalsFor - form.goalsAgainst
      const points = form.won * 3 + form.drawn
      const entry = await create({
        teamId: form.teamId,
        played: form.played,
        won: form.won,
        drawn: form.drawn,
        lost: form.lost,
        goalsFor: form.goalsFor,
        goalsAgainst: form.goalsAgainst,
        goalDifference,
        points,
      })
      if (entry) {
        setCreateOpen(false)
        setForm({ teamId: '', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 })
      }
    } finally {
      setSaving(false)
    }
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
        title="Tabla de posiciones"
        description="Clasificación de la competencia por puntos y diferencia de goles."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Añadir equipo
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando tabla…" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin datos"
          description="Añade equipos a la tabla de posiciones para seguir la clasificación."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Añadir equipo
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-12">#</TH>
              <TH>Equipo</TH>
              <TH className="text-center">PJ</TH>
              <TH className="text-center">G</TH>
              <TH className="text-center">E</TH>
              <TH className="text-center">P</TH>
              <TH className="text-center">GF</TH>
              <TH className="text-center">GC</TH>
              <TH className="text-center">DG</TH>
              <TH className="text-center">Pts</TH>
              <TH className="text-right">Acciones</TH>
            </tr>
          </THead>
          <tbody>
            {entries.map((entry, index) => {
              const team = teamById.get(entry.teamId)
              return (
                <TR key={entry.id}>
                  <TD className="text-center font-bold text-muted">{index + 1}</TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <TeamBadge team={team ?? null} size="xs" />
                      <span className="font-medium text-ink">{team?.name ?? 'Equipo eliminado'}</span>
                    </div>
                  </TD>
                  <TD className="text-center tabular-nums text-muted">{entry.played}</TD>
                  <TD className="text-center tabular-nums text-muted">{entry.won}</TD>
                  <TD className="text-center tabular-nums text-muted">{entry.drawn}</TD>
                  <TD className="text-center tabular-nums text-muted">{entry.lost}</TD>
                  <TD className="text-center tabular-nums text-muted">{entry.goalsFor}</TD>
                  <TD className="text-center tabular-nums text-muted">{entry.goalsAgainst}</TD>
                  <TD className="text-center tabular-nums text-muted">
                    {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                  </TD>
                  <TD className="text-center">
                    <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 font-mono text-sm font-bold text-blue-300">
                      {entry.points}
                    </span>
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10 hover:text-danger"
                        icon={<Trash2 size={14} />}
                        onClick={() => setDeleting(entry)}
                      />
                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Añadir equipo"
        description="Registra los datos del equipo en la tabla de posiciones."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveEntry()} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Equipo" required className="sm:col-span-2">
            <Select value={form.teamId} onChange={(e) => setForm((state) => ({ ...state, teamId: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Partidos jugados">
            <Input
              type="number"
              min={0}
              value={form.played}
              onChange={(e) => setForm((state) => ({ ...state, played: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Ganados">
            <Input
              type="number"
              min={0}
              value={form.won}
              onChange={(e) => setForm((state) => ({ ...state, won: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Empatados">
            <Input
              type="number"
              min={0}
              value={form.drawn}
              onChange={(e) => setForm((state) => ({ ...state, drawn: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Perdidos">
            <Input
              type="number"
              min={0}
              value={form.lost}
              onChange={(e) => setForm((state) => ({ ...state, lost: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Goles a favor">
            <Input
              type="number"
              min={0}
              value={form.goalsFor}
              onChange={(e) => setForm((state) => ({ ...state, goalsFor: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Goles en contra">
            <Input
              type="number"
              min={0}
              value={form.goalsAgainst}
              onChange={(e) => setForm((state) => ({ ...state, goalsAgainst: Number(e.target.value) }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar equipo"
        message="Se eliminará el equipo de la tabla de posiciones."
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
