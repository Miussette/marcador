import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import type { MatchEvent, MatchEventType, Player, Team } from '@/types'

const EVENT_TYPES: { id: MatchEventType; label: string }[] = [
  { id: 'goal', label: 'Gol' },
  { id: 'own_goal', label: 'Autogol' },
  { id: 'yellow', label: 'Tarjeta amarilla' },
  { id: 'red', label: 'Tarjeta roja' },
  { id: 'substitution', label: 'Sustitución' },
  { id: 'penalty', label: 'Penal' },
  { id: 'var', label: 'VAR' },
  { id: 'added_time', label: 'Tiempo añadido' },
  { id: 'assist', label: 'Asistencia' },
  { id: 'save', label: 'Atajada' },
  { id: 'foul', label: 'Falta' },
  { id: 'offside', label: 'Fuera de juego' },
  { id: 'corner', label: 'Córner' },
  { id: 'free_kick', label: 'Tiro libre' },
]

interface EventFormModalProps {
  open: boolean
  onClose: () => void
  matchId: string
  teams: Team[]
  players: Player[]
  /** Minuto actual del partido (para sugerir en nuevos eventos). */
  currentMinute: number
  /** Evento a editar (null para crear uno nuevo). */
  event?: MatchEvent | null
  onSubmit: (input: {
    matchId: string
    teamId: string | null
    playerId: string | null
    type: MatchEventType
    minute: number
    description: string
    secondaryPlayerId: string | null
  }) => Promise<boolean>
}

interface FormState {
  type: MatchEventType
  teamId: string
  playerId: string
  secondaryPlayerId: string
  minute: string
  description: string
}

export function EventFormModal({
  open,
  onClose,
  matchId,
  teams,
  players,
  currentMinute,
  event,
  onSubmit,
}: EventFormModalProps) {
  const [form, setForm] = useState<FormState>({
    type: 'goal',
    teamId: '',
    playerId: '',
    secondaryPlayerId: '',
    minute: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (event) {
      setForm({
        type: event.type,
        teamId: event.teamId ?? '',
        playerId: event.playerId ?? '',
        secondaryPlayerId: event.secondaryPlayerId ?? '',
        minute: String(event.minute),
        description: event.description,
      })
    } else {
      setForm({
        type: 'goal',
        teamId: '',
        playerId: '',
        secondaryPlayerId: '',
        minute: String(currentMinute),
        description: '',
      })
    }
  }, [open, event, currentMinute])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((state) => ({ ...state, [key]: value }))

  const selectedTeamId = form.teamId || null
  const teamPlayers = selectedTeamId ? players.filter((p) => p.teamId === selectedTeamId) : []

  const submit = async (): Promise<void> => {
    const minute = Number.parseInt(form.minute, 10)
    if (!Number.isFinite(minute) || minute < 0) {
      setError('El minuto debe ser un número válido.')
      return
    }
    setSaving(true)
    try {
      const ok = await onSubmit({
        matchId,
        teamId: selectedTeamId,
        playerId: form.playerId || null,
        type: form.type,
        minute,
        description: form.description.trim(),
        secondaryPlayerId: form.secondaryPlayerId || null,
      })
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Editar evento' : 'Nuevo evento'}
      description="Registra goles, tarjetas, sustituciones y otros eventos del partido."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {event ? 'Guardar cambios' : 'Crear evento'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tipo de evento" required className="sm:col-span-2">
          <Select value={form.type} onChange={(e) => set('type', e.target.value as MatchEventType)}>
            {EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Equipo">
          <Select
            value={form.teamId}
            onChange={(e) => {
              set('teamId', e.target.value)
              set('playerId', '')
              set('secondaryPlayerId', '')
            }}
          >
            <option value="">— Sin equipo —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Minuto" required>
          <Input
            type="number"
            min={0}
            max={200}
            value={form.minute}
            onChange={(e) => set('minute', e.target.value)}
            placeholder="45"
          />
        </Field>

        <Field label="Jugador principal" className="sm:col-span-2">
          <Select value={form.playerId} onChange={(e) => set('playerId', e.target.value)}>
            <option value="">— Sin jugador —</option>
            {teamPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.number ? `#${player.number} ` : ''}
                {player.firstName} {player.lastName}
              </option>
            ))}
          </Select>
        </Field>

        {(form.type === 'goal' || form.type === 'substitution') && (
          <Field
            label={form.type === 'goal' ? 'Asistente' : 'Jugador sustituido'}
            className="sm:col-span-2"
          >
            <Select value={form.secondaryPlayerId} onChange={(e) => set('secondaryPlayerId', e.target.value)}>
              <option value="">— Ninguno —</option>
              {teamPlayers
                .filter((p) => p.id !== form.playerId)
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.number ? `#${player.number} ` : ''}
                    {player.firstName} {player.lastName}
                  </option>
                ))}
            </Select>
          </Field>
        )}

        <Field label="Descripción" className="sm:col-span-2">
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Detalles del evento (opcional)"
            rows={2}
          />
        </Field>

        {error ? <p className="text-sm text-danger sm:col-span-2">{error}</p> : null}
      </div>
    </Modal>
  )
}
