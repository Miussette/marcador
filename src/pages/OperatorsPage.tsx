import { useEffect, useState } from 'react'
import { Plus, Trash2, User } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Form'
import { useOperatorsStore } from '@/stores/operatorsStore'
import { toast } from '@/stores/toastStore'
import type { OperatorProfile } from '@/types'

export function OperatorsPage() {
  const { items, loading, loaded, create, remove } = useOperatorsStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<OperatorProfile | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', email: '' })

  useEffect(() => {
    void useOperatorsStore.getState().load()
  }, [])

  const saveProfile = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    try {
      const item = await create({
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim(),
      })
      if (item) {
        setCreateOpen(false)
        setForm({ name: '', role: '', email: '' })
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
        title="Perfiles de operador"
        description="Gestiona los perfiles de los operadores del marcador."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nuevo operador
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando operadores…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={User}
          title="Sin operadores"
          description="Crea perfiles de operadores para identificar quién controla el marcador."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nuevo operador
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="card flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                  <User size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.role || 'Operador'} {item.email ? `· ${item.email}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="primary">Operador</Badge>
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
        title="Nuevo operador"
        description="Crea un perfil de operador del marcador."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveProfile()} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Nombre" required>
            <Input
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="Juan Pérez"
              autoFocus
            />
          </Field>
          <Field label="Rol">
            <Input
              value={form.role}
              onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}
              placeholder="Operador principal"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              placeholder="juan@ejemplo.com"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar operador"
        message={deleting ? `Se eliminará el perfil de "${deleting.name}".` : ''}
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
