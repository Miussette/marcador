import { downTimerRemaining } from '@/features/timer/timer'
import type { DisplayState } from '@/types'

export interface LayoutProps {
  state: DisplayState
  elapsedMs: number
}

export function TeamLogo({ state, side, className }: { state: DisplayState; side: 'home' | 'away'; className?: string }) {
  const team = side === 'home' ? state.home : state.away
  if (!team) return null
  if (team.logo) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1.5 ${className ?? ''}`}
      >
        <img src={team.logo} alt={team.name} className="h-full w-full object-contain" />
      </div>
    )
  }
  return (
    <div
      className={`flex items-center justify-center rounded-xl font-black ${className ?? ''}`}
      style={{ backgroundColor: team.primaryColor }}
    >
      <span style={{ color: '#fff' }}>{(team.shortName || team.name).slice(0, 3).toUpperCase()}</span>
    </div>
  )
}

export function LiveBadge({ state }: { state: DisplayState }) {
  if (state.status !== 'live') return null
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[clamp(10px,0.9vw,18px)] font-black tracking-widest text-white">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse-dot" />
      EN VIVO
    </span>
  )
}

export function AddedTime({ state, className }: { state: DisplayState; className?: string }) {
  if (state.addedTime <= 0) return null
  return (
    <span
      className={`inline-flex items-center rounded-md bg-amber-500 px-2 py-0.5 font-mono font-black text-black ${className ?? ''}`}
    >
      +{state.addedTime}
    </span>
  )
}

export function PeriodTag({ state, className }: { state: DisplayState; className?: string }) {
  return (
    <span className={className}>
      {state.periodLabel.toUpperCase()}
      {state.status === 'finished' ? ' · FINAL' : ''}
    </span>
  )
}

/** Básquetbol: faltas por equipo + shot clock (null cuando no se usan). */
export function BasketballInfo({ state, className }: { state: DisplayState; className?: string }) {
  const hasFouls = state.homeFouls !== null || state.awayFouls !== null
  const shotMs = state.shotClock ? downTimerRemaining(state.shotClock) : null
  if (!hasFouls && shotMs === null) return null

  const seconds =
    shotMs === null ? null : shotMs > 0 && shotMs < 5000 ? (shotMs / 1000).toFixed(1) : String(Math.ceil(shotMs / 1000))

  return (
    <div className={`flex items-center gap-[1.4vw] ${className ?? ''}`}>
      {hasFouls ? (
        <span className="rounded-md bg-white/10 px-[0.8vw] py-[0.4vh] font-mono text-[clamp(11px,1.2vw,22px)] font-bold tracking-widest text-slate-300">
          FALTAS {state.homeFouls ?? 0} — {state.awayFouls ?? 0}
        </span>
      ) : null}
      {seconds !== null ? (
        <span
          className={`rounded-md px-[0.8vw] py-[0.4vh] font-mono text-[clamp(13px,1.6vw,30px)] font-black tabular-nums ${
            shotMs !== null && shotMs < 5000 ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'
          }`}
        >
          {seconds}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Vóleibol: sets finalizados + sets ganados (null si no hay sets).
 * Muestra "SETS 2 — 1" y el detalle "25-23 · 23-25 · 25-20".
 */
export function SetsInfo({ state, className }: { state: DisplayState; className?: string }) {
  const sets = state.sets ?? []
  if (sets.length === 0) return null
  const won = sets.reduce(
    (acc, s) => {
      if (s.home > s.away) acc.home += 1
      else if (s.away > s.home) acc.away += 1
      return acc
    },
    { home: 0, away: 0 },
  )

  return (
    <div className={`flex flex-col items-center gap-[0.6vh] ${className ?? ''}`}>
      <span className="rounded-md bg-white/10 px-[0.8vw] py-[0.4vh] font-mono text-[clamp(12px,1.4vw,26px)] font-black tracking-widest text-amber-400">
        SETS {won.home} — {won.away}
      </span>
      <span className="font-mono text-[clamp(10px,1vw,18px)] tracking-wide text-slate-300">
        {sets.map((s) => `${s.home}-${s.away}`).join(' · ')}
      </span>
    </div>
  )
}
