import { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ColorField, Field, Input } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { TeamBadge } from '@/components/TeamBadge'
import { api } from '@/services/api'
import type { NewTeamInput, Team } from '@/types'
import { toast } from '@/stores/toastStore'

interface TeamFormModalProps {
  open: boolean
  onClose: () => void
  team?: Team | null
  onSubmit: (input: Omit<NewTeamInput, 'projectId'>) => Promise<boolean>
}

interface FormState {
  name: string
  shortName: string
  code: string
  logo: string | null
  primaryColor: string
  secondaryColor: string
  city: string
  country: string
  countryCode: string
  lot: string
}

const EMPTY: FormState = {
  name: '',
  shortName: '',
  code: '',
  logo: null,
  primaryColor: '#2563EB',
  secondaryColor: '#FFFFFF',
  city: '',
  country: '',
  countryCode: '',
  lot: '',
}

export function TeamFormModal({ open, onClose, team, onSubmit }: TeamFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      team
        ? {
            name: team.name,
            shortName: team.shortName,
            code: team.code,
            logo: team.logo,
            primaryColor: team.primaryColor,
            secondaryColor: team.secondaryColor,
            city: team.city,
            country: team.country,
            countryCode: team.countryCode ?? '',
            lot: team.lot ?? '',
          }
        : EMPTY,
    )
  }, [open, team])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((state) => ({ ...state, [key]: value }))

  const pickLogo = async (): Promise<void> => {
    setPicking(true)
    try {
      const dataUrl = await api.files.pickImage()
      if (dataUrl) set('logo', dataUrl)
    } catch (error) {
      toast.error(error)
    } finally {
      setPicking(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (!form.name.trim()) {
      setError('El nombre del equipo es obligatorio.')
      return
    }
    setSaving(true)
    try {
      const ok = await onSubmit({
        ...form,
        name: form.name.trim(),
        shortName: form.shortName.trim() || form.name.trim(),
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
      title={team ? 'Editar equipo' : 'Nuevo equipo'}
      description="Identidad visual del equipo para el marcador y la pantalla externa."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {team ? 'Guardar cambios' : 'Crear equipo'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[160px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <TeamBadge
            team={{
              name: form.name || 'Equipo',
              shortName: form.shortName || form.name || 'EQ',
              logo: form.logo,
              primaryColor: form.primaryColor,
              secondaryColor: form.secondaryColor,
            }}
            size="lg"
          />
          <Button
            size="sm"
            variant="secondary"
            icon={<ImagePlus size={14} />}
            onClick={() => void pickLogo()}
            loading={picking}
            block
          >
            {form.logo ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {form.logo ? (
            <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => set('logo', null)} block>
              Quitar logo
            </Button>
          ) : (
            <p className="text-center text-[11px] leading-snug text-muted">PNG, JPG o SVG</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={error} className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Real Club Deportivo"
              invalid={Boolean(error)}
              autoFocus
            />
          </Field>
          <Field label="Nombre corto">
            <Input
              value={form.shortName}
              onChange={(event) => set('shortName', event.target.value)}
              placeholder="RCD"
              maxLength={12}
            />
          </Field>
          <Field label="Código">
            <Input
              value={form.code}
              onChange={(event) => set('code', event.target.value.toUpperCase())}
              placeholder="RCD"
              maxLength={4}
            />
          </Field>
          <ColorField label="Color principal" value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
          <ColorField label="Color secundario" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
          <Field label="Ciudad">
            <Input value={form.city} onChange={(event) => set('city', event.target.value)} placeholder="Madrid" />
          </Field>
          <Field label="País">
            <Input value={form.country} onChange={(event) => set('country', event.target.value)} placeholder="España" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
