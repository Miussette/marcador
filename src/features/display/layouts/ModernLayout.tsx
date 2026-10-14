import { scoreText } from '@/features/sports/display'
import { formatClock } from '@/utils/time'
import { contrastText } from '@/utils/format'
import { AddedTime, BasketballInfo, LiveBadge, SetsInfo, TeamLogo, type LayoutProps } from './common'

/** Moderno: barra inferior tipo "lower third" con bloques de color de equipo. */
export function ModernLayout({ state, elapsedMs }: LayoutProps) {
  const home = state.home
  const away = state.away

  return (
    <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-b from-[#05070A] via-[#070B12] to-[#05070A] text-white">
      <header className="flex items-center justify-between gap-4 px-[3vw] pt-[2vh]">
        <span className="text-[clamp(12px,1.5vw,28px)] font-bold tracking-wide text-slate-400">
          {state.competition || 'MARCADOR'}
        </span>
        <div className="flex items-center gap-4">
          <span className="hidden text-[clamp(11px,1.1vw,20px)] tracking-widest text-slate-600 uppercase sm:inline">
            {[state.round, state.venue].filter(Boolean).join(' · ')}
          </span>
          <LiveBadge state={state} />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[clamp(14px,2vw,40px)] font-black tracking-[0.4em] text-slate-600">
            {state.periodLabel.toUpperCase()}
          </p>
        </div>
      </main>

      <footer className="mx-auto mb-[3vh] w-[94%] overflow-hidden rounded-[1vw] shadow-2xl shadow-black/60">
        <div className="flex items-stretch">
          <div
            className="flex min-w-0 flex-[1.4] items-center justify-end gap-[1.2vw] px-[2vw] py-[1.8vh]"
            style={{ backgroundColor: home?.primaryColor ?? '#1E293B' }}
          >
            <span
              className="min-w-0 truncate text-right text-[clamp(16px,2.4vw,48px)] leading-tight font-black uppercase"
              style={{ color: contrastText(home?.primaryColor ?? '#1E293B') }}
            >
              {home?.name ?? 'Local'}
            </span>
            <TeamLogo state={state} side="home" className="h-[7.5vh] w-[7.5vh] shrink-0" />
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center bg-[#0B0F14] px-[2vw] py-[1.4vh]">
            <div className="flex items-center gap-[1vw] font-mono text-[clamp(30px,4.6vw,92px)] leading-none font-black tabular-nums text-white">
              <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'home')}</span>
              <span className="text-slate-600">—</span>
              <span style={state.sportState?.sport === 'judo' ? { fontSize: '0.4em' } : undefined}>{scoreText(state, 'away')}</span>
            </div>
            <div className="mt-[0.8vh] flex items-center gap-2">
              <span className="font-mono text-[clamp(14px,1.8vw,34px)] font-bold tabular-nums text-emerald-400">
                {formatClock(elapsedMs)}
              </span>
              <AddedTime state={state} className="text-[clamp(11px,1.2vw,22px)]" />
            </div>
            <BasketballInfo state={state} className="mt-[0.6vh]" />
            <SetsInfo state={state} className="mt-[0.4vh]" />
          </div>

          <div
            className="flex min-w-0 flex-[1.4] items-center gap-[1.2vw] px-[2vw] py-[1.8vh]"
            style={{ backgroundColor: away?.primaryColor ?? '#334155' }}
          >
            <TeamLogo state={state} side="away" className="h-[7.5vh] w-[7.5vh] shrink-0" />
            <span
              className="min-w-0 truncate text-[clamp(16px,2.4vw,48px)] leading-tight font-black uppercase"
              style={{ color: contrastText(away?.primaryColor ?? '#334155') }}
            >
              {away?.name ?? 'Visitante'}
            </span>
          </div>
        </div>
        <div className="h-[0.6vh] w-full bg-amber-500" />
      </footer>
    </div>
  )
}
