import { useContentPlayback } from '@/features/display/useContentPlayback'
import { api } from '@/services/api'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ListVideo, Play, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Form'
import { useSequencesStore } from '@/stores/sequencesStore'
import { useMediaStore } from '@/stores/mediaStore'
import { toast } from '@/stores/toastStore'
import type { ScheduledSequence } from '@/types'

export function SequencesPage() {
  const { projectId = '' } = useParams()
  const playback = useContentPlayback()
  const { items, loading, loaded, create, remove } = useSequencesStore()
  const mediaItems = useMediaStore((state) => state.items)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<ScheduledSequence | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', itemIds: [] as string[], intervalSec: 5, loop: true })

  useEffect(() => {
    void useSequencesStore.getState().load(projectId)
    void useMediaStore.getState().load(projectId)
  }, [projectId])

  const saveSequence = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast.error('Asigna un nombre a la secuencia.')
      return
    }
    if (form.itemIds.length === 0) {
      toast.error('Selecciona al menos un elemento.')
      return
    }
    setSaving(true)
    try {
      const item = await create({
        name: form.name.trim(),
        itemIds: form.itemIds,
        intervalSec: form.intervalSec,
        loop: form.loop,
      })
      if (item) {
        setCreateOpen(false)
        setForm({ name: '', itemIds: [], intervalSec: 5, loop: true })
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
      <div className="mb-3 flex justify-end"><Button variant="outline" size="sm" onClick={() => void api.display.stopContent().catch(toast.error)}>Detener contenido / volver al marcador</Button></div>
      <PageHeader
        title="Secuencias programadas"
        description="Crea secuencias de elementos multimedia para reproducir automáticamente."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nueva secuencia
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando secuencias…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="Sin secuencias"
          description="Crea secuencias de imágenes y textos para reproducir automáticamente en la pantalla externa."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nueva secuencia
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink">{item.name}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {item.itemIds.length} elementos · {item.intervalSec}s intervalo
                  </p>
                </div>
                <Badge tone={item.loop ? 'success' : 'default'}>
                  {item.loop ? 'En bucle' : 'Una vez'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" icon={<Play size={14} />} block onClick={() => void (playback?.sourceKind === 'sequence' && playback.sourceId === item.id ? api.display.stopContent() : api.display.playContent('sequence', item.id)).catch(toast.error)}>
                  {playback?.sourceKind === 'sequence' && playback.sourceId === item.id ? 'Detener' : 'Reproducir'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleting(item)}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva secuencia"
        description="Selecciona elementos multimedia y configura la reproducción automática."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveSequence()} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Nombre">
            <Input
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="Secuencia de sponsors"
              autoFocus
            />
          </Field>

          <Field label="Elementos multimedia">
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-app p-2">
              {mediaItems.length === 0 ? (
                <p className="p-2 text-xs text-muted">No hay elementos multimedia. Añade algunos primero.</p>
              ) : (
                mediaItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={form.itemIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm((state) => ({ ...state, itemIds: [...state.itemIds, item.id] }))
                        } else {
                          setForm((state) => ({
                            ...state,
                            itemIds: state.itemIds.filter((id) => id !== item.id),
                          }))
                        }
                      }}
                      className="accent-blue-500"
                    />
                    <span className="text-ink">{item.name}</span>
                  </label>
                ))
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Intervalo (segundos)">
              <Input
                type="number"
                min={1}
                value={form.intervalSec}
                onChange={(event) => setForm((state) => ({ ...state, intervalSec: Number(event.target.value) }))}
              />
            </Field>
            <Field label="Repetir">
              <Select
                value={form.loop ? 'yes' : 'no'}
                onChange={(e) => setForm((state) => ({ ...state, loop: e.target.value === 'yes' }))}
              >
                <option value="yes">En bucle</option>
                <option value="no">Una vez</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar secuencia"
        message={deleting ? `Se eliminará "${deleting.name}".` : ''}
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
