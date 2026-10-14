import { scoreText } from '@/features/sports/display'
import { formatClock } from '@/utils/time'
import { AddedTime, BasketballInfo, LiveBadge, PeriodTag, SetsInfo, TeamLogo, type LayoutProps } from './common'

/** Clásico: tablero centrado tipo marcador de estadio. */
export function ClassicLayout({ state, elapsedMs }: LayoutProps) {
  const home = state.home
  const away = state.away

  return (
    <div className="flex h-full w-full flex-col bg-[#070A0F] text-white">
      <header className="flex items-center justify-center gap-[2vw] border-b border-white/10 bg-[#101722] py-[1.4vh]">
        <span className="font-mono text-[clamp(28px,5vw,96px)] leading-none font-black tabular-nums text-white">
          {formatClock(elapsedMs)}
        </span>
        <div className="flex flex-col items-start gap-1">
          <PeriodTag
            state={state}
            className="text-[clamp(12px,1.6vw,30px)] font-bold tracking-[0.25em] text-amber-400"
          />
          <AddedTime state={state} className="text-[clamp(12px,1.4vw,26px)]" />
        </div>
        <LiveBadge state={state} />
        <BasketballInfo state={state} />
        <SetsInfo state={state} />
      </header>

      <main className="flex flex-1 items-center justify-center px-[4vw]">
        <div className="flex w-full max-w-[1400px] items-stretch overflow-hidden rounded-[1.2vw] border border-white/10 bg-[#0D1420] shadow-2xl">
          <div className="flex flex-1 flex-col items-center justify-center gap-[1.6vh] px-[2vw] py-[4vh]">
            <TeamLogo state={state} side="home" className="h-[14vh] w-[14vh]" />
            <span className="w-full truncate text-center text-[clamp(18px,2.6vw,54px)] leading-tight font-black uppercase">
              {home?.name ?? 'Local'}
            </span>
            <span className="text-[clamp(10px,1vw,18px)] font-bold tracking-[0.2em] text-slate-500">LOCAL</span>
          </div>

          <div className="flex w-[clamp(180px,26vw,520px)] flex-col items-center justify-center border-x border-white/10 bg-[#0A101A] py-[3vh]">
            <div className="flex items-center gap-[1.5vw] font-mono text-[clamp(52px,9vw,170px)] leading-none font-black tabular-nums">
              <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'home')}</span>
              <span className="text-slate-600">:</span>
              <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'away')}</span>
            </div>
            <span className="mt-[1.6vh] text-[clamp(11px,1.2vw,22px)] font-bold tracking-[0.3em] text-slate-500">
              MARCADOR
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-[1.6vh] px-[2vw] py-[4vh]">
            <TeamLogo state={state} side="away" className="h-[14vh] w-[14vh]" />
            <span className="w-full truncate text-center text-[clamp(18px,2.6vw,54px)] leading-tight font-black uppercase">
              {away?.name ?? 'Visitante'}
            </span>
            <span className="text-[clamp(10px,1vw,18px)] font-bold tracking-[0.2em] text-slate-500">VISITANTE</span>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-between gap-4 border-t border-white/10 bg-[#101722] px-[2.5vw] py-[1vh]">
        <span className="truncate text-[clamp(11px,1.3vw,24px)] font-semibold text-slate-400">
          {state.competition || '—'}
        </span>
        <span className="hidden truncate text-[clamp(11px,1.1vw,20px)] text-slate-500 sm:inline">
          {[state.round, state.venue].filter(Boolean).join(' · ')}
        </span>
      </footer>
    </div>
  )
}
