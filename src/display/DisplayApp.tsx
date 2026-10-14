import { SportDetails } from '@/features/sports/SportDetails'
import { displayClock } from '@/features/sports/display'
import { useEffect, useState } from 'react'
import { DisplayChrome } from '@/display/DisplayChrome'
import { CountdownOverlay } from '@/features/display/CountdownOverlay'
import { PlayersPresentation } from '@/features/display/PlayersPresentation'
import { OverlayView } from '@/features/display/OverlayView'
import { WaitingScreen } from '@/features/display/WaitingScreen'
import { BroadcastLayout } from '@/features/display/layouts/BroadcastLayout'
import { ClassicLayout } from '@/features/display/layouts/ClassicLayout'
import { DesignLayout } from '@/features/display/layouts/DesignLayout'
import { MinimalLayout } from '@/features/display/layouts/MinimalLayout'
import { ModernLayout } from '@/features/display/layouts/ModernLayout'
import { timerElapsed } from '@/features/timer/timer'
import { useTicker } from '@/features/timer/useTicker'
import { api } from '@/services/api'
import type { DisplayState, OverlayPayload } from '@/types'

/**
 * Ventana DISPLAY: solo muestra el marcador.
 * Recibe el estado por IPC y calcula el cronómetro localmente
 * a partir de timestamps (sin depender de la frecuencia de IPC).
 */
export function DisplayApp() {
  const [state, setState] = useState<DisplayState | null>(null)
  const [overlay, setOverlay] = useState<OverlayPayload | null>(null)
  const tick = useTicker(100)

  useEffect(() => {
    let overlayTimer: number | undefined

    void api.display
      .getState()
      .then((initial) => {
        if (initial) setState(initial)
      })
      .catch((error: unknown) => console.warn('[display] estado inicial:', error))

    let overlayVersion = 0
    const applyOverlay = (payload: OverlayPayload | null): void => {
      setOverlay(payload)
      window.clearTimeout(overlayTimer)
      if (payload) overlayTimer = window.setTimeout(() => {
        setOverlay(current => current?.id === payload.id ? null : current)
      }, payload.durationMs)
    }
    const offState = api.display.onState(next => setState(next))
    const offOverlay = api.display.onOverlay(payload => { overlayVersion += 1; applyOverlay(payload) })
    const initialVersion = overlayVersion
    void api.display.getOverlay().then(payload => { if (initialVersion === overlayVersion) applyOverlay(payload) }).catch(() => undefined)

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'F11') {
        event.preventDefault()
        void api.display.toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      offState()
      offOverlay()
      window.clearTimeout(overlayTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const elapsedMs = state ? displayClock(state, timerElapsed(state.timer, tick)) : 0

  return (
    <>
      {/* Ventana sin bordes: barra de arrastre + controles (se oculta sola) */}
      {document.documentElement.dataset.browserDisplay !== 'true' && <DisplayChrome />}
      {!state ? (
        <WaitingScreen />
      ) : state.design?.enabled && state.design.items.length > 0 ? (
        <DesignLayout state={state} elapsedMs={elapsedMs} />
      ) : state.layout === 'classic' ? (
        <ClassicLayout state={state} elapsedMs={elapsedMs} />
      ) : state.layout === 'modern' ? (
        <ModernLayout state={state} elapsedMs={elapsedMs} />
      ) : state.layout === 'minimal' ? (
        <MinimalLayout state={state} elapsedMs={elapsedMs} />
      ) : (
        <BroadcastLayout state={state} elapsedMs={elapsedMs} />
      )}
      {state?.sportState ? <SportDetails state={state} /> : null}
      {state?.showPlayers && state.sportState?.family !== 'athletics' && !(state.design?.enabled && (state.design.preset === 'fiba1' || state.design.preset === 'fiba2')) ? <PlayersPresentation state={state} /> : null}
      {state?.countdown ? <CountdownOverlay countdown={state.countdown} now={tick} /> : null}
      {overlay ? <OverlayView payload={overlay} /> : null}
    </>
  )
}
