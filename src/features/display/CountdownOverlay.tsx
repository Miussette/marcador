import { Timer } from 'lucide-react'
import type { CountdownSnapshot } from '@/types'
import { formatClock } from '@/utils/time'
import { cn } from '@/utils/cn'

interface CountdownOverlayProps {
  countdown: CountdownSnapshot
  /** Timestamp del tick actual (para derivar el tiempo restante). */
  now: number
}

/**
 * Cuenta atrás visible en la ventana Display.
 * Se dibuja como pastilla centrada arriba (bajo la barra de control)
 * y calcula el restante localmente a partir de `endAt`.
 */
export function CountdownOverlay({ countdown, now }: CountdownOverlayProps) {
  if (!countdown.visible) return null

  const remaining =
    countdown.running && countdown.endAt !== null
      ? Math.max(0, countdown.endAt - now)
      : Math.max(0, countdown.remainingMs)
  const expired = remaining <= 0

  return (
    <div className="pointer-events-none fixed left-1/2 top-14 z-40 -translate-x-1/2" data-testid="countdown-overlay">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-app px-5 py-2.5 shadow-2xl">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            expired ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary',
          )}
        >
          <Timer size={18} />
        </span>
        <div>
          <p className="label-muted">Cuenta atrás</p>
          <p
            className={cn(
              'font-mono text-3xl leading-none font-black tabular-nums',
              expired ? 'text-danger' : 'text-ink',
            )}
            data-testid="countdown-time"
          >
            {expired ? '¡TIEMPO!' : formatClock(remaining)}
          </p>
        </div>
        {countdown.running && !expired ? (
          <span className="h-2.5 w-2.5 rounded-full bg-danger animate-pulse-dot" />
        ) : null}
      </div>
    </div>
  )
}
