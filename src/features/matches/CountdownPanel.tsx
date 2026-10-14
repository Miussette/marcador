import { useEffect, useState } from 'react'
import { Eye, EyeOff, Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { useTicker } from '@/features/timer/useTicker'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { countdownRemaining, useCountdownStore } from '@/stores/countdownStore'
import { formatClock } from '@/utils/time'
import { cn } from '@/utils/cn'

/**
 * Panel "Cuenta atrás" (estilo Ultra Score): Reset / Ejecutar / Modificar
 * con control Mostrar-Ocultar en la ventana Display.
 * El estado se calcula por timestamps y se persiste en settings.
 */
export function CountdownPanel() {
  const state = useCountdownStore()
  const [minutes, setMinutes] = useState('5')
  const [seconds, setSeconds] = useState('00')

  // Carga lo persistido (una sola vez).
  useEffect(() => {
    void useCountdownStore.getState().init()
  }, [])

  // Sincroniza los inputs del editor cuando cambia la duración guardada.
  useEffect(() => {
    setMinutes(String(Math.floor(state.durationMs / 60_000)))
    setSeconds(String(Math.floor((state.durationMs % 60_000) / 1000)).padStart(2, '0'))
  }, [state.durationMs])

  // Propaga cualquier cambio a la ventana Display (si hay partido activo).
  useEffect(() => {
    useActiveMatchStore.getState().syncNow()
  }, [state.initialized, state.durationMs, state.running, state.endAt, state.remainingMs, state.visible])

  // Refresco fino mientras corre + parada automática al llegar a cero.
  const tick = useTicker(state.running ? 100 : 1000)
  useEffect(() => {
    if (state.running && countdownRemaining(state) <= 0) {
      useCountdownStore.getState().settle()
    }
  }, [tick, state.running, state.endAt, state.remainingMs])

  const remaining = countdownRemaining(state)
  const expired = !state.running && remaining <= 0
  const progress = state.durationMs > 0 ? Math.min(1, remaining / state.durationMs) : 0

  const applyDuration = (): void => {
    const m = Math.max(0, Number.parseInt(minutes, 10) || 0)
    const s = Math.min(59, Math.max(0, Number.parseInt(seconds, 10) || 0))
    useCountdownStore.getState().setDuration(m * 60_000 + s * 1000)
  }

  return (
    <section className="card p-4" data-testid="countdown-panel">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="label-muted flex items-center gap-2">
          <Timer size={14} />
          Cuenta atrás
        </p>
        <button
          type="button"
          onClick={() => useCountdownStore.getState().toggleVisible()}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
            state.visible
              ? 'border-primary/60 bg-primary/15 text-blue-300'
              : 'border-line bg-app text-muted hover:text-ink',
          )}
          title={state.visible ? 'Ocultar de la pantalla' : 'Mostrar en la pantalla'}
        >
          {state.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          {state.visible ? 'En pantalla' : 'Oculta'}
        </button>
      </div>

      <div
        className={cn(
          'text-center font-mono text-5xl leading-none font-black tabular-nums',
          expired ? 'text-danger' : 'text-ink',
        )}
        data-testid="countdown-time"
      >
        {expired ? '¡TIEMPO!' : formatClock(remaining)}
      </div>

      {/* Progreso */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full transition-[width] duration-200', expired ? 'bg-danger' : 'bg-primary')}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Acciones */}
      <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-2">
        {state.running ? (
          <Button
            variant="warning"
            size="xl"
            icon={<Pause size={18} />}
            onClick={() => useCountdownStore.getState().pause()}
            block
          >
            Pausar
          </Button>
        ) : (
          <Button
            variant="primary"
            size="xl"
            icon={<Play size={18} />}
            onClick={() => useCountdownStore.getState().run()}
            block
          >
            {expired || remaining < state.durationMs ? 'Reanudar' : 'Ejecutar'}
          </Button>
        )}
        <Button
          variant="danger"
          size="xl"
          icon={<RotateCcw size={18} />}
          onClick={() => useCountdownStore.getState().reset()}
        >
          Reset
        </Button>
      </div>

      {/* Modificar duración */}
      <div className="mt-4 border-t border-line pt-4">
        <p className="label-muted mb-2">Modificar</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={120}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="text-center font-mono"
            aria-label="Minutos"
          />
          <span className="font-bold text-muted">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(event) => setSeconds(event.target.value)}
            className="text-center font-mono"
            aria-label="Segundos"
          />
          <Button variant="secondary" onClick={applyDuration}>
            Aplicar
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted" data-testid="countdown-duration">
          Duración actual: {formatClock(state.durationMs)}
        </p>
      </div>
    </section>
  )
}
