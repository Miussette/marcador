import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trophy,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { useOfficialsStore } from '@/stores/officialsStore'
import { usePlayersStore } from '@/stores/playersStore'
import { useActiveMatchStore, type Side } from '@/stores/activeMatchStore'
import { useTicker } from '@/features/timer/useTicker'
import {
  changeDownTimerMs,
  createDownTimer,
  downTimerRemaining,
  pauseDownTimer,
  resetDownTimer,
  setDownTimerMs,
  startDownTimer,
} from '@/features/timer/timer'
import { OFFICIAL_TYPES, OFFICIAL_GRADES, BASKETBALL_PERIODS } from '@/types'
import type { DownTimerSnapshot, Match, MatchPeriod, Team } from '@/types'
import { formatClock } from '@/utils/time'
import { cn } from '@/utils/cn'
import { HornControls } from '@/features/serial/HornControls'

export type ControlSection = 'score' | 'lineup' | 'officials' | 'stats'

interface BasketballControlProps {
  match: Match
  home: Team | null
  away: Team | null
  elapsedMs: number
  saving: boolean
}

const DEFAULT_SHOT_CLOCK_MS = 24_000
const RESET_1_MS = 24_000
const RESET_2_MS = 14_000

/** Reloj de posesión: décimas bajo 5 s, enteros por encima. */
function formatShotClock(ms: number): string {
  const clamped = Math.max(0, ms)
  if (clamped > 0 && clamped < 5_000) return (clamped / 1000).toFixed(1)
  return String(Math.ceil(clamped / 1000)).padStart(2, '0')
}

function shotClockOf(match: Match): DownTimerSnapshot {
  return match.shotClock ?? createDownTimer(DEFAULT_SHOT_CLOCK_MS)
}

function breakTimerOf(match: Match): DownTimerSnapshot {
  return match.breakTimer ?? createDownTimer(60_000)
}

