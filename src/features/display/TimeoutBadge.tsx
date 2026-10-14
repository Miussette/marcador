import type { DownTimerSnapshot } from '@/types'
import { downTimerRemaining } from '@/features/timer/timer'
import { formatClock } from '@/utils/time'

export function TimeoutBadge({ timer, now }: { timer: DownTimerSnapshot | null | undefined; now: number }) {
  const remaining = timer ? downTimerRemaining(timer, now) : 0
  if (!timer || remaining <= 0) return null
  return <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-yellow-400/50 bg-black/90 px-4 py-2 text-center text-white" data-testid="timeout-badge"><p className="text-xs font-bold text-yellow-300">TIEMPO MUERTO</p><p className="font-mono text-2xl font-bold tabular-nums">{formatClock(remaining)}</p></div>
}
