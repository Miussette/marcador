import { useDisplayStore } from '@/stores/displayStore'
import { useEffect, useState } from 'react'
import { Camera, Monitor, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { api } from '@/services/api'
import { toast } from '@/stores/toastStore'
import type { DisplayInfo, ScreenAssignment } from '@/types'

export function ScreenSetup() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [assignment, setAssignment] = useState<ScreenAssignment>({ controlDisplayId: null, scoreboardDisplayId: null, liveDisplayId: null })
  const [busy, setBusy] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)
  const refresh = async () => {
    try {
      const [monitors, saved, open] = await Promise.all([api.display.listDisplays(), api.screens.getAssignment(), api.screens.liveIsOpen()])
      setDisplays(monitors); setAssignment(saved); setLiveOpen(open)
    } catch (error) { toast.error(error) }
  }
  useEffect(() => { void refresh() }, [])
  const run = async (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true)
    try { const result = await action(); if (!result.ok) throw new Error(result.error); toast.success('Distribución de pantallas preparada.'); setLiveOpen(await api.screens.liveIsOpen()); await useDisplayStore.getState().refresh() }
    catch (error) { toast.error(error) } finally { setBusy(false) }
  }
  const rows = [
    { key: 'controlDisplayId' as const, label: '1 · Control y configuración', icon: Settings2 },
    { key: 'scoreboardDisplayId' as const, label: '2 · Marcador', icon: Monitor },
    { key: 'liveDisplayId' as const, label: '3 · Cámara en vivo / OBS', icon: Camera },
  ]
  return <section className="card space-y-4 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Distribución de 3 pantallas</h2><Button size="sm" disabled={busy} onClick={() => void refresh()}>Detectar monitores</Button></div><p className="text-sm text-muted">Asigna un monitor distinto a cada salida. El marcador y la cámara se abren en pantalla completa; el control permanece en el monitor del operador.</p>
    <div className="grid gap-4 md:grid-cols-3">{rows.map(row => <label key={row.key} className="space-y-2"><span className="flex items-center gap-2 text-sm"><row.icon size={17} />{row.label}</span><Select disabled={busy} value={assignment[row.key] ?? ''} onChange={e => setAssignment({ ...assignment, [row.key]: e.target.value === '' ? null : Number(e.target.value) })}><option value="">Selecciona monitor</option>{displays.map(display => <option key={display.id} value={display.id}>{display.label} · {display.width}×{display.height}{display.primary ? ' · Principal' : ''}</option>)}</Select></label>)}</div>
    {displays.length < 3 && <p className="text-xs text-warning">Se detectaron {displays.length} monitores. Puedes probar las ventanas por separado; para la distribución completa conecta tres pantallas y usa el modo Extender de Windows.</p>}
    <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={busy || displays.length < 3} onClick={() => void run(() => api.screens.apply(assignment))}>Aplicar 3 pantallas</Button><Button disabled={busy} onClick={() => void run(() => api.display.open({ displayId: assignment.scoreboardDisplayId ?? undefined }))}>Abrir marcador</Button><Button disabled={busy} onClick={() => void run(() => api.screens.openLive(assignment.liveDisplayId ?? undefined))}>Abrir cámara / OBS</Button>{liveOpen && <Button variant="danger" disabled={busy} onClick={() => void api.screens.closeLive().then(() => setLiveOpen(false)).catch(error => toast.error(error))}>Cerrar cámara / OBS</Button>}</div>
    <p className="text-xs leading-relaxed text-muted">En la tercera ventana selecciona una webcam o capturadora. Para ver el programa de OBS, inicia su cámara virtual y selecciónala. Para enviar la cámara con marcador a OBS, añade una Captura de ventana y elige «Marcador Pro — Cámara y OBS»; oculta los controles antes de capturar. F11 cambia pantalla completa.</p>
  </section>
}