export function BasketballControl({ match, home, away, elapsedMs, saving }: BasketballControlProps) {
  const tick = useTicker(100)
  const store = useActiveMatchStore.getState
  const playersByTeam = usePlayersStore((state) => state.playersByTeam)
  const reloadTeam = usePlayersStore((state) => state.reloadTeam)
  const updatePlayer = usePlayersStore((state) => state.update)
  const { officials, loaded, matchId } = useOfficialsStore()

  const [section, setSection] = useState<ControlSection>('score')
  const [autoRun, setAutoRun] = useState(false)
  const [editingShotClock, setEditingShotClock] = useState(false)
  const [shotClockInput, setShotClockInput] = useState('24')
  const [showShotClock, setShowShotClock] = useState(true)

  const [exchangeSide, setExchangeSide] = useState<Side>('home')
  const [outPlayerId, setOutPlayerId] = useState('')
  const [inPlayerId, setInPlayerId] = useState('')

  const playerStats = match.playerStats ?? {}

  useEffect(() => {
    if (home) void reloadTeam(home.id)
    if (away) void reloadTeam(away.id)
  }, [home, away, reloadTeam])

  useEffect(() => {
    void useOfficialsStore.getState().load(match.id)
    return () => useOfficialsStore.getState().clear()
  }, [match.id])

  const shotClock = shotClockOf(match)
  const breakTimer = breakTimerOf(match)
  const shotMs = downTimerRemaining(shotClock, tick)
  const breakMs = downTimerRemaining(breakTimer, tick)

  // Auto Run: el shot clock sigue al cronómetro de partido.
  useEffect(() => {
    if (!autoRun) return
    if (match.timerRunning && !shotClock.running) {
      void store().setShotClock(startDownTimer(shotClock))
    } else if (!match.timerRunning && shotClock.running) {
      void store().setShotClock(pauseDownTimer(shotClock))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, match.timerRunning, shotClock.running])

  const homePlayers = home ? (playersByTeam[home.id] ?? []) : []
  const awayPlayers = away ? (playersByTeam[away.id] ?? []) : []
  const exchangePlayers = exchangeSide === 'home' ? homePlayers : awayPlayers
  const starters = exchangePlayers.filter((p) => p.isStarter)
  const bench = exchangePlayers.filter((p) => !p.isStarter)

  const SECTIONS: { id: ControlSection; label: string; icon: typeof Trophy }[] = useMemo(
    () => [
      { id: 'score', label: 'PUNTUACIÓN', icon: Trophy },
      { id: 'lineup', label: 'LISTA DE SALIDA', icon: Users },
      { id: 'officials', label: 'OFICIALES', icon: ClipboardList },
      { id: 'stats', label: 'PLAYER STATS', icon: Timer },
    ],
    [],
  )

  const statOf = (playerId: string): { points: number; fouls: number } =>
    playerStats[playerId] ?? { points: 0, fouls: 0 }

  const bumpStat = (playerId: string, key: 'points' | 'fouls', delta: number): void => {
    void store().adjustPlayerStat(playerId, key, delta)
  }

  const doExchange = async (): Promise<void> => {
    const out = exchangePlayers.find((p) => p.id === outPlayerId)
    const inP = exchangePlayers.find((p) => p.id === inPlayerId)
    if (!out || !inP || out.id === inP.id) return
    await updatePlayer(out.id, { isStarter: false })
    await updatePlayer(inP.id, { isStarter: true })
    setOutPlayerId('')
    setInPlayerId('')
  }

  const scorePanel = (side: Side): React.ReactNode => {
    const team = side === 'home' ? home : away
    const score = side === 'home' ? match.homeScore : match.awayScore
    const fouls = side === 'home' ? match.homeFouls : match.awayFouls
    const timeouts = side === 'home' ? match.homeTimeouts : match.awayTimeouts
    const isHome = side === 'home'

    return (
      <section className="card relative flex flex-col gap-4 overflow-hidden p-5">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: team?.primaryColor ?? '#2563EB' }}
          aria-hidden
        />
        <p className="label-muted">{isHome ? 'Local' : 'Visitante'}</p>
        <h2 className="text-lg font-bold leading-tight text-ink">{team?.name ?? 'Por definir'}</h2>

        <div
          key={score}
          className="text-center font-mono text-7xl leading-none font-black tabular-nums text-ink animate-score"
        >
          {score}
        </div>

        {/* Puntos */}
        <Button variant={match.possession === side ? 'success' : 'outline'} disabled={saving} onClick={() => void store().setPossession(match.possession === side ? null : side)}>
          {match.possession === side ? 'Posesión activa' : 'Asignar posesión'}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((points) => (
            <button
              key={points}
              type="button"
              disabled={saving}
              onClick={() => void store().addPoints(side, points)}
              className="flex h-16 flex-col items-center justify-center rounded-xl bg-success text-sm font-black text-white transition-transform hover:bg-green-600 active:scale-[0.98] disabled:opacity-50"
            >
              <Plus size={16} />+{points}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={saving || score <= 0}
            onClick={() => void store().addPoints(side, -1)}
          >
            −1
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={saving || score <= 0}
            onClick={() => void store().addPoints(side, -2)}
          >
            −2
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={saving || score <= 0}
            onClick={() => void store().addPoints(side, -3)}
          >
            −3
          </Button>
        </div>

        {/* Falta / Sustitución / Tiempo fuera */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void store().adjustFouls(side, 1)}
            className="flex h-14 flex-col items-center justify-center rounded-xl border border-danger/40 bg-danger/10 text-xs font-bold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
          >
            Falta
            <span className="font-mono text-base tabular-nums">{fouls}</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('lineup')}
            className="flex h-14 flex-col items-center justify-center rounded-xl border border-line bg-surface-2 text-xs font-bold text-muted transition-colors hover:text-ink"
          >
            Sustitución
            <span className="text-[11px] font-semibold">Lista</span>
          </button>
          <button
            type="button"
            disabled={saving || timeouts >= 5}
            onClick={() => void store().adjustTimeouts(side, 1)}
            className="flex h-14 flex-col items-center justify-center rounded-xl border border-warning/40 bg-warning/10 text-xs font-bold text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
          >
            Tiempo fuera
            <span className="font-mono text-base tabular-nums">{timeouts}</span>
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
          <button
            type="button"
            disabled={saving || fouls <= 0}
            onClick={() => void store().adjustFouls(side, -1)}
            className="transition-colors hover:text-ink disabled:opacity-40"
          >
            − falta
          </button>
          <button
            type="button"
            disabled={saving || timeouts <= 0}
            onClick={() => void store().adjustTimeouts(side, -1)}
            className="transition-colors hover:text-ink disabled:opacity-40"
          >
            − tiempo fuera
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="basketball-control flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <HornControls />
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-2">
        <div className="flex flex-wrap gap-1.5">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wide transition-colors',
                section === item.id
                  ? 'bg-primary text-white shadow-lg shadow-blue-950/40'
                  : 'text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        <Button
          variant={match.resultConfirmed ? 'success' : 'primary'}
          icon={<CheckCircle2 size={16} />}
          disabled={saving}
          onClick={() => void store().setResultConfirmed(!match.resultConfirmed)}
        >
          {match.resultConfirmed ? 'Resultado confirmado' : 'Confirmar Resultado'}
        </Button>
      </div>

      {/* Contenido por sección */}
      {section === 'score' ? (
        <div className="basketball-score-grid grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px_1fr]">
          {scorePanel('home')}

          {/* Columna central: periodo + cancha de intercambio */}
          <div className="flex flex-col gap-4">
            <section className="card p-5">
              <p className="label-muted mb-3">Periodo</p>
              <div className="grid grid-cols-2 gap-1.5">
                {BASKETBALL_PERIODS.map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    disabled={saving}
                    onClick={() => void store().setPeriod(period.id as MatchPeriod)}
                    className={cn(
                      'rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50',
                      match.period === period.id
                        ? 'border-primary/60 bg-primary/15 text-blue-300'
                        : 'border-line bg-app text-muted hover:text-ink',
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center font-mono text-4xl leading-none font-black tabular-nums text-ink">
                {formatClock(elapsedMs)}
              </p>
            </section>

            {/* Exchange Field */}
            <details className="basketball-exchange card p-5">
              <summary className="label-muted cursor-pointer flex items-center gap-2">
                <ArrowLeftRight size={14} /> Exchange Field
              </summary>
              <div className="mt-3 space-y-3">
                <Select value={exchangeSide} onChange={(event) => setExchangeSide(event.target.value as Side)}>
                  <option value="home">{home?.name ?? 'Local'}</option>
                  <option value="away">{away?.name ?? 'Visitante'}</option>
                </Select>
                <Field label="Sale (titular)">
                  <Select value={outPlayerId} onChange={(event) => setOutPlayerId(event.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {starters.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.number ?? '—'} · {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Entra (suplente)">
                  <Select value={inPlayerId} onChange={(event) => setInPlayerId(event.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {bench.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.number ?? '—'} · {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  variant="primary"
                  icon={<ArrowLeftRight size={15} />}
                  block
                  disabled={!outPlayerId || !inPlayerId}
                  onClick={() => void doExchange()}
                >
                  Intercambiar
                </Button>
              </div>
            </details>
          </div>

          {scorePanel('away')}
        </div>
      ) : section === 'lineup' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[{ team: home, players: homePlayers }, { team: away, players: awayPlayers }].map((entry) => (
            <section key={entry.team?.id ?? entry.team?.name ?? 'x'} className="card p-5">
              <p className="label-muted mb-3">Lista de salida · {entry.team?.name ?? '—'}</p>
              {entry.players.length === 0 ? (
                <p className="text-xs text-muted">Sin jugadores registrados.</p>
              ) : (
                <ul className="space-y-1.5">
                  {entry.players.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2"
                    >
                      <span className="flex items-center gap-3 text-sm">
                        <span className="w-7 text-center font-mono font-bold tabular-nums text-ink">
                          {player.number ?? '—'}
                        </span>
                        <span className="text-ink">
                          {player.firstName} {player.lastName}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void updatePlayer(player.id, { isStarter: !player.isStarter })}
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] font-bold transition-colors',
                          player.isStarter
                            ? 'border-success/40 bg-success/15 text-success'
                            : 'border-warning/40 bg-warning/15 text-warning',
                        )}
                      >
                        {player.isStarter ? 'Titular' : 'Suplente'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : section === 'officials' ? (
        <section className="card p-5">
          <p className="label-muted mb-3">Oficiales del partido</p>
          {!loaded || matchId !== match.id ? (
            <p className="text-xs text-muted">Cargando oficiales…</p>
          ) : officials.length === 0 ? (
            <p className="text-xs text-muted">
              Este partido no tiene oficiales asignados. Añádelos desde la sección de Partidos (pestaña Oficiales).
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-2/60">
                <tr>
                  <th className="label-muted px-3 py-2.5 text-left">Orden</th>
                  <th className="label-muted px-3 py-2.5 text-left">Tipo</th>
                  <th className="label-muted px-3 py-2.5 text-left">Nombre</th>
                  <th className="label-muted px-3 py-2.5 text-left">País</th>
                  <th className="label-muted px-3 py-2.5 text-left">Grade</th>
                </tr>
              </thead>
              <tbody>
                {officials.map((official) => (
                  <tr key={official.id} className="border-b border-line/70 last:border-b-0">
                    <td className="px-3 py-2 font-mono tabular-nums text-ink">{official.order}</td>
                    <td className="px-3 py-2 text-ink">
                      {OFFICIAL_TYPES.find((t) => t.id === official.type)?.label ?? official.type}
                    </td>
                    <td className="px-3 py-2 text-ink">{official.name || '—'}</td>
                    <td className="px-3 py-2 text-muted">{official.country || '—'}</td>
                    <td className="px-3 py-2 text-muted">
                      {OFFICIAL_GRADES.find((g) => g.id === official.grade)?.label ?? official.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[{ team: home, players: homePlayers }, { team: away, players: awayPlayers }].map((entry) => (
            <section key={entry.team?.id ?? entry.team?.name ?? 'x'} className="card p-5">
              <p className="label-muted mb-3">Player Stats · {entry.team?.name ?? '—'}</p>
              {entry.players.length === 0 ? (
                <p className="text-xs text-muted">Sin jugadores registrados.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-surface-2/60">
                    <tr>
                      <th className="label-muted px-2 py-2 text-left">N°</th>
                      <th className="label-muted px-2 py-2 text-left">Jugador</th>
                      <th className="label-muted px-2 py-2 text-center">Pts</th>
                      <th className="label-muted px-2 py-2 text-center">Faltas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.players.map((player) => {
                      const stat = statOf(player.id)
                      return (
                        <tr key={player.id} className="border-b border-line/70 last:border-b-0">
                          <td className="px-2 py-2 font-mono tabular-nums text-ink">{player.number ?? '—'}</td>
                          <td className="px-2 py-2 text-ink">
                            {player.firstName} {player.lastName}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => bumpStat(player.id, 'points', -1)}
                                disabled={saving}
                                aria-label={`Restar un punto a ${player.firstName} ${player.lastName}`}
                                className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:text-ink"
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-mono font-bold tabular-nums text-ink">
                                {stat.points}
                              </span>
                              {[1, 2, 3].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => bumpStat(player.id, 'points', n)}
                                  disabled={saving}
                                  aria-label={`Sumar ${n} puntos a ${player.firstName} ${player.lastName}`}
                                  className="rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-[11px] font-bold text-success hover:bg-success/20"
                                >
                                  +{n}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => bumpStat(player.id, 'fouls', -1)}
                                disabled={saving}
                                aria-label={`Restar una falta a ${player.firstName} ${player.lastName}`}
                                className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:text-ink"
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-mono font-bold tabular-nums text-ink">
                                {stat.fouls}
                              </span>
                              <button
                                type="button"
                                onClick={() => bumpStat(player.id, 'fouls', 1)}
                                disabled={saving}
                                aria-label={`Sumar una falta a ${player.firstName} ${player.lastName}`}
                                className="rounded border border-danger/40 bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger hover:bg-danger/20"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Barra inferior de temporizadores */}
      <div className="basketball-timer-grid grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Temporizador del partido */}
        <section className="card p-4">
          <p className="label-muted mb-3">Temporizador del partido</p>
          <p className="text-center font-mono text-4xl leading-none font-black tabular-nums text-ink">
            {formatClock(elapsedMs)}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button
              variant={match.timerRunning ? 'warning' : 'success'}
              icon={match.timerRunning ? <Pause size={15} /> : <Play size={15} />}
              onClick={() =>
                void (match.timerRunning ? store().pauseClock() : match.timerElapsed > 0 ? store().resumeClock() : store().startClock())
              }
              disabled={saving}
            >
              {match.timerRunning ? 'Pausa' : match.timerElapsed > 0 ? 'Sigue' : 'Inicio'}
            </Button>
            <Button variant="secondary" icon={<Plus size={15} />} onClick={() => void store().adjustClock(60_000)} disabled={saving}>
              +1 min
            </Button>
            <Button
              variant="danger"
              icon={<RotateCcw size={15} />}
              onClick={() => void store().resetClock()}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </section>

        {/* Break Timer */}
        <section className="card p-4">
          <p className="label-muted mb-3">Break Timer</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[30000, 60000, 90000].map(duration => <Button key={duration} size="sm" variant={breakTimer.durationMs === duration ? 'primary' : 'secondary'} disabled={saving} onClick={() => void store().setBreakTimer(createDownTimer(duration))}>{formatClock(duration)}</Button>)}
          </div>
          <p
            className={cn(
              'text-center font-mono text-4xl leading-none font-black tabular-nums',
              breakMs <= 0 ? 'text-danger' : 'text-ink',
            )}
          >
            {formatClock(breakMs)}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Button
              variant={breakTimer.running ? 'warning' : 'primary'}
              size="sm"
              icon={breakTimer.running ? <Pause size={14} /> : <Play size={14} />}
              onClick={() =>
                void store().setBreakTimer(breakTimer.running ? pauseDownTimer(breakTimer) : startDownTimer(breakTimer))
              }
              disabled={saving}
            >
              {breakTimer.running ? 'Pausa' : 'Inicio'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() => void store().setBreakTimer(resetDownTimer(breakTimer))}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </section>

        {/* Shot Clock */}
        {showShotClock ? (
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="label-muted">Shot Clock</p>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted">
                  <input
                    type="checkbox"
                    checked={autoRun}
                    onChange={(event) => setAutoRun(event.target.checked)}
                    className="h-3.5 w-3.5 accent-[#2563EB]"
                  />
                  Auto Run
                </label>
                <button
                  type="button"
                  onClick={() => setShowShotClock(false)}
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  title="Cerrar"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <p
              className={cn(
                'text-center font-mono text-5xl leading-none font-black tabular-nums',
                shotMs <= 0 ? 'text-danger' : shotMs < 5_000 ? 'text-warning' : 'text-ink',
              )}
            >
              {formatShotClock(shotMs)}
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <Button
                variant={shotClock.running ? 'warning' : 'primary'}
                size="sm"
                icon={shotClock.running ? <Pause size={14} /> : <Play size={14} />}
                onClick={() => void store().setShotClock(shotClock.running ? pauseDownTimer(shotClock) : startDownTimer(shotClock))}
                disabled={saving || autoRun}
                title={autoRun ? 'Desactiva Auto Run para controlarlo a mano' : undefined}
              >
                {shotClock.running ? 'Pausa' : 'Inicio'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void store().setShotClock(changeDownTimerMs(shotClock, 1_000))}
                disabled={saving}
              >
                +
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void store().setShotClock(changeDownTimerMs(shotClock, -1_000))}
                disabled={saving}
              >
                −
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingShotClock((value) => !value)}
                disabled={saving}
              >
                Modificar…
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void store().setShotClock(setDownTimerMs(shotClock, RESET_1_MS))}
                disabled={saving}
              >
                Reset 1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void store().setShotClock(setDownTimerMs(shotClock, RESET_2_MS))}
                disabled={saving}
              >
                Reset 2
              </Button>
            </div>

            {editingShotClock ? (
              <div className="mt-3 flex items-end gap-2 border-t border-line pt-3">
                <Field label="Segundos" className="flex-1">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={shotClockInput}
                    onChange={(event) => setShotClockInput(event.target.value)}
                    className="text-center font-mono"
                  />
                </Field>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const seconds = Number.parseInt(shotClockInput, 10)
                    if (Number.isFinite(seconds) && seconds > 0) {
                      void store().setShotClock(setDownTimerMs(shotClock, seconds * 1000))
                      setEditingShotClock(false)
                    }
                  }}
                >
                  Aplicar
                </Button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="card flex flex-col items-center justify-center gap-3 p-4">
            <p className="text-xs text-muted">Shot Clock cerrado.</p>
            <Button variant="secondary" size="sm" onClick={() => setShowShotClock(true)}>
              Abrir Shot Clock
            </Button>
          </section>
        )}
      </div>

      {match.resultConfirmed ? (
        <p className="flex items-center justify-center gap-2 text-xs font-semibold text-success">
          <CheckCircle2 size={14} /> Resultado confirmado: {match.homeScore} — {match.awayScore}
          <Badge tone="success">OK</Badge>
        </p>
      ) : null}
    </div>
  )
}
