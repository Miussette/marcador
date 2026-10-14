import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useHornStore } from '@/stores/hornStore'
import { SerialHornPanel } from './SerialHornPanel'
import { signalHorn } from './hornSound'

export function HornControls() {
  const horn = useHornStore()
  const [open, setOpen] = useState(false)
  return <>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="sm" disabled={horn.busy} onClick={() => void signalHorn()}>Bocina</Button>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Configurar bocina</Button>
      <span className="text-xs text-muted">{horn.connected ? `Conectada: ${horn.portName}` : 'Puerto desconectado'}</span>
      {horn.error && <span role="alert" className="text-xs text-danger">{horn.error}</span>}
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Configurar bocina" size="lg">
      {open && <SerialHornPanel />}
    </Modal>
  </>
}
