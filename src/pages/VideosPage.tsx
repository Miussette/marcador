import { useContentPlayback } from '@/features/display/useContentPlayback'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Film, Play, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Form'
import { useVideosStore } from '@/stores/videosStore'
import { toast } from '@/stores/toastStore'
import { api } from '@/services/api'
import type { VideoItem } from '@/types'

export function VideosPage() {
  const { projectId = '' } = useParams()
  const playback = useContentPlayback()
  const { items, loading, loaded, create, remove } = useVideosStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<VideoItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', src: '', duration: 0 })

  useEffect(() => {
    void useVideosStore.getState().load(projectId)
  }, [projectId])

  const pickVideo = async (): Promise<void> => {
    setPicking(true)
    try {
      const result = await api.files.pickVideo()
      if (result) {
        setForm((state) => ({ ...state, src: result }))
      }
    } catch (error) {
      toast.error(error)
    } finally {
      setPicking(false)
    }
  }

  const saveVideo = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast.error('Asigna un nombre al video.')
      return
    }
    if (!form.src.trim()) {
      toast.error('Selecciona un archivo de video.')
      return
    }
    setSaving(true)
    try {
      const item = await create({
        name: form.name.trim(),
        src: form.src.trim(),
        duration: form.duration,
      })
      if (item) {
        setCreateOpen(false)
        setForm({ name: '', src: '', duration: 0 })
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
        title="Videos"
        description="Gestiona videos para reproducir en la pantalla externa."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Añadir video
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando videos…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Film}
          title="Sin videos"
          description="Añade videos para reproducir en la pantalla externa durante el partido."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Añadir video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className="card flex flex-col overflow-hidden">
              <div className="flex h-32 items-center justify-center overflow-hidden bg-app">
                <Film size={32} className="text-muted" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-ink" title={item.name}>
                    {item.name}
                  </p>
                  <Badge tone="primary">
                    <Film size={10} /> Video
                  </Badge>
                </div>
                <div className="mt-auto flex gap-1.5">
                  <Button size="sm" variant="primary" block icon={<Play size={14} />} onClick={() => void (playback?.sourceKind === 'video' && playback.sourceId === item.id ? api.display.stopContent() : api.display.playContent('video', item.id)).catch(toast.error)}>
                    {playback?.sourceKind === 'video' && playback.sourceId === item.id ? 'Detener' : 'Reproducir'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    icon={<Trash2 size={14} />}
                    onClick={() => setDeleting(item)}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Añadir video"
        description="Selecciona un archivo de video para reproducir en la pantalla externa."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveVideo()} loading={saving}>
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
              placeholder="Video de celebración"
              autoFocus
            />
          </Field>

          <div className="flex items-center gap-4">
            <div className="flex h-24 w-36 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-app">
              <Film size={24} className="text-muted" />
            </div>
            <Button variant="secondary" icon={<Film size={15} />} onClick={() => void pickVideo()} loading={picking}>
              Seleccionar archivo
            </Button>
          </div>

          <Field label="Duración (segundos)">
            <Input
              type="number"
              min={0}
              value={form.duration}
              onChange={(event) => setForm((state) => ({ ...state, duration: Number(event.target.value) }))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">Usa 0 para reproducir hasta el final del video.</p>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar video"
        message={deleting ? `Se eliminará "${deleting.name}" de la biblioteca.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
