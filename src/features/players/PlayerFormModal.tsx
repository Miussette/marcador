import { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { api } from '@/services/api'
import type { NewPlayerInput, Player } from '@/types'
import { toast } from '@/stores/toastStore'
import { cn } from '@/utils/cn'

const POSITION_SUGGESTIONS = [
  'Portero',
  'Defensa',
  'Mediocampo',
  'Delantero',
  'Base',
  'Escolta',
  'Ala',
  'Pívot',
  'Entrenador',
]

interface PlayerFormModalProps {
  open: boolean
  onClose: () => void
  teamId: string
  player?: Player | null
  onSubmit: (input: NewPlayerInput) => Promise<boolean>
}

interface FormState {
  firstName: string
  lastName: string
  number: string
  position: string
  photo: string | null
  isStarter: boolean
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  number: '',
  position: '',
  photo: null,
  isStarter: true,
}

export function PlayerFormModal({ open, onClose, teamId, player, onSubmit }: PlayerFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      player
        ? {
            firstName: player.firstName,
            lastName: player.lastName,
            number: player.number === null ? '' : String(player.number),
            position: player.position,
            photo: player.photo,
            isStarter: player.isStarter,
          }
        : EMPTY,
    )
  }, [open, player])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((state) => ({ ...state, [key]: value }))

  const pickPhoto = async (): Promise<void> => {
    setPicking(true)
    try {
      const dataUrl = await api.files.pickImage()
      if (dataUrl) set('photo', dataUrl)
    } catch (error) {
      toast.error(error)
    } finally {
      setPicking(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (!form.firstName.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const parsedNumber = form.number.trim() === '' ? null : Number.parseInt(form.number, 10)
    if (parsedNumber !== null && (!Number.isFinite(parsedNumber) || parsedNumber < 0)) {
      setError('El número debe ser un valor positivo.')
      return
    }
    setSaving(true)
    try {
      const ok = await onSubmit({
        teamId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        number: parsedNumber,
        position: form.position.trim(),
        photo: form.photo,
        isStarter: form.isStarter,
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
      title={player ? 'Editar jugador' : 'Nuevo jugador'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {player ? 'Guardar cambios' : 'Añadir jugador'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={error}>
          <Input
            value={form.firstName}
            onChange={(event) => set('firstName', event.target.value)}
            placeholder="Juan"
            invalid={Boolean(error)}
            autoFocus
          />
        </Field>
        <Field label="Apellido">
          <Input
            value={form.lastName}
            onChange={(event) => set('lastName', event.target.value)}
            placeholder="Pérez"
          />
        </Field>
        <Field label="Número">
          <Input
            type="number"
            min={0}
            max={99}
            value={form.number}
            onChange={(event) => set('number', event.target.value)}
            placeholder="10"
          />
        </Field>
        <Field label="Posición" hint="Escribe libremente o elige una sugerencia">
          <Input
            value={form.position}
            onChange={(event) => set('position', event.target.value)}
            placeholder="Delantero"
            list="position-suggestions"
          />
        </Field>
        <datalist id="position-suggestions">
          {POSITION_SUGGESTIONS.map((position) => (
            <option key={position} value={position} />
          ))}
        </datalist>

        <Field label="Rol en el equipo" className="sm:col-span-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set('isStarter', true)}
              className={cn(
                'h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors',
                form.isStarter
                  ? 'border-success/50 bg-success/15 text-success'
                  : 'border-line bg-app text-muted hover:text-ink',
              )}
            >
              Titular
            </button>
            <button
              type="button"
              onClick={() => set('isStarter', false)}
              className={cn(
                'h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors',
                !form.isStarter
                  ? 'border-warning/50 bg-warning/15 text-warning'
                  : 'border-line bg-app text-muted hover:text-ink',
              )}
            >
              Suplente
            </button>
          </div>
        </Field>

        <div className="flex items-center gap-3 sm:col-span-2">
          {form.photo ? (
            <img
              src={form.photo}
              alt="Foto del jugador"
              className="h-14 w-14 rounded-lg border border-line object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-line text-muted">
              <ImagePlus size={18} />
            </div>
          )}
          <Button size="sm" variant="secondary" icon={<ImagePlus size={14} />} onClick={() => void pickPhoto()} loading={picking}>
            {form.photo ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {form.photo ? (
            <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => set('photo', null)}>
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
