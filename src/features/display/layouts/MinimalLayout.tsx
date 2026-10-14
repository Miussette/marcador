import { scoreText } from '@/features/sports/display'
import { formatClock } from '@/utils/time'
import { AddedTime, LiveBadge, PeriodTag, SetsInfo, TeamLogo, type LayoutProps } from './common'

/** Minimal: tipografía sobria, sin adornos, máxima legibilidad. */
export function MinimalLayout({ state, elapsedMs }: LayoutProps) {
  const home = state.home
  const away = state.away

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#05070A] px-[6vw] text-white">
      <div className="mb-[2.5vh] flex items-center gap-[1.6vw]">
        <span className="text-[clamp(11px,1.2vw,22px)] font-semibold tracking-[0.35em] text-slate-500 uppercase">
          {state.competition || 'Marcador'}
        </span>
        <LiveBadge state={state} />
      </div>

      <div className="flex w-full items-center justify-between gap-[4vw]">
        <div className="flex min-w-0 flex-1 items-center gap-[1.6vw]">
          <TeamLogo state={state} side="home" className="h-[8vh] w-[8vh] shrink-0" />
          <span className="min-w-0 truncate text-right text-[clamp(18px,3vw,64px)] font-light uppercase">
            {home?.name ?? 'Local'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-[1.2vw] font-mono text-[clamp(40px,7vw,140px)] leading-none font-light tabular-nums">
          <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'home')}</span>
          <span className="text-slate-700">–</span>
          <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'away')}</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-[1.6vw]">
          <span className="min-w-0 truncate text-[clamp(18px,3vw,64px)] font-light uppercase">
            {away?.name ?? 'Visitante'}
          </span>
          <TeamLogo state={state} side="away" className="h-[8vh] w-[8vh] shrink-0" />
        </div>
      </div>

      <div className="mt-[3.5vh] flex items-center gap-[1.6vw]">
        <span className="font-mono text-[clamp(20px,3vw,56px)] leading-none font-light tabular-nums text-slate-300">
          {formatClock(elapsedMs)}
        </span>
        <span className="h-[clamp(14px,1.6vw,28px)] w-px bg-slate-700" />
        <PeriodTag
          state={state}
          className="text-[clamp(12px,1.5vw,28px)] font-medium tracking-[0.28em] text-slate-500 uppercase"
        />
        <AddedTime state={state} className="text-[clamp(12px,1.4vw,26px)]" />
      </div>

      <div className="mt-[1.5vh]">
        <SetsInfo state={state} />
      </div>

      <div className="absolute bottom-[3vh] flex items-center gap-3 text-[clamp(10px,1vw,18px)] tracking-widest text-slate-700 uppercase">
        {[state.round, state.venue].filter(Boolean).join(' · ')}
      </div>
    </div>
  )
}
