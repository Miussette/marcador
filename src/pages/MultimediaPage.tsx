import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ImagePlus, Images, MonitorPlay, Send, Trash2, Type } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Form'
import { useDisplayStore } from '@/stores/displayStore'
import { useMediaStore } from '@/stores/mediaStore'
import { toast } from '@/stores/toastStore'
import { api } from '@/services/api'
import type { MediaItem } from '@/types'
import { cn } from '@/utils/cn'

const PRESETS = ['¡GOOOL!', 'TIEMPO MUERTO', 'DESCANSO', '¡FINAL DEL PARTIDO!']

export function MultimediaPage() {
  const { projectId = '' } = useParams()
  const { items, loading, loaded, create, remove, showOnDisplay, showText } = useMediaStore()
  const display = useDisplayStore()

  const [message, setMessage] = useState('')
  const [duration, setDuration] = useState(5)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<MediaItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [imageForm, setImageForm] = useState({ name: '', dataUrl: null as string | null, duration: 5 })
  const [picking, setPicking] = useState(false)
  const [savingImage, setSavingImage] = useState(false)

  useEffect(() => {
    void useMediaStore.getState().load(projectId)
  }, [projectId])

  const sendMessage = async (text: string): Promise<void> => {
    if (!text.trim()) return
    await showText(text.trim(), duration)
    setMessage('')
  }

  const pickImage = async (): Promise<void> => {
    setPicking(true)
    try {
      const dataUrl = await api.files.pickImage()
      if (dataUrl) setImageForm((state) => ({ ...state, dataUrl }))
    } catch (error) {
      toast.error(error)
    } finally {
      setPicking(false)
    }
  }

  const saveImage = async (): Promise<void> => {
    if (!imageForm.dataUrl) {
      toast.error('Selecciona una imagen primero.')
      return
    }
    if (!imageForm.name.trim()) {
      toast.error('Asigna un nombre al elemento.')
      return
    }
    setSavingImage(true)
    try {
      const item = await create({
        name: imageForm.name.trim(),
        kind: 'image',
        data: imageForm.dataUrl,
        duration: imageForm.duration,
      })
      if (item) {
        setImageModalOpen(false)
        setImageForm({ name: '', dataUrl: null, duration: 5 })
      }
    } finally {
      setSavingImage(false)
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
      <PageHeader
        title="Multimedia"
        description="Envía mensajes, imágenes y publicidad a la pantalla externa de forma temporal."
        actions={
          <>
            <Button variant="outline" icon={<MonitorPlay size={15} />} onClick={() => void display.refresh()} loading={display.loading}>
              {display.isOpen ? 'Pantalla conectada' : 'Sin pantalla'}
            </Button>
            <Button variant="primary" icon={<ImagePlus size={16} />} onClick={() => setImageModalOpen(true)}>
              Añadir imagen
            </Button>
          </>
        }
      />

      <section className="card mb-6 p-5">
        <p className="label-muted mb-3">Mensaje rápido</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => void sendMessage(preset)}
              className={cn(
                'rounded-lg border border-line bg-app px-3 py-2 text-xs font-bold text-ink transition-colors',
                'hover:border-primary/50 hover:text-blue-300',
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe un mensaje para la pantalla…"
            className="min-w-64 flex-1"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void sendMessage(message)
            }}
          />
          <Select value={String(duration)} onChange={(event) => setDuration(Number(event.target.value))} className="w-32">
            <option value="3">3 segundos</option>
            <option value="5">5 segundos</option>
            <option value="10">10 segundos</option>
            <option value="20">20 segundos</option>
          </Select>
          <Button variant="primary" icon={<Send size={15} />} onClick={() => void sendMessage(message)}>
            Enviar
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          El mensaje se superpone al marcador durante el tiempo indicado y luego vuelve automáticamente al marcador.
        </p>
      </section>

      {!loaded && loading ? (
        <LoadingBlock label="Cargando biblioteca…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Biblioteca vacía"
          description="Añade logotipos, banners de sponsors o imágenes de apoyo para mostrarlos en la pantalla externa."
          action={
            <Button variant="primary" icon={<ImagePlus size={16} />} onClick={() => setImageModalOpen(true)}>
              Añadir imagen
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className="card flex flex-col overflow-hidden">
              <div className="flex h-32 items-center justify-center overflow-hidden bg-app">
                {item.kind === 'image' && item.data ? (
                  <img src={item.data} alt={item.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="px-3 text-center text-sm font-bold text-ink">{item.data}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-ink" title={item.name}>
                    {item.name}
                  </p>
                  <Badge tone={item.kind === 'image' ? 'primary' : 'warning'}>
                    {item.kind === 'image' ? <ImagePlus size={10} /> : <Type size={10} />}
                    {item.kind === 'image' ? 'Imagen' : 'Texto'}
                  </Badge>
                </div>
                <div className="mt-auto flex gap-1.5">
                  <Button size="sm" variant="primary" block onClick={() => void showOnDisplay(item)}>
                    Mostrar {item.duration}s
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
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Añadir imagen"
        description="Se guardará localmente en la base de datos del proyecto."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImageModalOpen(false)} disabled={savingImage}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveImage()} loading={savingImage}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Nombre">
            <Input
              value={imageForm.name}
              onChange={(event) => setImageForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="Banner patrocinador"
              autoFocus
            />
          </Field>

          <div className="flex items-center gap-4">
            <div className="flex h-24 w-36 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-app">
              {imageForm.dataUrl ? (
                <img src={imageForm.dataUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[11px] text-muted">Sin imagen</span>
              )}
            </div>
            <Button variant="secondary" icon={<ImagePlus size={15} />} onClick={() => void pickImage()} loading={picking}>
              Seleccionar archivo
            </Button>
          </div>

          <Field label="Duración en pantalla">
            <Select
              value={String(imageForm.duration)}
              onChange={(event) =>
                setImageForm((state) => ({ ...state, duration: Number(event.target.value) }))
              }
            >
              <option value="3">3 segundos</option>
              <option value="5">5 segundos</option>
              <option value="10">10 segundos</option>
              <option value="20">20 segundos</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar elemento"
        message={deleting ? `Se eliminará "${deleting.name}" de la biblioteca multimedia.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
