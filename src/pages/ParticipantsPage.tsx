import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Dices,
  FileUp,
  ImagePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Form'
import { TD, TH, THead, TR, Table } from '@/components/ui/Table'
import { MatchFormModal } from '@/features/matches/MatchFormModal'
import { PlayerFormModal } from '@/features/players/PlayerFormModal'
import { useMatchesStore } from '@/stores/matchesStore'
import { usePlayersStore } from '@/stores/playersStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useTeamsStore } from '@/stores/teamsStore'
import { toast } from '@/stores/toastStore'
import { api } from '@/services/api'
import type { Match, Player, Team } from '@/types'
import { cn } from '@/utils/cn'

type TabId = 'participants' | 'contests'

export function ParticipantsPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()

  const project = useProjectsStore((state) => state.projects.find((p) => p.id === projectId) ?? null)
  const teams = useTeamsStore((state) => state.teams)
  const teamsLoaded = useTeamsStore((state) => state.loaded)
  const loadTeams = useTeamsStore((state) => state.load)
  const updateTeam = useTeamsStore((state) => state.update)
  const createTeam = useTeamsStore((state) => state.create)

  const { matches, load: loadMatches } = useMatchesStore()
  const playersByTeam = usePlayersStore((state) => state.playersByTeam)
  const reloadTeam = usePlayersStore((state) => state.reloadTeam)
  const createPlayer = usePlayersStore((state) => state.create)
  const updatePlayer = usePlayersStore((state) => state.update)

  const [tab, setTab] = useState<TabId>('participants')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [pickLogo, setPickLogo] = useState(false)
  const [pickPhoto, setPickPhoto] = useState(false)

  // Eventos (partidos) del proyecto
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Nuevo atleta rápido desde esta pantalla
  const [newAthleteOpen, setNewAthleteOpen] = useState(false)

  useEffect(() => {
    if (!teamsLoaded || teams.length === 0) void loadTeams(projectId)
    if (matches.length === 0) void loadMatches(projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, teamsLoaded])

  useEffect(() => {
    for (const team of teams) {
      if (!playersByTeam[team.id]) void reloadTeam(team.id)
    }
  }, [teams, playersByTeam, reloadTeam])

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].id)
    if (teams.length === 0 && selectedTeamId) setSelectedTeamId(null)
  }, [teams, selectedTeamId])

  useEffect(() => {
    setSelectedPlayerId(null)
  }, [selectedTeamId])

  const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId) ?? null, [teams, selectedTeamId])
  const athletes = selectedTeamId ? (playersByTeam[selectedTeamId] ?? []) : []
  const selectedPlayer = useMemo(
    () => athletes.find((p) => p.id === selectedPlayerId) ?? null,
    [athletes, selectedPlayerId],
  )

  /* ------------------------------ Equipos ---------------------------- */

  const patchTeam = async (patch: Partial<Team>): Promise<void> => {
    if (!selectedTeam) return
    const updated = await updateTeam(selectedTeam.id, patch)
    if (updated) void reloadTeam(updated.id)
  }

  const handleNewTeam = async (): Promise<void> => {
    const team = await createTeam({
      name: 'Nuevo equipo',
      shortName: 'Nuevo',
      code: '',
      logo: null,
      primaryColor: '#2563EB',
      secondaryColor: '#FFFFFF',
      city: '',
      country: '',
      countryCode: '',
      lot: String(teams.length + 1),
    })
    if (team) {
      setSelectedTeamId(team.id)
    }
  }

  const pickTeamLogo = async (): Promise<void> => {
    setPickLogo(true)
    try {
      const dataUrl = await api.files.pickImage()
      if (dataUrl) await patchTeam({ logo: dataUrl })
    } catch (error) {
      toast.error(error)
    } finally {
      setPickLogo(false)
    }
  }

  /* ----------------------------- Atletas ----------------------------- */

  const patchPlayer = async (patch: Partial<Player>): Promise<void> => {
    if (!selectedPlayer) return
    await updatePlayer(selectedPlayer.id, patch)
  }

  const pickPlayerPhoto = async (): Promise<void> => {
    setPickPhoto(true)
    try {
      const dataUrl = await api.files.pickImage()
      if (dataUrl) await patchPlayer({ photo: dataUrl })
    } catch (error) {
      toast.error(error)
    } finally {
      setPickPhoto(false)
    }
  }

  /* ------------------------------ Acciones --------------------------- */

  const handleImport = async (): Promise<void> => {
    if (!selectedTeamId) return
    setImporting(true)
    try {
      const text = await api.files.pickTextFile(['csv', 'txt'])
      if (!text) return
      const { imported, total } = await usePlayersStore.getState().importCsv(selectedTeamId, text)
      toast.success(`${imported} de ${total} atletas importados.`)
    } catch (error) {
      toast.error(error)
    } finally {
      setImporting(false)
    }
  }

  /** Sorteo: reparte números de sorteo (lot) aleatorios entre los equipos. */
  const handleDraw = async (): Promise<void> => {
    if (teams.length === 0) {
      toast.info('No hay equipos para sortear.')
      return
    }
    const lots = teams.map((_, index) => String(index + 1))
    for (let i = lots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[lots[i], lots[j]] = [lots[j], lots[i]]
    }
    for (let i = 0; i < teams.length; i++) {
      await updateTeam(teams[i].id, { lot: lots[i] })
    }
    toast.success('Sorteo realizado: números de lotes asignados.')
  }

  /** Genera un partido (evento) con el equipo seleccionado vs. el siguiente. */
  const handleGenerateMatch = (): void => {
    if (teams.length < 2) {
      toast.info('Necesitas al menos 2 equipos para generar un partido.')
      return
    }
    setEditingMatch(null)
    setEventModalOpen(true)
  }

  const handleDeleteMatch = async (): Promise<void> => {
    if (!deletingMatch) return
    setDeleteLoading(true)
    try {
      await useMatchesStore.getState().remove(deletingMatch.id)
      setDeletingMatch(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!teamsLoaded) return <LoadingBlock label="Cargando participantes…" />

  const TABS: { id: TabId; label: string }[] = [
    { id: 'participants', label: 'Participantes' },
    { id: 'contests', label: 'Concursos' },
  ]

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Participantes"
        description="Equipos (lots) y atletas de la competencia, con sus propiedades."
      />

      {/* Pestañas Participantes / Concursos */}
      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-app p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === item.id
                ? 'bg-primary text-white shadow-lg shadow-blue-950/40'
                : 'text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <>
          {/* Barra: Eventos + acciones */}
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="min-w-56">
              <p className="label-muted mb-1.5">Eventos</p>
              <Select value="" onChange={() => undefined} aria-label="Eventos">
                <option value="">— Selecciona un evento —</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.round || match.competition || match.venue || match.kickoff}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEventModalOpen(true)}>
              Nuevo
            </Button>
            <Button
              variant="secondary"
              icon={<Pencil size={15} />}
              disabled={matches.length === 0}
              onClick={() => setEditingMatch(matches[0] ?? null)}
            >
              Modificar
            </Button>
            <Button
              variant="danger"
              icon={<X size={15} />}
              disabled={matches.length === 0}
              onClick={() => setDeletingMatch(matches[0] ?? null)}
            >
              Borrar
            </Button>
          </div>

          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin participantes"
              description="Crea el primer equipo para empezar a inscribir participantes."
              action={
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => void handleNewTeam()}>
                  Nuevo equipo
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
              <div className="space-y-5">
                {/* Tabla de equipos */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="label-muted">Equipos</p>
                    <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => void handleNewTeam()}>
                      Nuevo equipo
                    </Button>
                  </div>
                  <Table>
                    <THead>
                      <tr>
                        <TH className="w-20">Lots</TH>
                        <TH>Equipo</TH>
                        <TH>País</TH>
                        <TH>Código</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {teams.map((team) => (
                        <TR
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className={cn(selectedTeamId === team.id && 'bg-primary/15')}
                        >
                          <TD className="font-mono font-bold tabular-nums text-ink">{team.lot || '—'}</TD>
                          <TD className="font-semibold text-ink">{team.name}</TD>
                          <TD className="text-muted">{team.country || '—'}</TD>
                          <TD className="text-muted">{team.countryCode || '—'}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </section>

                {/* Tabla de atletas */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="label-muted">Atletas de {selectedTeam?.name ?? ''}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{athletes.length} registrados</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<UserPlus size={14} />}
                        disabled={!selectedTeamId}
                        onClick={() => setNewAthleteOpen(true)}
                      >
                        Nuevo atleta
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <THead>
                      <tr>
                        <TH className="w-16">N°</TH>
                        <TH>Nombre</TH>
                        <TH>Puesto</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {athletes.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-xs text-muted">
                            Este equipo no tiene atletas. Usa «Importar…» o añádelos en la sección de Jugadores.
                          </td>
                        </tr>
                      ) : (
                        athletes.map((player) => (
                          <TR
                            key={player.id}
                            onClick={() => setSelectedPlayerId(player.id)}
                            className={cn(selectedPlayerId === player.id && 'bg-primary/15')}
                          >
                            <TD className="font-mono font-bold tabular-nums text-ink">{player.number ?? '—'}</TD>
                            <TD className="font-semibold text-ink">
                              {player.firstName} {player.lastName}
                            </TD>
                            <TD className="text-muted">{player.position || '—'}</TD>
                          </TR>
                        ))
                      )}
                    </tbody>
                  </Table>
                </section>
              </div>

              {/* Paneles laterales de propiedad */}
              <div className="space-y-4">
                <aside className="rounded-xl border border-line bg-app p-4">
                  <p className="label-muted mb-3">Propiedad del equipo</p>
                  {selectedTeam ? (
                    <div className="space-y-3">
                      <Field label="Lots">
                        <Input
                          value={selectedTeam.lot}
                          onChange={(event) => void patchTeam({ lot: event.target.value })}
                          placeholder="1"
                          maxLength={8}
                        />
                      </Field>
                      <Field label="Nombre">
                        <Input
                          value={selectedTeam.name}
                          onChange={(event) => void patchTeam({ name: event.target.value })}
                        />
                      </Field>
                      <Field label="País">
                        <Input
                          value={selectedTeam.country}
                          onChange={(event) => void patchTeam({ country: event.target.value })}
                          placeholder="España"
                        />
                      </Field>
                      <Field label="Código de país">
                        <Input
                          value={selectedTeam.countryCode}
                          onChange={(event) => void patchTeam({ countryCode: event.target.value.toUpperCase() })}
                          placeholder="ESP"
                          maxLength={4}
                        />
                      </Field>
                      <div>
                        <p className="label-muted mb-1.5">LOGO</p>
                        <div className="flex items-center gap-3">
                          {selectedTeam.logo ? (
                            <img
                              src={selectedTeam.logo}
                              alt=""
                              className="h-14 w-14 rounded-lg border border-line bg-white object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-line text-muted">
                              <Users size={20} />
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<ImagePlus size={14} />}
                            loading={pickLogo}
                            onClick={() => void pickTeamLogo()}
                          >
                            Cambiar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Selecciona un equipo de la tabla.</p>
                  )}
                </aside>

                <aside className="rounded-xl border border-line bg-app p-4">
                  <p className="label-muted mb-3 flex items-center gap-2">
                    <UserRound size={14} /> Propiedad del atleta
                  </p>
                  {selectedPlayer ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {selectedPlayer.photo ? (
                          <img
                            src={selectedPlayer.photo}
                            alt=""
                            className="h-16 w-16 rounded-lg border border-line object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-line text-muted">
                            <UserRound size={24} />
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<ImagePlus size={14} />}
                          loading={pickPhoto}
                          onClick={() => void pickPlayerPhoto()}
                        >
                          Foto
                        </Button>
                      </div>
                      <Field label="Número">
                        <Input
                          type="number"
                          value={selectedPlayer.number ?? ''}
                          onChange={(event) =>
                            void patchPlayer({
                              number: event.target.value === '' ? null : Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Nombre">
                        <Input
                          value={selectedPlayer.firstName}
                          onChange={(event) => void patchPlayer({ firstName: event.target.value })}
                        />
                      </Field>
                      <Field label="Apellido">
                        <Input
                          value={selectedPlayer.lastName}
                          onChange={(event) => void patchPlayer({ lastName: event.target.value })}
                        />
                      </Field>
                      <Field label="Posición">
                        <Input
                          value={selectedPlayer.position}
                          onChange={(event) => void patchPlayer({ position: event.target.value })}
                          placeholder="Base"
                        />
                      </Field>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Selecciona un atleta de la tabla.</p>
                  )}
                </aside>
              </div>
            </div>
          )}

          {/* Botones inferiores */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button
              variant="secondary"
              icon={<FileUp size={15} />}
              loading={importing}
              disabled={!selectedTeamId}
              onClick={() => void handleImport()}
            >
              Importar…
            </Button>
            <Button variant="secondary" icon={<Dices size={15} />} onClick={() => void handleDraw()}>
              Sorteo
            </Button>
            <Button variant="primary" icon={<Sparkles size={15} />} onClick={handleGenerateMatch}>
              Generate Match
            </Button>
            <Button variant="ghost" icon={<X size={15} />} onClick={() => navigate(`/p/${projectId}`)}>
              Cerrar
            </Button>
          </div>
        </>
      ) : (
        /* ------------------------------ Concursos ----------------------------- */
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">{project?.name ?? 'Competencia'}</h2>
              <p className="text-xs text-muted">
                {teams.length} equipos · {matches.length} concursos programados
              </p>
            </div>
          </div>

          {matches.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Sin concursos"
              description="Genera el primer concurso (partido) desde la pestaña Participantes."
              action={
                <Button variant="primary" icon={<Sparkles size={16} />} onClick={handleGenerateMatch}>
                  Generate Match
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Concurso</TH>
                  <TH>Equipos</TH>
                  <TH>Fecha</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acciones</TH>
                </tr>
              </THead>
              <tbody>
                {matches.map((match) => {
                  const home = teams.find((t) => t.id === match.homeTeamId)
                  const away = teams.find((t) => t.id === match.awayTeamId)
                  return (
                    <TR key={match.id}>
                      <TD className="font-semibold text-ink">{match.round || match.competition || 'Concurso'}</TD>
                      <TD className="text-muted">
                        {(home?.name ?? '—')} vs {(away?.name ?? '—')}
                      </TD>
                      <TD className="text-muted">{match.kickoff.slice(0, 10)}</TD>
                      <TD>
                        <Badge tone={match.status === 'live' ? 'danger' : match.status === 'finished' ? 'success' : 'default'}>
                          {match.status === 'live' ? 'En juego' : match.status === 'finished' ? 'Finalizado' : 'Programado'}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Pencil size={14} />}
                            onClick={() => setEditingMatch(match)}
                          >
                            Modificar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10 hover:text-danger"
                            icon={<Trash2 size={14} />}
                            onClick={() => setDeletingMatch(match)}
                          />
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </tbody>
            </Table>
          )}
        </section>
      )}

      {/* Modales */}
      <MatchFormModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        projectId={projectId}
        teams={teams}
        defaultCompetition={project?.name ?? ''}
        defaultVenue={project?.location ?? ''}
        onSubmit={async (input) => {
          const created = await useMatchesStore.getState().create(input)
          if (created) setEventModalOpen(false)
          return created
        }}
      />
      <MatchFormModal
        open={editingMatch !== null}
        onClose={() => setEditingMatch(null)}
        projectId={projectId}
        teams={teams}
        defaultCompetition={project?.name ?? ''}
        defaultVenue={project?.location ?? ''}
        match={editingMatch}
        onSubmit={async (input) => {
          if (!editingMatch) return null
          const updated = await useMatchesStore.getState().update(editingMatch.id, input)
          if (updated) setEditingMatch(null)
          return updated
        }}
      />

      {selectedTeamId ? (
        <PlayerFormModal
          open={newAthleteOpen}
          onClose={() => setNewAthleteOpen(false)}
          teamId={selectedTeamId}
          onSubmit={async (input) => {
            const player = await createPlayer(input)
            if (player) setNewAthleteOpen(false)
            return player !== null
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deletingMatch !== null}
        title="Eliminar concurso"
        message={deletingMatch ? 'Se eliminará el concurso y sus eventos. ¿Continuar?' : ''}
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDeleteMatch()}
        onCancel={() => setDeletingMatch(null)}
      />
    </div>
  )
}
