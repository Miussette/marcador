import { useEffect, useRef, useState } from 'react'
import { Camera, Maximize, X } from 'lucide-react'
import { api } from '@/services/api'
import type { DisplayState, OverlayPayload } from '@/types'
import { OverlayView } from '@/features/display/OverlayView'
import { useTicker } from '@/features/timer/useTicker'
import { timerElapsed } from '@/features/timer/timer'
import { displayClock, scoreText } from '@/features/sports/display'
import { formatClock } from '@/utils/time'

export function LiveApp() {
  const [state, setState] = useState<DisplayState | null>(null)
  const [overlay, setOverlay] = useState<OverlayPayload | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [controls, setControls] = useState(true)
  const [showScore, setShowScore] = useState(true)
  const video = useRef<HTMLVideoElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tick = useTicker(100)
  const refreshDevices = async () => {
    try { setDevices((await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput')) }
    catch { setError('No se pudo leer la lista de cámaras.') }
  }
  useEffect(() => {
    let alive = true, version = 0
    void api.display.getState().then(next => { if (alive && version === 0) setState(next) })
    const off = api.display.onState(next => { version++; setState(next) })
    let overlayTimer: ReturnType<typeof setTimeout> | undefined
    let overlayVersion = 0
    const applyOverlay = (next: OverlayPayload | null) => {
      clearTimeout(overlayTimer); setOverlay(next)
      if (next) overlayTimer = setTimeout(() => setOverlay(null), next.durationMs)
    }
    const offOverlay = api.display.onOverlay(next => { overlayVersion++; applyOverlay(next) })
    void api.display.getOverlay().then(next => { if (alive && overlayVersion === 0) applyOverlay(next) })
    void api.settings.get('live.cameraId').then(id => { if (alive) setDeviceId(id ?? '') })
    void refreshDevices()
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'F11') { event.preventDefault(); void api.screens.toggleLiveFullscreen() }
      if (event.key === 'Escape') setControls(true)
    }
    window.addEventListener('keydown', keys)
    return () => { alive = false; off(); offOverlay(); clearTimeout(overlayTimer); if (hideTimer.current) clearTimeout(hideTimer.current); navigator.mediaDevices.removeEventListener('devicechange', refreshDevices); window.removeEventListener('keydown', keys) }
  }, [])
  useEffect(() => {
    if (!enabled) { setConnected(false); return }
    let disposed = false, stream: MediaStream | null = null
    setError(''); setConnected(false)
    void navigator.mediaDevices.getUserMedia({ audio: false, video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 } } }).then(async next => {
      if (disposed) { next.getTracks().forEach(track => track.stop()); return }
      stream = next
      const element = video.current
      if (!element) { next.getTracks().forEach(track => track.stop()); return }
      element.srcObject = next; await element.play()
      if (disposed) return
      next.getVideoTracks()[0]?.addEventListener('ended', () => { if (!disposed) { setConnected(false); setError('La cámara se desconectó. Detén y vuelve a iniciar la cámara.'); setControls(true) } })
      setConnected(true); void refreshDevices()
    }).catch(reason => {
      if (disposed) return
      stream?.getTracks().forEach(track => track.stop())
      setConnected(false); setEnabled(false)
      setError(reason.name === 'NotAllowedError' ? 'Windows no permitió acceder a la cámara. Revisa los permisos de cámara.' : reason.name === 'NotFoundError' || reason.name === 'OverconstrainedError' ? 'La cámara seleccionada no está disponible. Selecciona otra cámara.' : 'No se pudo iniciar la cámara. Puede estar ocupada por otra aplicación.'); setControls(true)
    })
    return () => { disposed = true; stream?.getTracks().forEach(track => track.stop()); if (video.current) video.current.srcObject = null }
  }, [enabled, deviceId])
  const reveal = () => {
    setControls(true); if (hideTimer.current) clearTimeout(hideTimer.current)
    if (connected) hideTimer.current = setTimeout(() => setControls(false), 4000)
  }
  const elapsed = state ? displayClock(state, timerElapsed(state.timer, tick)) : 0
  const button = 'rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700'
  return <div className="relative h-screen w-screen overflow-hidden bg-black text-white" onMouseMove={reveal}>
    <video ref={video} autoPlay muted playsInline className="h-full w-full object-contain" />
    {!connected && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-12 text-center"><Camera size={64} className="text-slate-500" /><h1 className="text-3xl font-bold">Cámara en vivo + OBS</h1><p className="max-w-xl text-slate-400">Selecciona una cámara e inicia la imagen. Para ver la mezcla de OBS, activa su cámara virtual y selecciona «OBS Virtual Camera».</p>{error && <p className="max-w-xl text-red-300" role="alert">{error}</p>}</div>}
    {state && showScore && connected && <div className="absolute bottom-[4vh] left-[4vw] max-w-[92vw] rounded-xl border border-white/20 bg-slate-950/90 px-[2vw] py-[1vh] shadow-xl"><p className="truncate text-[1.2vw] text-slate-300">{state.competition} · {state.periodLabel}</p><div className="flex items-center gap-[2vw] text-[2.5vw] font-bold"><span>{state.home?.shortName || state.home?.name || 'Local'}</span><span className="font-mono">{scoreText(state, 'home')} – {scoreText(state, 'away')}</span><span>{state.away?.shortName || state.away?.name || 'Visitante'}</span><span className="font-mono text-amber-300">{formatClock(elapsed)}</span></div>{state.sportState?.family === 'tennis' && <p className="text-[1.2vw]">Juegos {state.sportState.current.games.join('–')}</p>}</div>}
    {overlay && <OverlayView payload={overlay} />}
    {controls && <div className="absolute inset-x-0 top-0 z-50 flex flex-wrap items-center gap-3 bg-slate-950/95 p-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <span className="text-sm font-bold">Pantalla 3 · Cámara / OBS</span>
      <div className="flex flex-wrap items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }}>
        <select aria-label="Cámara" className={button} value={deviceId} onChange={e => { setDeviceId(e.target.value); void api.settings.set('live.cameraId', e.target.value) }}><option value="">Cámara predeterminada</option>{devices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Cámara ${i + 1}`}</option>)}</select>
        <button className={button} onClick={() => void refreshDevices()}>Actualizar cámaras</button>
        <button className={button} onClick={() => setEnabled(!enabled)}>{enabled ? 'Detener cámara' : 'Iniciar cámara'}</button>
        <button className={button} onClick={() => setShowScore(!showScore)}>{showScore ? 'Ocultar marcador' : 'Mostrar marcador'}</button>
        <button className={button} onClick={() => void api.screens.toggleLiveFullscreen()} aria-label="Pantalla completa"><Maximize size={18} /></button>
        <button className={button} onClick={() => setControls(false)}>Ocultar controles</button>
        <button className={button} onClick={() => void api.screens.closeLive()} aria-label="Cerrar cámara"><X size={18} /></button>
      </div>
      <span className={`text-xs ${connected ? 'text-green-300' : 'text-slate-400'}`}>{connected ? 'Cámara activa · sin audio' : enabled ? 'Conectando…' : 'Cámara detenida'}</span>
    </div>}
  </div>
}
