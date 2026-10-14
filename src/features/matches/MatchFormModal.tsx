import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { TeamBadge } from '@/components/TeamBadge'
import { api } from '@/services/api'
import { toast } from '@/stores/toastStore'
import { OFFICIAL_GRADES, OFFICIAL_TYPES } from '@/types'
import type { Match, MatchOfficial, NewMatchInput, Team } from '@/types'
import { cn } from '@/utils/cn'
import { nowTime, todayISO } from '@/utils/time'

type TabId = 'team' | 'officials'

interface MatchFormModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  teams: Team[]
  defaultCompetition: string
  /** Sede por defecto (ubicación del proyecto). */
  defaultVenue?: string
  match?: Match | null
  onSubmit: (input: NewMatchInput) => Promise<Match | null>
}

interface FormState {
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  venue: string
  round: string
  competition: string
}

/** Fila en edición de la tabla de oficiales (id opcional = aún no guardada). */
interface OfficialDraft {
  id?: string
  order: number
  type: string
  name: string
  country: string
  grade: string
}

const toDraft = (official: MatchOfficial): OfficialDraft => ({
  id: official.id,
  order: official.order,
  type: official.type,
  name: official.name,
  country: official.country,
  grade: official.grade,
})

const EMPTY_OFFICIAL: OfficialDraft = { order: 0, type: 'referee', name: '', country: '', grade: 'fiba' }

function splitKickoff(kickoff: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/.exec(kickoff ?? '')
  if (!match) return { date: todayISO(), time: nowTime() }
  return { date: match[1], time: match[2] ?? nowTime() }
}

const officialLabel = (id: string): string => OFFICIAL_TYPES.find((t) => t.id === id)?.label ?? id
const gradeLabel = (id: string): string => OFFICIAL_GRADES.find((g) => g.id === id)?.label ?? id

