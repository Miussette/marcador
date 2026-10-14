import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { api } from '@/services/api'
import { toast } from '@/stores/toastStore'
import { useHornStore } from '@/stores/hornStore'
import { DEFAULT_HORN, HORN_SETTING_KEY, parseHorn, validateHorn, type HornConfig } from './horn'

export function SerialHornPanel() {
  const horn = useHornStore()
  const [config, setConfig] = useState<HornConfig>({ ...DEFAULT_HORN })
  const [portName, setPortName] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    let cancelled = false
    void Promise.all([api.settings.get(HORN_SETTING_KEY), api.settings.get('horn.port')]).then(([raw, name]) => {
      if (cancelled) return
      setConfig(parseHorn(raw)); setPortName(name ?? ''); setReady(true)
    }).catch(toast.error)
    return () => { cancelled = true }
  }, [])
  const patch = (changes: Partial<HornConfig>) => { setConfig(current => ({ ...current, ...changes })); setDirty(true) }
  const save = async () => {
    setSaving(true)
    try {
      validateHorn(config)
      await api.settings.set(HORN_SETTING_KEY, JSON.stringify(config))
      await api.settings.set('horn.port', portName.trim())
      setDirty(false); toast.success('Configuración de bocina guardada.')
    } catch (error) { toast.error(error) } finally { setSaving(false) }
  }
  const disabled = !ready || saving || horn.busy || horn.connected
  return <section className="card p-5">
    <p className="label-muted mb-4">Bocina por USB / puerto COM</p>
    <p className="mb-3 text-xs text-muted">{horn.connected ? `Conectado: ${horn.portName}` : 'Desconectado'} · Envía una orden al controlador de la bocina.</p>
    <fieldset disabled={disabled} className="grid grid-cols-2 gap-3 disabled:opacity-60">
      <Field label="Puerto COM" hint="Vacío: elegir entre los puertos detectados al conectar."><Input placeholder="COM3" value={portName} onChange={e => { setPortName(e.target.value); setDirty(true) }} /></Field>
      <Field label="Baudios"><Input type="number" min={1} max={4000000} value={config.baudRate} onChange={e => patch({ baudRate: Number(e.target.value) })} /></Field>
      <Field label="Bits de datos"><Select value={config.dataBits} onChange={e => patch({ dataBits: Number(e.target.value) as 7 | 8 })}><option value={7}>7</option><option value={8}>8</option></Select></Field>
      <Field label="Bits de parada"><Select value={config.stopBits} onChange={e => patch({ stopBits: Number(e.target.value) as 1 | 2 })}><option value={1}>1</option><option value={2}>2</option></Select></Field>
      <Field label="Paridad"><Select value={config.parity} onChange={e => patch({ parity: e.target.value as HornConfig['parity'] })}><option value="none">Sin paridad</option><option value="even">Par</option><option value="odd">Impar</option></Select></Field>
      <Field label="Control de flujo"><Select value={config.flowControl} onChange={e => patch({ flowControl: e.target.value as HornConfig['flowControl'] })}><option value="none">Ninguno</option><option value="hardware">RTS/CTS</option></Select></Field>
      <Field label="Texto de activación"><Input value={config.command} maxLength={1024} onChange={e => patch({ command: e.target.value })} /></Field>
      <Field label="Terminación"><Select value={config.ending} onChange={e => patch({ ending: e.target.value as HornConfig['ending'] })}><option value="none">Ninguna</option><option value="cr">CR</option><option value="lf">LF</option><option value="crlf">CR + LF</option></Select></Field>
    </fieldset>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button disabled={disabled || !dirty} onClick={() => void save()}>Guardar</Button>
      {horn.connected ? <Button variant="secondary" disabled={horn.busy} onClick={() => void horn.disconnect()}>Desconectar</Button> : <Button variant="secondary" disabled={!ready || dirty || saving || horn.busy} onClick={() => void horn.connect().then(() => { if (useHornStore.getState().connected) setPortName(useHornStore.getState().portName) })}>Conectar</Button>}
      <Button variant="secondary" disabled={!horn.connected || horn.busy || dirty} onClick={() => void horn.send()}>Probar bocina</Button>
    </div>
    {dirty && <p className="mt-2 text-xs text-warning">Guarda los cambios antes de conectar.</p>}
    {horn.error && <p role="alert" className="mt-3 text-xs text-danger">{horn.error}</p>}
    <Field label="Respuesta del dispositivo" className="mt-3"><pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-line p-2 text-xs">{horn.received || 'Sin datos recibidos'}</pre></Field>
  </section>
}
