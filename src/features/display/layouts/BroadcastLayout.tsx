import { scoreText } from '@/features/sports/display'
import { formatClock } from '@/utils/time'
import { AddedTime, BasketballInfo, LiveBadge, PeriodTag, SetsInfo, TeamLogo, type LayoutProps } from './common'

/** Estilo transmisión TV: composición central + barras superior e inferior. */
export function BroadcastLayout({ state, elapsedMs }: LayoutProps) {
  const home = state.home
  const away = state.away

  return (
    <div className="flex h-full w-full flex-col bg-[#05070A] text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0B0F14]/90 px-[2.5vw] py-[1.1vh]">
        <span className="truncate text-[clamp(12px,1.4vw,26px)] font-bold tracking-wide text-slate-300">
          {state.competition || 'MARCADOR'}
        </span>
        <span className="hidden truncate text-[clamp(11px,1.1vw,20px)] tracking-wide text-slate-500 sm:inline">
          {[state.round, state.venue].filter(Boolean).join(' · ')}
        </span>
        <LiveBadge state={state} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-[2.2vh] px-[4vw]">
        <div className="flex w-full items-center justify-center gap-[3vw]">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-[1.6vw]">
            <span className="min-w-0 truncate text-right text-[clamp(20px,3.4vw,72px)] font-black uppercase">
              {home?.name ?? 'Local'}
            </span>
            <TeamLogo state={state} side="home" className="h-[9vh] w-[9vh] shrink-0" />
          </div>

          <div className="flex shrink-0 items-center gap-[1.4vw] font-mono text-[clamp(44px,8vw,150px)] leading-none font-black tabular-nums">
            <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'home')}</span>
            <span className="text-slate-600">—</span>
            <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'away')}</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-[1.6vw]">
            <TeamLogo state={state} side="away" className="h-[9vh] w-[9vh] shrink-0" />
            <span className="min-w-0 truncate text-[clamp(20px,3.4vw,72px)] font-black uppercase">
              {away?.name ?? 'Visitante'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[1.4vw]">
          <span className="font-mono text-[clamp(26px,4.4vw,84px)] leading-none font-black tabular-nums text-white">
            {formatClock(elapsedMs)}
          </span>
          {state.timer.running ? (
            <span className="mt-[1vh] h-[clamp(8px,0.9vw,16px)] w-[clamp(8px,0.9vw,16px)] rounded-full bg-red-500 animate-pulse-dot" />
          ) : null}
        </div>

        <BasketballInfo state={state} />

        <SetsInfo state={state} />

        <div className="flex items-center gap-3">
          <PeriodTag
            state={state}
            className="rounded-full border border-white/15 px-[1.6vw] py-[0.6vh] text-[clamp(12px,1.5vw,28px)] font-bold tracking-[0.2em] text-slate-300"
          />
          <AddedTime state={state} className="text-[clamp(14px,1.6vw,30px)]" />
        </div>
      </main>

      <footer className="flex h-[0.8vh] w-full">
        <span className="h-full flex-1" style={{ backgroundColor: home?.primaryColor ?? '#1E293B' }} />
        <span className="h-full flex-1" style={{ backgroundColor: away?.primaryColor ?? '#334155' }} />
      </footer>
    </div>
  )
}
