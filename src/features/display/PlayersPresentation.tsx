import type { DisplayState } from '@/types'

export function PlayersPresentation({ state }: { state: DisplayState }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#05070A] p-[4vh] text-white">
      <h1 className="mb-[3vh] text-center text-[4vh] font-bold">{state.competition || 'Presentación de jugadores'}</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-[4vw]">
        {(['home', 'away'] as const).map(side => {
          const team = state[side]
          return (
            <section key={side} className="flex min-h-0 flex-col">
              <h2 className="mb-[2vh] rounded-xl p-[2vh] text-center text-[3.5vh] font-bold" style={{ backgroundColor: team?.primaryColor ?? '#1E293B' }}>
                {team?.name || (side === 'home' ? 'Local' : 'Visitante')}
              </h2>
              <div className="grid min-h-0 flex-1 auto-rows-fr gap-[0.5vh] overflow-hidden">
                {team?.players?.length ? team.players.map(player => (
                  <div key={player.id} className="flex min-h-0 items-center gap-[1vw] rounded-lg bg-[#101722] px-[1vw] text-[clamp(12px,2.4vh,32px)]">
                    <span className="w-[3ch] shrink-0 text-center font-bold" style={{ color: team.primaryColor }}>{player.number ?? '—'}</span>
                    <span className="truncate">{player.firstName} {player.lastName}</span>
                  </div>
                )) : <p className="self-start text-center text-[2.5vh] text-slate-400">Sin jugadores registrados</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
