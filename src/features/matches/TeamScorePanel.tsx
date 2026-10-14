import { Minus, Plus } from 'lucide-react'
import { TeamBadge } from '@/components/TeamBadge'
import type { Team } from '@/types'

interface TeamScorePanelProps {
  side: 'home' | 'away'
  team: Team | null
  score: number
  disabled?: boolean
  /** Etiqueta del botón de suma: 'Gol' (fútbol) o 'Punto' (vóleibol…). */
  pointLabel?: string
  onAddGoal: () => void
  onRemoveGoal: () => void
}

export function TeamScorePanel({ side, team, score, disabled, pointLabel, onAddGoal, onRemoveGoal }: TeamScorePanelProps) {
  const isHome = side === 'home'
  const addLabel = pointLabel ?? 'Gol'
  const isPoint = pointLabel !== undefined

  return (
    <section className="card relative flex flex-col items-center gap-5 overflow-hidden p-6">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: team?.primaryColor ?? '#2563EB' }}
        aria-hidden
      />

      <p className="label-muted">{isHome ? 'Local' : 'Visitante'}</p>

      <TeamBadge team={team} size="xl" />

      <div className="text-center">
        <h2 className="text-xl font-bold leading-tight text-ink">{team?.name ?? 'Por definir'}</h2>
        <p className="mt-1 text-xs text-muted">
          {team ? [team.city, team.country].filter(Boolean).join(', ') || team.code || '—' : 'Equipo no disponible'}
        </p>
      </div>

      <div
        key={score}
        className="font-mono text-[5.5rem] leading-none font-black tabular-nums text-ink animate-score"
        aria-label={`Marcador ${side === 'home' ? 'local' : 'visitante'}`}
      >
        {score}
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onAddGoal}
          disabled={disabled}
          className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl bg-success text-sm font-black uppercase tracking-wide text-white transition-transform hover:bg-green-600 active:scale-[0.98] disabled:opacity-50"
        >
          <Plus size={22} />
          {addLabel} {isHome ? 'local' : 'visitante'}
        </button>
        <button
          type="button"
          onClick={onRemoveGoal}
          disabled={disabled || score <= 0}
          className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 text-sm font-black uppercase tracking-wide text-muted transition-colors hover:border-danger/50 hover:text-danger active:scale-[0.98] disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
        >
          <Minus size={22} />
          {isPoint ? `Restar ${addLabel.toLowerCase()}` : 'Restar gol'}
        </button>
      </div>
    </section>
  )
}
