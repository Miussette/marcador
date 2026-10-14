import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { SportPicker } from './SportPicker'
import { MODALITIES } from '@/types'
import type { CompetitionProps, ModalityId, NewProjectInput, SportId } from '@/types'
import { todayISO } from '@/utils/time'

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: NewProjectInput) => Promise<boolean>
  initial?: Partial<NewProjectInput>
  submitLabel?: string
  title?: string
}

interface FormState {
  name: string
  sport: SportId
  season: string
  location: string
  date: string
  modality: ModalityId
  compProps: CompetitionProps
}

const EMPTY: FormState = {
  name: '',
  sport: 'football',
  season: `${new Date().getFullYear()}`,
  location: '',
  date: todayISO(),
  modality: 'league',
  compProps: { code: '', session: '', court: '', title: '', workingMode: 'standalone', serverUrl: '', uploadResults: false, uploadPlayByPlay: false },
}

export function NewProjectModal({
  open,
  onClose,
  onSubmit,
  initial,
  submitLabel = 'Crear proyecto',
  title = 'Nuevo proyecto',
}: NewProjectModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    const init: Partial<NewProjectInput> = initial ?? {}
    setForm({
      ...EMPTY,
      ...init,
      compProps: init.compProps ?? EMPTY.compProps,
    })
  }, [open, initial])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((state) => ({ ...state, [key]: value }))

  const setProp = (key: keyof CompetitionProps, value: string): void =>
    setForm((state) => ({ ...state, compProps: { ...state.compProps, [key]: value } }))

  const submit = async (): Promise<void> => {
    if (!form.name.trim()) {
      setError('El nombre de la competencia es obligatorio.')
      return
    }
    const code = form.compProps.code.trim()
    const session = form.compProps.session.trim()
    const court = form.compProps.court.trim()
    const compProps: CompetitionProps = { ...form.compProps, code, session, court }
    setSaving(true)
    try {
      const ok = await onSubmit({ ...form, compProps, name: form.name.trim() })
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Identidad de la competencia: nombre, deporte y propiedades. Podrás añadir equipos y partidos después."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre de competencia" required error={error} className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Liga Municipal 2026"
            invalid={Boolean(error)}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
        </Field>

        <Field label="Deporte" className="sm:col-span-2" hint="Determina el estilo de la competencia; el marcador sigue siendo numérico.">
          <SportPicker value={form.sport} onChange={(id) => set('sport', id)} />
        </Field>

        <Field label="Modalidad">
          <Select value={form.modality} onChange={(event) => set('modality', event.target.value as ModalityId)}>
            {MODALITIES.map((modality) => (
              <option key={modality.id} value={modality.id}>
                {modality.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Temporada">
          <Input
            value={form.season}
            onChange={(event) => set('season', event.target.value)}
            placeholder="2026"
          />
        </Field>

        <Field label="Fecha">
          <Input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} />
        </Field>

        <Field label="Ubicación" className="sm:col-span-2">
          <Input
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
            placeholder="Estadio Municipal / Ciudad"
          />
        </Field>

        <div className="rounded-xl border border-line bg-app/60 p-3 sm:col-span-2">
          <p className="label-muted mb-2">Propiedades de competencia</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Código">
              <Input
                value={form.compProps.code}
                onChange={(event) => setProp('code', event.target.value)}
                placeholder="BKB"
                maxLength={16}
              />
            </Field>
            <Field label="Sesión">
              <Input
                value={form.compProps.session}
                onChange={(event) => setProp('session', event.target.value)}
                placeholder="01"
                maxLength={16}
              />
            </Field>
            <Field label="Cancha">
              <Input
                value={form.compProps.court}
                onChange={(event) => setProp('court', event.target.value)}
                placeholder="[1] A"
                maxLength={32}
              />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  )
}
