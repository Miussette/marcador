import { useEffect, useState } from 'react'
import { Keyboard, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Form'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { toast } from '@/stores/toastStore'
import type { ShortcutBinding } from '@/types'
import { EXTRA_SHORTCUT_ACTIONS } from '@/utils/shortcuts'

const ACTION_OPTIONS = [
  ...EXTRA_SHORTCUT_ACTIONS,
  { value: 'goal.home', label: 'Gol local' },
  { value: 'goal.away', label: 'Gol visitante' },
  { value: 'goal.removeHome', label: 'Restar puntuaci?n local' },
  { value: 'goal.removeAway', label: 'Restar puntuaci?n visitante' },
  { value: 'clock.toggle', label: 'Iniciar / pausar cronómetro' },
  { value: 'clock.reset', label: 'Reiniciar cronómetro' },
  { value: 'display.fullscreen', label: 'Pantalla completa' },
  { value: 'event.add', label: 'Añadir evento' },
  { value: 'countdown.toggle', label: 'Mostrar / ocultar cuenta atrás' },
]

export function ShortcutsPage() {
  const { items, loading, loaded, create, update, remove } = useShortcutsStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<ShortcutBinding | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ action: 'goal.home', keys: '', enabled: true })

  useEffect(() => {
    void useShortcutsStore.getState().load()
  }, [])

  const saveShortcut = async (): Promise<void> => {
    if (!form.action) {
      toast.error('Selecciona una acción.')
      return
    }
    if (!form.keys.trim()) {
      toast.error('Asigna una tecla o combinación.')
      return
    }
    setSaving(true)
    try {
      const item = await create({
        action: form.action,
        keys: form.keys.trim(),
        enabled: form.enabled,
      })
      if (item) {
        setCreateOpen(false)
        setForm({ action: 'goal.home', keys: '', enabled: true })
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

  const toggleEnabled = async (item: ShortcutBinding): Promise<void> => {
    await update(item.id, { enabled: !item.enabled })
  }

  return (
    <div>
      <PageHeader
        title="Atajos configurables"
        description="Personaliza los atajos de teclado para operar el marcador."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Nuevo atajo
          </Button>
        }
      />

      {!loaded && loading ? (
        <LoadingBlock label="Cargando atajos…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Keyboard}
          title="Sin atajos"
          description="Crea atajos de teclado personalizados para operar el marcador más rápido."
          action={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              Nuevo atajo
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="card flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                  <Keyboard size={18} className="text-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {ACTION_OPTIONS.find((a) => a.value === item.action)?.label ?? item.action}
                  </p>
                  <p className="text-xs text-muted">{item.keys}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={item.enabled ? 'success' : 'default'}>{item.enabled ? 'Activo' : 'Inactivo'}</Badge>
                <Button size="sm" variant="secondary" onClick={() => void toggleEnabled(item)}>
                  {item.enabled ? 'Desactivar' : 'Activar'}
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
        title="Nuevo atajo"
        description="Asigna una tecla o combinación a una acción del marcador."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void saveShortcut()} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Acción">
            <Select value={form.action} onChange={(e) => setForm((state) => ({ ...state, action: e.target.value }))}>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tecla o combinación">
            <Input
              value={form.keys}
              onChange={(event) => setForm((state) => ({ ...state, keys: event.target.value }))}
              placeholder="Ej: Q, CTRL+Q, F11"
              autoFocus
            />
          </Field>
          <Field label="Estado">
            <Select
              value={form.enabled ? 'enabled' : 'disabled'}
              onChange={(e) => setForm((state) => ({ ...state, enabled: e.target.value === 'enabled' }))}
            >
              <option value="enabled">Activo</option>
              <option value="disabled">Inactivo</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar atajo"
        message="Se eliminará el atajo de teclado."
        confirmLabel="Eliminar"
        danger
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
