import { useContentPlayback } from '@/features/display/useContentPlayback'
import { api } from '@/services/api'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Form'
import { useSponsorsStore } from '@/stores/sponsorsStore'
import { useMediaStore } from '@/stores/mediaStore'
import { toast } from '@/stores/toastStore'
import type { SponsorRotation } from '@/types'

export function SponsorsPage() {
  const { projectId = '' } = useParams()
  const playback = useContentPlayback()
  const { items, loading, loaded, create, remove } = useSponsorsStore()
  const mediaItems = useMediaStore((state) => state.items)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<SponsorRotation | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', imageIds: [] as string[], intervalSec: 10, active: false })

  useEffect(() => {
    void useSponsorsStore.getState().load(projectId)
    void useMediaStore.getState().load(projectId)
  }, [projectId])

  const saveRotation = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast.error('Asigna un nombre a la rotación.')
      return
    }
    if (form.imageIds.length === 0) {
      toast.error('Selecciona al menos una imagen.')
      return
    }
    setSaving(true)
    try {
      const item = await create({
        name: form.name.trim(),
        imageIds: form.imageIds,
        intervalSec: form.intervalSec,
        active: form.active,
      })
      if (item) {
        setCreateOpen(false)
        setForm({ name: '', imageIds: [], intervalSec: 10, active: false })
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

  const imageItems = mediaItems.filter((item) => item.kind === 'image')

  return (
    <div>
      <div className="mb-3 flex justify-end"><Button variant="outline" size="sm" onClick={() => void api.display.stopContent().catch(toast.error)}>Detener contenido / volver al marcador</Button></div>
      <PageHeader
        title="Rotación de sponsors"
        description="Configura la rotación automática de imágenes de sponsors en la pantalla externa."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nueva rotación
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando rotaciones…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Sin rotaciones"
          description="Crea rotaciones de imágenes de sponsors para mostrar automáticamente en la pantalla externa."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nueva rotación
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
                    {item.imageIds.length} imágenes · {item.intervalSec}s intervalo
                  </p>
                </div>
                <Badge tone={playback?.sourceKind === 'sponsor' && playback.sourceId === item.id ? 'success' : 'default'}>
                  {playback?.sourceKind === 'sponsor' && playback.sourceId === item.id ? 'Reproduciendo' : 'Detenida'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" icon={<RefreshCw size={14} />} block onClick={() => void (playback?.sourceKind === 'sponsor' && playback.sourceId === item.id ? api.display.stopContent() : api.display.playContent('sponsor', item.id)).catch(toast.error)}>
                  {playback?.sourceKind === 'sponsor' && playback.sourceId === item.id ? 'Detener' : 'Activar'}
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
        title="Nueva rotación"
        description="Selecciona imágenes de sponsors y configura la rotación automática."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveRotation()} loading={saving}>
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
              placeholder="Sponsors principales"
              autoFocus
            />
          </Field>

          <Field label="Imágenes de sponsors">
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-app p-2">
              {imageItems.length === 0 ? (
                <p className="p-2 text-xs text-muted">No hay imágenes. Añade algunas en Multimedia primero.</p>
              ) : (
                imageItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={form.imageIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm((state) => ({ ...state, imageIds: [...state.imageIds, item.id] }))
                        } else {
                          setForm((state) => ({
                            ...state,
                            imageIds: state.imageIds.filter((id) => id !== item.id),
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
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar rotación"
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
