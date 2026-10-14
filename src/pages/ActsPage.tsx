import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Textarea } from '@/components/ui/Form'
import { useActsStore } from '@/stores/actsStore'
import { api } from '@/services/api'
import { toast } from '@/stores/toastStore'
import type { MatchAct } from '@/types'

export function ActsPage() {
  const { matchId = '' } = useParams()
  const { items, loading, loaded, create, remove } = useActsStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<MatchAct | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [content, setContent] = useState('')

  useEffect(() => {
    void useActsStore.getState().load(matchId)
  }, [matchId])

  const exportPdf = async (act: MatchAct): Promise<void> => {
    setExportingId(act.id)
    try {
      const result = await api.acts.exportPdf(act.id)
      if (result.ok && result.filePath) {
        toast.success(`Acta guardada en ${result.filePath}`)
      } else if (!result.canceled) {
        toast.error(result.error ?? 'No se pudo generar el PDF.')
      }
    } catch (error) {
      toast.error(error)
    } finally {
      setExportingId(null)
    }
  }

  const saveAct = async (): Promise<void> => {
    if (!content.trim()) {
      toast.error('El contenido del acta es obligatorio.')
      return
    }
    setSaving(true)
    try {
      const item = await create({
        matchId,
        content: content.trim(),
      })
      if (item) {
        setCreateOpen(false)
        setContent('')
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
      <PageHeader
        title="Actas de partido"
        description="Genera y gestiona actas de partido en formato PDF."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nuevo acta
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando actas…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin actas"
          description="Crea actas de partido para documentar los encuentros."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nuevo acta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink">Acta del partido</h3>
                  <p className="mt-1 text-xs text-muted">
                    Creada: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge tone="primary">
                  <FileText size={10} /> PDF
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  block
                  icon={<FileText size={14} />}
                  loading={exportingId === item.id}
                  disabled={exportingId !== null && exportingId !== item.id}
                  onClick={() => void exportPdf(item)}
                >
                  Exportar PDF
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
        title="Nuevo acta"
        description="Redacta el contenido del acta de partido."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveAct()} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Contenido del acta">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Redacta el contenido del acta de partido…"
            rows={10}
            autoFocus
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar acta"
        message="Se eliminará el acta de partido."
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
