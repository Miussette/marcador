import { Input, Select } from '@/components/ui/Form'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { initialSportState, rankedResults, setsWon, sportPeriod, tennisPointLabel } from './rules'
import type { AthleticResult, RuleConfig, SportAction, SportSide } from './types'
import type { Match, Player, SportId, Team } from '@/types'
import { formatClock } from '@/utils/time'

export function SportControl({ match, sport, home, away, players, elapsedMs, saving }: {
  match: Match; sport: SportId; home: Team | null; away: Team | null; players: Player[]; elapsedMs: number; saving: boolean
}) {
  const state = match.sportState ?? initialSportState(sport)
  const { current: c, config, family } = state
  const store = useActiveMatchStore.getState()
  const send = (action: SportAction) => void store.sportAction(action)
  const locked = saving || !!c.winner || match.status === 'finished'
  const [name, setName] = useState('')
  const [marks, setMarks] = useState('')
  const [resultId, setResultId] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<AthleticResult['status']>('valid')
  const [formError, setFormError] = useState('')
  const combatTime = family === 'combat' && !c.goldenScore ? Math.max(0, config.roundSeconds * 1000 - elapsedMs) : elapsedMs
  useEffect(() => {
    if (family === 'combat' && !c.goldenScore && match.timerRunning && elapsedMs >= config.roundSeconds * 1000 && !saving) {
      void store.pauseClock()
    }
  }, [family, c.goldenScore, match.timerRunning, elapsedMs, config.roundSeconds, saving])
  const configure = (key: keyof RuleConfig, value: number | string | boolean) => send({ type: 'configure', config: { [key]: value } })
  const numeric = (key: keyof RuleConfig, label: string, min: number, max: number) => <label className="flex flex-col gap-1 text-xs text-muted">{label}<Input className="w-28" type="number" min={min} max={max} key={String(config[key])} defaultValue={Number(config[key])} onBlur={e => { if (Number(e.target.value) !== config[key]) configure(key, Number(e.target.value)) }} /></label>
  const won = setsWon(c.sets)
  const names = [home?.name ?? 'Local', away?.name ?? 'Visitante']

  return <div className="flex-1 space-y-4 overflow-y-auto p-5">
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div><p className="text-xl font-bold">{sportPeriod(state)}</p><p className="text-xs text-muted">{c.winner ? c.winner === 'draw' ? 'Empate' : `Ganador: ${names[c.winner === 'home' ? 0 : 1]}` : 'Reglamento por partido · guardado automático'}</p></div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={saving || !state.history.length} onClick={() => send({ type: 'undo' })}>Deshacer última acción</Button>
        <Button variant="danger" disabled={saving} onClick={() => { if (window.confirm('¿Reiniciar la puntuación y el historial de este reglamento?')) send({ type: 'reset' }) }}>Reiniciar reglamento</Button>
      </div>
    </div>
    {!match.sportState && (match.homeScore > 0 || match.awayScore > 0 || match.sets.length > 0) && <p className="card p-4 text-warning">Este partido tiene puntuación anterior. Reinicia el reglamento para activar estos controles.</p>}
    <fieldset disabled={saving || state.history.length > 0 || !!c.winner} className="card flex flex-wrap items-end gap-4 p-4 disabled:opacity-60">
      {['tennis', 'sets'].includes(family) && numeric('setsToWin', 'Sets para ganar', 1, 5)}
      {family === 'tennis' && <>{numeric('gamesToWin', 'Juegos por set', 1, 12)}{numeric('tieBreak', 'Tie-break', 1, 30)}{numeric('finalTieBreak', 'Tie-break último set', 1, 30)}<label className="text-xs text-muted">Puntuación en iguales<Select className="mt-1" value={config.deuce} onChange={e => configure('deuce', e.target.value)}><option value="advantage">Ventajas</option><option value="golden">Punto de oro</option><option value="star">Star Point</option></Select></label></>}
      {family === 'sets' && <>{numeric('target', 'Puntos por set', 1, 99)}{numeric('decidingTarget', 'Set decisivo', 1, 99)}{numeric('cap', 'Tope (0 = sin tope)', 0, 199)}</>}
      {sport === 'badminton' && <label className="text-xs text-muted">Formato de bádminton<Select className="mt-1" value={config.target === 21 && config.cap === 30 ? '21' : config.target === 15 && config.cap === 21 ? '15' : 'custom'} onChange={e => { if (e.target.value !== 'custom') send({ type: 'configure', config: { setsToWin: 2, target: Number(e.target.value), decidingTarget: Number(e.target.value), cap: e.target.value === '15' ? 21 : 30 } }) }}><option value="21">Mejor de 3 · 21 puntos · tope 30</option><option value="15">Mejor de 3 · 15 puntos · tope 21</option><option value="custom">Personalizado</option></Select></label>}
      {family === 'baseball' && numeric('innings', 'Entradas reglamentarias', 1, 20)}
      {family === 'combat' && <>{numeric('rounds', 'Rounds', 1, 15)}{numeric('roundSeconds', 'Segundos por round', 10, 1800)}</>}
      {family === 'athletics' && <>{numeric('attempts', 'Intentos por participante', 1, 12)}<label className="text-xs text-muted">Unidad<Select className="mt-1" value={config.unit} onChange={e => configure('unit', e.target.value)}><option value="seconds">Segundos</option><option value="meters">Metros</option><option value="points">Puntos</option></Select></label><label className="text-xs text-muted">Clasificación<Select className="mt-1" value={String(config.lowerWins)} onChange={e => configure('lowerWins', e.target.value === 'true')}><option value="true">Menor marca gana</option><option value="false">Mayor marca gana</option></Select></label></>}
      <p className="w-full text-xs text-muted">Configura antes de registrar la primera acción.</p>
    </fieldset>
    {family !== 'athletics' && <div className="grid gap-4 md:grid-cols-2">{(['home', 'away'] as SportSide[]).map((side, i) => <div key={side} className="card space-y-4 p-5 text-center">
      <h2 className="text-xl font-bold">{names[i]}</h2>
      <p className="font-mono text-7xl font-bold">{family === 'tennis' && !c.winner ? tennisPointLabel(state, side) : sport === 'judo' ? `${c.ippon[i]} / ${c.waza[i]} / ${c.yuko[i]}` : ['tennis', 'sets'].includes(family) && c.winner ? won[i] : c.points[i]}</p>
      {['tennis', 'sets'].includes(family) && <p>Sets: {won[i]}{family === 'tennis' ? ` · Juegos: ${c.games[i]}` : ''} · {c.server === side ? 'Al saque' : 'Recibe'}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {['tennis', 'sets'].includes(family) && <><Button variant="success" size="xl" disabled={locked} onClick={() => send({ type: 'point', side })}>+ Punto</Button><Button disabled={locked} onClick={() => send({ type: 'serve', side })}>Asignar saque</Button></>}
        {family === 'baseball' && <><Button variant="success" disabled={locked || side !== (c.half === 'top' ? 'away' : 'home')} onClick={() => send({ type: 'run', side, delta: 1 })}>+ Carrera</Button><Button disabled={locked || side !== (c.half === 'top' ? 'away' : 'home')} onClick={() => send({ type: 'run', side, delta: -1 })}>− Carrera</Button><Button disabled={locked} onClick={() => send({ type: 'hit', side, delta: 1 })}>Hit ({c.hits[i]})</Button><Button disabled={locked} onClick={() => send({ type: 'error', side, delta: 1 })}>Error ({c.errors[i]})</Button></>}
        {family === 'combat' && <>{sport === 'judo' ? <>{(['ippon', 'waza', 'yuko'] as const).map(technique => <Button key={technique} disabled={locked} onClick={() => send({ type: 'technique', side, technique })}>{technique === 'waza' ? 'Waza-ari' : technique}</Button>)}</> : <>{[-1, 1, 2, 3].map(delta => <Button key={delta} disabled={locked} onClick={() => send({ type: 'point', side, delta })}>{delta > 0 ? '+' : ''}{delta}</Button>)}</>}<Button variant="warning" disabled={locked} onClick={() => send({ type: 'penalty', side })}>{sport === 'judo' ? 'Shido' : 'Sanción'} ({c.penalties[i]})</Button><Button disabled={locked} onClick={() => send({ type: 'finish', winner: side })}>Declarar ganador</Button></>}
      </div>
      {sport === 'judo' && <p className="text-xs text-muted">Ippon / Waza-ari / Yuko</p>}
    </div>)}</div>}
    {['tennis', 'sets'].includes(family) && <div className="card p-4"><p className="font-bold">Sets completados</p><p className="mt-2 font-mono">{c.sets.map(pair => pair.join('–')).join(' · ') || 'Todavía no hay sets completados'}</p><p className="mt-2 text-xs text-muted">El set y el ganador se calculan automáticamente. Deshacer restaura también los sets cerrados.</p></div>}
    {family === 'baseball' && <div className="card space-y-4 p-5"><p className="text-2xl font-bold">Al bate: {names[c.half === 'top' ? 1 : 0]} · Bolas {c.balls} · Strikes {c.strikes} · Outs {c.outs}</p><div className="flex flex-wrap gap-2">{(['ball', 'strike', 'foul', 'out', 'batter', 'half'] as const).map((type, i) => <Button disabled={locked} key={type} onClick={() => send({ type })}>{['Bola', 'Strike', 'Foul', 'Out', 'Nueva cuenta', 'Siguiente mitad'][i]}</Button>)}{([0, 1, 2] as const).map(index => <Button key={index} variant={c.bases[index] ? 'primary' : 'outline'} disabled={locked} onClick={() => send({ type: 'base', index })}>{index + 1}ª base {c.bases[index] ? 'ocupada' : 'libre'}</Button>)}</div><p className="text-xs text-muted">Cuatro bolas fuerzan las bases; tres strikes registran un out y tres outs cambian la mitad. Registra manualmente avances de corredores y jugadas excepcionales; usa Deshacer para corregir un tercer strike no retenido.</p><div className="overflow-x-auto"><table className="w-full text-center"><thead><tr><th>Equipo</th>{c.inningRuns.map((_, i) => <th key={i}>{i + 1}</th>)}<th>R</th><th>H</th><th>E</th></tr></thead><tbody>{names.map((name, i) => <tr key={i}><td>{name}</td>{c.inningRuns.map((runs, n) => <td key={n}>{runs[i]}</td>)}<td>{c.points[i]}</td><td>{c.hits[i]}</td><td>{c.errors[i]}</td></tr>)}</tbody></table></div></div>}
    {family !== 'athletics' && <div className="card flex flex-wrap items-center gap-3 p-4"><p className="font-mono text-4xl">{formatClock(combatTime)}</p><Button disabled={locked || (family === 'combat' && !c.goldenScore && combatTime === 0)} onClick={() => void (match.timerRunning ? store.pauseClock() : store.resumeClock())}>{match.timerRunning ? 'Pausar' : 'Iniciar / reanudar'}</Button><Button disabled={saving} onClick={() => void store.resetClock()}>Reiniciar reloj</Button>{family === 'combat' && <><Button disabled={locked || c.round >= config.rounds} onClick={() => send({ type: 'round' })}>Siguiente round</Button>{sport === 'judo' && <Button disabled={locked || c.goldenScore} onClick={() => send({ type: 'golden' })}>Golden Score</Button>}<Button disabled={locked} onClick={() => send({ type: 'finish', winner: 'draw' })}>Declarar empate</Button><p className="w-full text-xs text-muted">El reloj se detiene al agotar el round. La puntuación y la decisión arbitral son manuales; en judo, ippon, dos waza-ari o tres shido cierran el combate.</p></>}</div>}
    {family === 'athletics' && <><form className="card space-y-3 p-4" onSubmit={e => {
      e.preventDefault(); const values = marks.split(';').map(mark => mark.trim() === '' ? null : Number(mark.trim().replace(',', '.')))
      if (!name.trim() || values.length > config.attempts || values.some(value => value !== null && (!Number.isFinite(value) || value < 0)) || (resultStatus === 'valid' && values.every(value => value === null))) { setFormError('Introduce un nombre y marcas válidas. Separa los intentos con punto y coma.'); return }
      send({ type: 'result', result: { id: resultId ?? crypto.randomUUID(), name, attempts: values, status: resultStatus } }); setFormError('')
    }}><h2 className="font-bold">{resultId ? 'Editar resultado' : 'Registrar resultado'}</h2><Input  placeholder="Participante" list="sport-participants" value={name} onChange={e => setName(e.target.value)} required /><datalist id="sport-participants">{players.map(player => <option key={player.id} value={[player.firstName, player.lastName].join(' ')} />)}</datalist><Input  placeholder="Marca: 12,35 · varios intentos: 6,20; 6,45; 6,30" value={marks} onChange={e => setMarks(e.target.value)} /><Select  value={resultStatus} onChange={e => setResultStatus(e.target.value as AthleticResult['status'])}><option value="valid">Marca válida</option><option value="dns">DNS · No salió</option><option value="dnf">DNF · No terminó</option><option value="dq">DQ · Descalificado</option></Select>{formError && <p className="text-danger">{formError}</p>}<div className="flex gap-2"><Button type="submit" disabled={saving} variant="primary">Guardar marca</Button><Button onClick={() => { setResultId(null); setName(''); setMarks(''); setResultStatus('valid') }}>Nuevo participante</Button><Button disabled={saving} onClick={() => void store.setStatus(match.status === 'finished' ? 'live' : 'finished')}>{match.status === 'finished' ? 'Reabrir prueba' : 'Finalizar prueba'}</Button></div><p className="text-xs text-muted">Marcas manuales en {config.unit === 'seconds' ? 'segundos' : config.unit === 'meters' ? 'metros' : 'puntos'}. No hay cronometraje por sensores ni desempate por segundo mejor intento.</p></form><div className="card overflow-x-auto p-4"><table className="w-full text-left"><thead><tr><th>Puesto</th><th>Participante</th><th>Mejor marca</th><th>Intentos</th><th>Acciones</th></tr></thead><tbody>{rankedResults(state).map(({ result, best, rank }) => <tr key={result.id} className="border-t border-line"><td>{rank ?? '—'}</td><td>{result.name}</td><td>{best ?? result.status.toUpperCase()}</td><td>{result.attempts.map(value => value ?? '—').join(' / ')}</td><td className="flex gap-2 py-2"><Button size="sm" onClick={() => { setResultId(result.id); setName(result.name); setMarks(result.attempts.map(value => value ?? '').join('; ')); setResultStatus(result.status) }}>Editar</Button><Button size="sm" disabled={saving} onClick={() => send({ type: 'removeResult', id: result.id })}>Quitar</Button></td></tr>)}</tbody></table></div></>}
  </div>
}
