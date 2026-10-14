import { useEffect, useState } from 'react'
import { ExternalLink, PlugZap, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/stores/toastStore'
import { WORKING_MODES } from '@/types'
import type { CompetitionProps, Project, WorkingModeId } from '@/types'
import { todayISO } from '@/utils/time'

interface CompetitionPropsModalProps {
  open: boolean
  onClose: () => void
  project: Project
  onSubmit: (input: { date?: string; location?: string; compProps: CompetitionProps }) => Promise<boolean>
}

interface FormState {
  title: string
  date: string
  location: string
  workingMode: WorkingModeId
  serverUrl: string
  code: string
  session: string
  court: string
  uploadResults: boolean
  uploadPlayByPlay: boolean
}

const EMPTY: FormState = {
  title: '',
  date: todayISO(),
  location: '',
  workingMode: 'standalone',
  serverUrl: '',
  code: '',
  session: '',
  court: '',
  uploadResults: false,
  uploadPlayByPlay: false,
}

/**
 * Modal "Competition Property": título, fecha, sede, modo de trabajo,
 * servidor MMS, códigos y opciones de subida de resultados.
 */
export function CompetitionPropsModal({ open, onClose, project, onSubmit }: CompetitionPropsModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setCheckResult(null)
    const props = project.compProps
    setForm({
      title: props?.title ?? '',
      date: project.date || todayISO(),
      location: project.location,
      workingMode: props?.workingMode ?? 'standalone',
      serverUrl: props?.serverUrl ?? '',
      code: props?.code ?? '',
      session: props?.session ?? '',
      court: props?.court ?? '',
      uploadResults: props?.uploadResults ?? false,
      uploadPlayByPlay: props?.uploadPlayByPlay ?? false,
    })
  }, [open, project])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm((state) => ({ ...state, [key]: value }))

  /** Comprueba la comunicación con el servidor MMS configurado. */
  const checkCommunication = async (): Promise<void> => {
    const url = form.serverUrl.trim()
    if (!url) {
      setCheckResult('Introduce la URL del servidor antes de comprobar.')
      return
    }
    setChecking(true)
    setCheckResult(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      await fetch(url.endsWith('/') ? url : `${url}/`, { signal: controller.signal, mode: 'no-cors' })
      clearTimeout(timeout)
      setCheckResult('Comunicación establecida con el servidor.')
    } catch {
      setCheckResult('Sin respuesta del servidor. Revisa la URL y que esté accesible en la red.')
    } finally {
      setChecking(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (!form.title.trim() && !form.code.trim()) {
      setError('Indica al menos el título o el código de la competencia.')
      return
    }
    setSaving(true)
    try {
      const compProps: CompetitionProps = {
        title: form.title.trim(),
        code: form.code.trim(),
        session: form.session.trim(),
        court: form.court.trim(),
        workingMode: form.workingMode,
        serverUrl: form.serverUrl.trim(),
        uploadResults: form.uploadResults,
        uploadPlayByPlay: form.uploadPlayByPlay,
      }
      const ok = await onSubmit({
        date: form.date,
        location: form.location.trim(),
        compProps,
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
      title="Propiedades de competencia"
      description="Título, fechas, modo de trabajo y conexión con el servidor MMS."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Título del partido" className="sm:col-span-2">
          <Input
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            placeholder="Baloncesto · Final"
            autoFocus
          />
        </Field>

        <Field label="Fecha">
          <Input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} />
        </Field>

        <Field label="Ubicación">
          <Input
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
            placeholder="Pabellón Municipal"
          />
        </Field>

        <Field label="Working Mode" hint="Standalone funciona sin servidor; el modo servidor envía datos al MMS.">
          <Select
            value={form.workingMode}
            onChange={(event) => set('workingMode', event.target.value as WorkingModeId)}
          >
            {WORKING_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Server URL">
          <Input
            value={form.serverUrl}
            onChange={(event) => set('serverUrl', event.target.value)}
            placeholder="http://192.168.0.230"
            disabled={form.workingMode === 'standalone'}
          />
        </Field>

        <Field label="Competition Code">
          <Input
            value={form.code}
            onChange={(event) => set('code', event.target.value)}
            placeholder="BKB"
            maxLength={16}
            invalid={Boolean(error)}
          />
        </Field>

        <Field label="Session Code">
          <Input
            value={form.session}
            onChange={(event) => set('session', event.target.value)}
            placeholder="01"
            maxLength={16}
          />
        </Field>

        <Field label="Court">
          <Input
            value={form.court}
            onChange={(event) => set('court', event.target.value)}
            placeholder="[1] A"
            maxLength={32}
          />
        </Field>

        <div className="flex items-end">
          <Button
            variant="secondary"
            icon={<PlugZap size={15} />}
            onClick={() => void checkCommunication()}
            loading={checking}
            block
          >
            Check Communication…
          </Button>
        </div>

        {checkResult ? (
          <p className="text-xs leading-relaxed text-muted sm:col-span-2">{checkResult}</p>
        ) : null}

        {error ? <p className="text-xs text-danger sm:col-span-2">{error}</p> : null}

        {/* Opciones de subida al servidor */}
        <div className="rounded-xl border border-line bg-app/60 p-4 sm:col-span-2">
          <p className="label-muted mb-3">Subida de datos al servidor</p>
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.uploadResults}
                onChange={(event) => set('uploadResults', event.target.checked)}
                className="h-4 w-4 accent-[#2563EB]"
              />
              Upload Results
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.uploadPlayByPlay}
                onChange={(event) => set('uploadPlayByPlay', event.target.checked)}
                className="h-4 w-4 accent-[#2563EB]"
              />
              Upload Play By Play &amp; Stats
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            set('workingMode', 'server')
            toast.info('Modo servidor activado: completa la Server URL para conectarte al MMS.')
          }}
          className="flex items-center gap-2 text-sm font-semibold text-blue-300 transition-colors hover:text-blue-200 sm:col-span-2"
        >
          <ExternalLink size={14} />
          Connect Ultra Score onto MMS
          <RefreshCw size={13} className="text-muted" />
        </button>
      </div>
    </Modal>
  )
}
