import { useState } from 'react'
import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import type { Match, MatchPeriod, MatchStatus } from '@/types'
import { PERIODS } from '@/types'
import { formatClock } from '@/utils/time'
import { cn } from '@/utils/cn'

interface TimerPanelProps {
  match: Match
  elapsedMs: number
  disabled?: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onAdjust: (deltaMs: number) => void
  onSetPeriod: (period: MatchPeriod) => void
  onSetStatus: (status: MatchStatus) => void
  onAdjustAdded: (delta: number) => void
}

const STATUS_OPTIONS: { id: MatchStatus; label: string }[] = [
  { id: 'scheduled', label: 'Programado' },
  { id: 'live', label: 'En juego' },
  { id: 'finished', label: 'Finalizado' },
]

export function TimerPanel({
  match,
  elapsedMs,
  disabled,
  onStart,
  onPause,
  onResume,
  onReset,
  onAdjust,
  onSetPeriod,
  onSetStatus,
  onAdjustAdded,
}: TimerPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false)

  const running = match.timerRunning
  const finished = match.status === 'finished'
  const primaryAction = running ? (
    <Button variant="warning" size="xl" icon={<Pause size={20} />} onClick={onPause} disabled={disabled} block>
      Pausar
    </Button>
  ) : match.timerElapsed > 0 ? (
    <Button variant="success" size="xl" icon={<Play size={20} />} onClick={onResume} disabled={disabled || finished} block>
      Reanudar
    </Button>
  ) : (
    <Button variant="primary" size="xl" icon={<Play size={20} />} onClick={onStart} disabled={disabled || finished} block>
      Iniciar
    </Button>
  )

  return (
    <section className="card flex w-full flex-col items-center gap-5 border-t-2 border-primary/60 p-6 lg:w-[380px]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            running ? 'bg-danger animate-pulse-dot' : 'bg-muted/50',
          )}
        />
        <p className="label-muted">{running ? 'Cronómetro en marcha' : 'Cronómetro detenido'}</p>
      </div>

      <div className="font-mono text-7xl leading-none font-black tabular-nums text-ink">
        {formatClock(elapsedMs)}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-blue-300 uppercase tracking-wide">
          {PERIODS.find((p) => p.id === match.period)?.short ?? match.period}
        </span>
        {match.addedTime > 0 ? (
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
            +{match.addedTime} añadido
          </span>
        ) : null}
      </div>

      <div className="grid w-full grid-cols-[1.4fr_1fr] gap-2">
        {primaryAction}
        <Button variant="danger" size="xl" icon={<RotateCcw size={18} />} onClick={() => setConfirmReset(true)} disabled={disabled}>
          Reiniciar
        </Button>
      </div>

      {finished && !running ? (
        <p className="text-center text-xs leading-relaxed text-muted">
          Partido finalizado: el cronómetro está bloqueado. Cambia el estado a «En juego» para controlarlo.
        </p>
      ) : null}

      <div className="grid w-full grid-cols-2 gap-2">
        <Button variant="secondary" icon={<Minus size={16} />} onClick={() => onAdjust(-60_000)} disabled={disabled}>
          −1 minuto
        </Button>
        <Button variant="secondary" icon={<Plus size={16} />} onClick={() => onAdjust(60_000)} disabled={disabled}>
          +1 minuto
        </Button>
      </div>

      <div className="w-full space-y-3 border-t border-line pt-4">
        <div>
          <p className="label-muted mb-1.5">Periodo</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                disabled={disabled}
                onClick={() => onSetPeriod(period.id)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                  match.period === period.id
                    ? 'border-primary/60 bg-primary/15 text-blue-300'
                    : 'border-line bg-app text-muted hover:text-ink',
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-muted mb-1.5">Estado del partido</p>
          <div className="grid grid-cols-3 gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onSetStatus(option.id)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                  match.status === option.id
                    ? 'border-primary/60 bg-primary/15 text-blue-300'
                    : 'border-line bg-app text-muted hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-muted mb-1.5">Tiempo añadido</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onAdjustAdded(-1)} disabled={disabled || match.addedTime <= 0} block>
              <Minus size={16} />
            </Button>
            <span className="min-w-14 text-center font-mono text-xl font-bold tabular-nums text-ink">
              {match.addedTime}
            </span>
            <Button
              variant="secondary"
              onClick={() => onAdjustAdded(1)}
              disabled={disabled || match.addedTime >= 20}
              block
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reiniciar cronómetro"
        message="El tiempo registrado volverá a 00:00. Esta acción no se puede deshacer."
        confirmLabel="Reiniciar"
        danger
        onConfirm={() => {
          setConfirmReset(false)
          onReset()
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  )
}
