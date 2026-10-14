import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripHorizontal, Maximize2, Minimize2, Minus, X } from 'lucide-react'
import { api } from '@/services/api'

/**
 * "Chrome" de la ventana Display (que es un BrowserWindow sin bordes).
 *
 * - Barra superior con región de arrastre nativa (`-webkit-app-region: drag`):
 *   permite mover la ventana a otro monitor sin title bar.
 * - Botones minimizar / pantalla completa / cerrar (zona `no-drag`).
 * - Toma de redimensión en la esquina inferior derecha (solo en modo ventana).
 * - Aparece con el movimiento del ratón y se oculta sola a los pocos segundos
 *   para no interferir con la proyección.
 */

const HIDE_AFTER_MS = 2600
const MIN_SIZE = { width: 480, height: 300 }

const BUTTON_CLASS =
  'mp-no-drag rounded-md bg-white/10 p-1.5 text-white/70 transition-colors hover:bg-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

export function DisplayChrome() {
  const [visible, setVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)

  // Mantiene la barra visible mientras el operador mueve el ratón.
  const poke = useCallback(() => {
    setVisible(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS)
  }, [])

  useEffect(() => {
    poke()
    void api.display
      .isFullscreen()
      .then(setFullscreen)
      .catch(() => undefined)
    const offFullscreen = api.display.onFullscreen(setFullscreen)
    window.addEventListener('mousemove', poke)
    return () => {
      window.clearTimeout(hideTimer.current)
      window.removeEventListener('mousemove', poke)
      offFullscreen()
    }
  }, [poke])

  /** Redimensiona la ventana arrastrando la esquina inferior derecha. */
  const startResize = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (fullscreen) return
    event.preventDefault()
    const grip = event.currentTarget
    const startX = event.screenX
    const startY = event.screenY
    // En una ventana sin bordes el viewport es exactamente el tamaño de la
    // ventana (outerWidth incluye los bordes invisibles de Windows).
    const baseWidth = window.innerWidth
    const baseHeight = window.innerHeight
    grip.setPointerCapture(event.pointerId)

    let pending: { width: number; height: number } | null = null
    let frame = 0

    const onMove = (moveEvent: PointerEvent): void => {
      pending = {
        width: Math.max(MIN_SIZE.width, baseWidth + (moveEvent.screenX - startX)),
        height: Math.max(MIN_SIZE.height, baseHeight + (moveEvent.screenY - startY)),
      }
      // Limita la frecuencia de IPC al ritmo de repintado.
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (pending) {
          void api.display.setSize(pending)
          pending = null
        }
      })
    }
    const onEnd = (): void => {
      window.cancelAnimationFrame(frame)
      grip.removeEventListener('pointermove', onMove)
      grip.removeEventListener('pointerup', onEnd)
      grip.removeEventListener('pointercancel', onEnd)
    }
    grip.addEventListener('pointermove', onMove)
    grip.addEventListener('pointerup', onEnd)
    grip.addEventListener('pointercancel', onEnd)
  }

  const chromeClass = visible ? 'opacity-100' : 'pointer-events-none opacity-0'

  return (
    <>
      {/* Barra superior: mover la ventana + controles */}
      <div
        className={`fixed inset-x-0 top-0 z-[70] transition-opacity duration-300 ${chromeClass}`}
        data-testid="display-chrome"
      >
        <div className="mp-drag flex h-11 items-center justify-between border-b border-white/10 bg-[#0B0F14] px-3">
          <span className="flex select-none items-center gap-2 text-[11px] font-medium tracking-wide text-white/55">
            <GripHorizontal size={14} className="text-white/45" />
            {fullscreen ? 'Pantalla completa · F11 para restaurar' : 'Arrastra para mover la ventana'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Minimizar"
              aria-label="Minimizar"
              className={BUTTON_CLASS}
              onClick={() => void api.display.minimize()}
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              title={fullscreen ? 'Salir de pantalla completa (F11)' : 'Pantalla completa (F11)'}
              aria-label="Alternar pantalla completa"
              className={BUTTON_CLASS}
              onClick={() => {
                void api.display.toggleFullscreen().then(setFullscreen).catch(() => undefined)
              }}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              title="Cerrar pantalla"
              aria-label="Cerrar pantalla"
              className={`${BUTTON_CLASS} hover:bg-red-500/70 hover:text-white`}
              onClick={() => void api.display.close()}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Esquina inferior derecha: redimensionar (solo en modo ventana) */}
      {!fullscreen ? (
        <div
          role="separator"
          aria-label="Redimensionar ventana"
          title="Arrastra para redimensionar"
          onPointerDown={startResize}
          className={`fixed bottom-1 right-1 z-[70] h-6 w-6 transition-opacity duration-300 ${chromeClass}`}
        >
          <span className="mp-no-drag absolute bottom-0 right-0 h-3.5 w-3.5 border-b-2 border-r-2 border-white/35" />
        </div>
      ) : null}
    </>
  )
}
