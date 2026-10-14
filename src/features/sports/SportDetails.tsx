import type { DisplayState } from '@/types'
import { rankedResults, setsWon } from './rules'

export function SportDetails({ state }: { state: DisplayState }) {
  const sport = state.sportState
  if (!sport) return null
  const c = sport.current
  const names = [state.home?.name ?? 'Local', state.away?.name ?? 'Visitante']
  if (sport.family === 'athletics') return <div className="absolute inset-0 overflow-auto bg-[#070a0f] p-[5vw] text-white"><h1 className="mb-6 text-[3vw] font-bold">{state.competition} · Resultados</h1><table className="w-full text-left text-[2vw]"><thead><tr><th>Puesto</th><th>Participante</th><th>Marca ({sport.config.unit === 'seconds' ? 's' : sport.config.unit === 'meters' ? 'm' : 'pts'})</th></tr></thead><tbody>{rankedResults(sport).map(({ result, rank, best }) => <tr key={result.id} className="border-t border-white/20"><td className="py-[1vh]">{rank ?? '—'}</td><td>{result.name}</td><td>{best ?? result.status.toUpperCase()}</td></tr>)}</tbody></table>{!c.results.length && <p className="mt-12 text-[2vw] text-slate-400">Esperando resultados de la prueba</p>}</div>
  const won = setsWon(c.sets)
  const details = sport.family === 'tennis' ? `Juegos ${c.games.join('–')} · Sets ${won.join('–')} · ${c.sets.map(set => set.join('–')).join(' / ')} · Saque: ${names[c.server === 'home' ? 0 : 1]}`
    : sport.family === 'sets' ? `Sets ${won.join('–')} · ${c.sets.map(set => set.join('–')).join(' / ')} · Saque: ${names[c.server === 'home' ? 0 : 1]}`
      : sport.family === 'baseball' ? `Al bate: ${names[c.half === 'top' ? 1 : 0]} · Bolas ${c.balls} · Strikes ${c.strikes} · Outs ${c.outs} · Bases ${c.bases.map((occupied, i) => occupied ? i + 1 : '—').join(' / ')} · H ${c.hits.join('–')} · E ${c.errors.join('–')}`
        : `${sport.sport === 'judo' ? 'Ippon / Waza-ari / Yuko · Shido' : 'Sanciones'} ${c.penalties.join('–')}`
  return <div className="pointer-events-none absolute bottom-[2vh] left-[4vw] right-[4vw] rounded-xl bg-slate-950/95 px-[2vw] py-[1vh] text-center text-[clamp(14px,1.6vw,32px)] text-white">{details}{c.winner && <p className="font-bold text-amber-300">{c.winner === 'draw' ? 'Empate' : `Ganador: ${names[c.winner === 'home' ? 0 : 1]}`}</p>}</div>
}