export function MatchFormModal({
  open,
  onClose,
  projectId,
  teams,
  defaultCompetition,
  defaultVenue = '',
  match,
  onSubmit,
}: MatchFormModalProps) {
  const initial = useMemo<FormState>(() => {
    if (match) {
      const { date, time } = splitKickoff(match.kickoff)
      return {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        date,
        time,
        venue: match.venue,
        round: match.round,
        competition: match.competition,
      }
    }
    return {
      homeTeamId: '',
      awayTeamId: '',
      date: todayISO(),
      time: nowTime(),
      venue: defaultVenue,
      round: '',
      competition: defaultCompetition,
    }
  }, [match, defaultCompetition, defaultVenue])

  const [form, setForm] = useState<FormState>(initial)
  const [tab, setTab] = useState<TabId>('team')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [officials, setOfficials] = useState<OfficialDraft[]>([])
  const [selectedOfficial, setSelectedOfficial] = useState<number>(-1)
  const officialsDirty = useRef(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(initial)
    setTab('team')
    setSelectedOfficial(-1)
    officialsDirty.current = false
    setOfficials([])
    if (match) {
      void api.officials
        .listByMatch(match.id)
        .then((list) => setOfficials(list.map(toDraft)))
        .catch((err) => toast.error(err))
    }
  }, [open, initial, match])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((state) => ({ ...state, [key]: value }))

  const homeTeam = teams.find((t) => t.id === form.homeTeamId) ?? null
  const awayTeam = teams.find((t) => t.id === form.awayTeamId) ?? null

  /* ------------------------------ oficiales ---------------------------- */

  const patchOfficial = (index: number, patch: Partial<OfficialDraft>): void => {
    officialsDirty.current = true
    setOfficials((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const addOfficial = (): void => {
    officialsDirty.current = true
    setOfficials((list) => [...list, { ...EMPTY_OFFICIAL, order: list.length + 1 }])
    setSelectedOfficial(officials.length)
  }

  const removeOfficial = (index: number): void => {
    officialsDirty.current = true
    setOfficials((list) => list.filter((_, i) => i !== index))
    setSelectedOfficial((current) => (current === index ? -1 : current > index ? current - 1 : current))
  }

  const moveOfficial = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    if (target < 0 || target >= officials.length) return
    officialsDirty.current = true
    setOfficials((list) => {
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next.map((row, i) => ({ ...row, order: i + 1 }))
    })
    setSelectedOfficial(target)
  }

  const saveOfficials = async (matchId: string): Promise<void> => {
    if (!officialsDirty.current) return
    const cleaned = officials
      .map((row, index) => ({
        order: index + 1,
        type: row.type,
        name: row.name.trim(),
        country: row.country.trim(),
        grade: row.grade,
      }))
      .filter((row) => row.name || row.type)
    await api.officials.replaceAll(matchId, cleaned)
    officialsDirty.current = false
  }

  /* ------------------------------- submit ------------------------------ */

  const submit = async (): Promise<void> => {
    if (!form.homeTeamId || !form.awayTeamId) {
      setError('Selecciona el equipo local y el visitante.')
      setTab('team')
      return
    }
    if (form.homeTeamId === form.awayTeamId) {
      setError('Los equipos deben ser distintos.')
      setTab('team')
      return
    }
    setSaving(true)
    try {
      const saved = await onSubmit({
        projectId,
        homeTeamId: form.homeTeamId,
        awayTeamId: form.awayTeamId,
        venue: form.venue.trim(),
        kickoff: `${form.date}T${form.time}`,
        round: form.round.trim(),
        competition: form.competition.trim() || defaultCompetition,
      })
      if (!saved) return
      try {
        await saveOfficials(saved.id)
      } catch (err) {
        toast.error(err)
        return
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (teams.length < 2) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={match ? 'Editar partido' : 'Nuevo partido'}
        size="sm"
        footer={
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          Necesitas al menos <strong className="text-ink">2 equipos</strong> en el proyecto para crear un partido.
          Ve a la sección de Equipos y créalos primero.
        </p>
      </Modal>
    )
  }

  const selected = selectedOfficial >= 0 ? officials[selectedOfficial] ?? null : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={match ? 'Editar partido' : 'Nuevo partido'}
      description="Define los equipos, los oficiales y el contexto de la competencia."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {match ? 'Guardar cambios' : 'Crear partido'}
          </Button>
        </>
      }
    >
      {/* Pestañas Equipo / Oficiales */}
      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-app p-1">
        {(
          [
            { id: 'team', label: 'Equipo' },
            { id: 'officials', label: 'Oficiales' },
          ] as { id: TabId; label: string }[]
        ).map((item) => (
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

      {tab === 'team' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Equipo local" required error={error}>
            <Select value={form.homeTeamId} onChange={(event) => set('homeTeamId', event.target.value)} invalid={Boolean(error)}>
              <option value="">— Seleccionar —</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Equipo visitante" required>
            <Select value={form.awayTeamId} onChange={(event) => set('awayTeamId', event.target.value)} invalid={Boolean(error)}>
              <option value="">— Seleccionar —</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-center justify-center gap-6 rounded-xl border border-line bg-app py-4 sm:col-span-2">
            <div className="flex flex-col items-center gap-2">
              <TeamBadge team={homeTeam} size="md" />
              <span className="max-w-28 truncate text-center text-xs font-semibold text-ink">
                {homeTeam?.name ?? 'Local'}
              </span>
            </div>
            <span className="text-lg font-black text-muted">VS</span>
            <div className="flex flex-col items-center gap-2">
              <TeamBadge team={awayTeam} size="md" />
              <span className="max-w-28 truncate text-center text-xs font-semibold text-ink">
                {awayTeam?.name ?? 'Visitante'}
              </span>
            </div>
          </div>

          <Field label="Fecha">
            <Input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={form.time} onChange={(event) => set('time', event.target.value)} />
          </Field>
          <Field label="Estadio / Sede">
            <Input value={form.venue} onChange={(event) => set('venue', event.target.value)} placeholder="Estadio Municipal" />
          </Field>
          <Field label="Jornada">
            <Input value={form.round} onChange={(event) => set('round', event.target.value)} placeholder="Jornada 3" />
          </Field>
          <Field label="Competencia" className="sm:col-span-2">
            <Input
              value={form.competition}
              onChange={(event) => set('competition', event.target.value)}
              placeholder={defaultCompetition}
            />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
          {/* Tabla de oficiales */}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-2/60">
                <tr>
                  <th className="label-muted px-3 py-2.5 text-left">Orden</th>
                  <th className="label-muted px-3 py-2.5 text-left">Tipo</th>
                  <th className="label-muted px-3 py-2.5 text-left">Nombre</th>
                  <th className="label-muted px-3 py-2.5 text-left">País</th>
                  <th className="label-muted px-3 py-2.5 text-left">Grade</th>
                  <th className="label-muted px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {officials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted">
                      Sin oficiales. Pulsa «Agregar» para añadir árbitros, anotadores…
                    </td>
                  </tr>
                ) : (
                  officials.map((official, index) => (
                    <tr
                      key={official.id ?? `new-${index}`}
                      onClick={() => setSelectedOfficial(index)}
                      className={cn(
                        'cursor-pointer border-b border-line/70 transition-colors last:border-b-0',
                        selectedOfficial === index ? 'bg-primary/15' : 'hover:bg-surface-2/70',
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-ink tabular-nums">{index + 1}</td>
                      <td className="px-3 py-2 text-ink">{officialLabel(official.type)}</td>
                      <td className="px-3 py-2 text-ink">{official.name || '—'}</td>
                      <td className="px-3 py-2 text-muted">{official.country || '—'}</td>
                      <td className="px-3 py-2 text-muted">{gradeLabel(official.grade)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label="Subir"
                            disabled={index === 0}
                            onClick={(event) => {
                              event.stopPropagation()
                              moveOfficial(index, -1)
                            }}
                            className="rounded p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Bajar"
                            disabled={index === officials.length - 1}
                            onClick={(event) => {
                              event.stopPropagation()
                              moveOfficial(index, 1)
                            }}
                            className="rounded p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar oficial"
                            onClick={(event) => {
                              event.stopPropagation()
                              removeOfficial(index)
                            }}
                            className="rounded p-1.5 text-muted transition-colors hover:bg-danger/15 hover:text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Panel lateral: Propiedad del oficial */}
          <aside className="rounded-xl border border-line bg-app p-4">
            <p className="label-muted mb-3 flex items-center gap-2">
              <UserRound size={14} />
              Propiedad del oficial
            </p>

            {selected ? (
              <div className="space-y-3">
                <Field label="Tipo">
                  <Select
                    value={selected.type}
                    onChange={(event) => patchOfficial(selectedOfficial, { type: event.target.value })}
                  >
                    {OFFICIAL_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nombre">
                  <Input
                    value={selected.name}
                    onChange={(event) => patchOfficial(selectedOfficial, { name: event.target.value })}
                    placeholder="Nombre completo"
                  />
                </Field>
                <Field label="País">
                  <Input
                    value={selected.country}
                    onChange={(event) => patchOfficial(selectedOfficial, { country: event.target.value })}
                    placeholder="ESP"
                    maxLength={24}
                  />
                </Field>
                <Field label="Grade">
                  <Select
                    value={selected.grade}
                    onChange={(event) => patchOfficial(selectedOfficial, { grade: event.target.value })}
                  >
                    {OFFICIAL_GRADES.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  block
                  onClick={() => removeOfficial(selectedOfficial)}
                >
                  Quitar oficial
                </Button>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted">
                Selecciona una fila de la tabla para editar sus datos, o añade un nuevo oficial.
              </p>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <Button variant="primary" size="sm" icon={<Plus size={14} />} block onClick={addOfficial}>
                Agregar
              </Button>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  )
}
