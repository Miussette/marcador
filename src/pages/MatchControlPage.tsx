import { Modal } from '@/components/ui/Modal'
import { ScreenSetup } from '@/features/display/ScreenSetup'
import { SportControl } from '@/features/sports/SportControl'
import { ruleFamily } from '@/features/sports/rules'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Maximize, MonitorPlay, Pencil, X } from 'lucide-react'
import { Badge, LoadingBlock, Spinner } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { BasketballControl } from '@/features/matches/BasketballControl'
import { CountdownPanel } from '@/features/matches/CountdownPanel'
import { EventFormModal } from '@/features/matches/EventFormModal'
import { EventTimeline } from '@/features/matches/EventTimeline'
import { SetsControl } from '@/features/matches/SetsControl'
import { TeamScorePanel } from '@/features/matches/TeamScorePanel'
import { TimerPanel } from '@/features/matches/TimerPanel'
import { useMatchShortcuts } from '@/features/matches/useMatchShortcuts'
import { timerElapsed } from '@/features/timer/timer'
import { useTicker } from '@/features/timer/useTicker'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { useDisplayStore } from '@/stores/displayStore'
import { usePlayersStore } from '@/stores/playersStore'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { HornControls } from '@/features/serial/HornControls'
import { QuickVideos } from '@/features/matches/QuickVideos'
import { KeyboardControls } from '@/features/matches/KeyboardControls'
import { activeShortcuts, EXTRA_SHORTCUT_ACTIONS } from '@/utils/shortcuts'
import { STATUS_META, isQuarterSport, isSetSport } from '@/utils/format'
import { formatClock, formatDate, matchMinute } from '@/utils/time'
import type { MatchEvent } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(EXTRA_SHORTCUT_ACTIONS.map(item => [item.value, item.label])),
  'clock.toggle': 'Iniciar / pausar', 'clock.reset': 'Reiniciar cron?metro',
  'goal.home': 'Puntuaci?n local', 'goal.away': 'Puntuaci?n visitante',
  'goal.removeHome': 'Restar local', 'goal.removeAway': 'Restar visitante',
  'display.fullscreen': 'Pantalla completa', 'event.add': 'A?adir evento',
  'countdown.toggle': 'Mostrar / ocultar cuenta atr?s',
}

export function MatchControlPage() {
  const { projectId = '', matchId = '' } = useParams()
  const navigate = useNavigate()
  const tick = useTicker(200)

  const { match, project, home, away, events, loading, error, saving, playersVisible } = useActiveMatchStore()
  const display = useDisplayStore()
  const shortcutBindings = useShortcutsStore(state => state.items)
  const players = usePlayersStore((state) => state.playersByTeam)
  const loadTeam = usePlayersStore((state) => state.reloadTeam)

  const [screensOpen, setScreensOpen] = useState(false)
  const [compact, setCompact] = useState(() => localStorage.getItem('match.control.compact') !== 'false')
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null)

  useMatchShortcuts(() => setEventModalOpen(true))

  useEffect(() => {
    void useActiveMatchStore.getState().load(matchId)
    return () => {
      useActiveMatchStore.getState().unload()
    }
  }, [matchId])

  useEffect(() => {
    void useDisplayStore.getState().refresh()
  }, [])

  useEffect(() => {
    if (home) void loadTeam(home.id)
    if (away) void loadTeam(away.id)
  }, [home, away, loadTeam])

  useEffect(() => {
    useActiveMatchStore.getState().syncNow()
  }, [players])

  const allPlayers = [
    ...(players[home?.id ?? ''] ?? []),
    ...(players[away?.id ?? ''] ?? []),
  ]

  if (loading && !match) {
    return (
      <div className="h-screen bg-app">
        <LoadingBlock label="Abriendo el partido…" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-app px-6 text-center">
        <p className="text-sm font-semibold text-danger">{error ?? 'Partido no disponible'}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted">
          El partido pudo haber sido eliminado o el enlace ya no es válido.
        </p>
        <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(`/p/${projectId}/matches`)}>
          Volver a partidos
        </Button>
      </div>
    )
  }

  const store = useActiveMatchStore.getState()
  const basketball = isQuarterSport(match.sportState?.sport ?? project?.sport ?? '')
  const football = ['football', 'football7', 'futsal'].includes(match.sportState?.sport ?? project?.sport ?? '')
  const specialized = ruleFamily(match.sportState?.sport ?? project?.sport ?? '')
  const volleyball = isSetSport(project?.sport ?? '')
  const elapsedMs = timerElapsed(
    { running: match.timerRunning, startedAt: match.timerStartedAt, elapsed: match.timerElapsed },
    tick,
  )
  const showPlayers = playersVisible ?? (!match.timerRunning && match.timerElapsed === 0 && match.status !== 'finished')
  const status = STATUS_META[match.status]

  return (
    <div data-match-controls className={`flex h-screen flex-col overflow-hidden bg-app${compact ? ' match-compact' : ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate(`/p/${projectId}/matches`)}>
            Salir
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-ink">{match.competition || project?.name || 'Partido'}</p>
              <Badge tone={match.status === 'live' ? 'danger' : match.status === 'finished' ? 'success' : 'default'} dot={match.status === 'live'}>
                {status.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {[formatDate(match.kickoff.slice(0, 10)), match.round, match.venue || project?.location]
                .filter(Boolean)
                .join(' · ') || 'Sin detalle'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCompact(current => { localStorage.setItem('match.control.compact', String(!current)); return !current })}>{compact ? 'Vista normal' : 'Vista compacta'}</Button>
          {football && <HornControls />}
          <Button variant="outline" size="sm" onClick={() => setScreensOpen(true)}>3 pantallas</Button>
          <Button variant="outline" size="sm" onClick={() => store.setPlayersVisible(!showPlayers)}>
            {showPlayers ? 'Ocultar jugadores' : 'Mostrar jugadores'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Pencil size={15} />}
            onClick={() => navigate(`/p/${projectId}/design`)}
          >
            Diseño…
          </Button>
          <span className="hidden items-center gap-1.5 text-[11px] text-muted sm:flex">
            {saving ? (
              <>
                <Spinner size={13} /> Guardando…
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Autoguardado
              </>
            )}
          </span>

          {display.isOpen ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<Maximize size={15} />}
                onClick={() => void display.toggleFullscreen()}
                title="F11"
              >
                Pantalla completa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={15} />}
                onClick={() => void display.close()}
              >
                Cerrar pantalla
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<MonitorPlay size={16} />}
              onClick={() => void display.openOn()}
            >
              Abrir marcador
            </Button>
          )}
        </div>
      </header>
      <KeyboardControls />
      <QuickVideos projectId={match.projectId} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {basketball ? (
          <BasketballControl match={match} home={home} away={away} elapsedMs={elapsedMs} saving={saving} />
        ) : specialized && project ? (
          <SportControl match={match} sport={match.sportState?.sport ?? project.sport} home={home} away={away} players={allPlayers} elapsedMs={elapsedMs} saving={saving} />
        ) : (
          <>
        <div className="grid flex-1 grid-cols-1 items-stretch gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_400px_1fr]">
          <TeamScorePanel
            side="home"
            team={home}
            score={match.homeScore}
            disabled={saving}
            pointLabel={volleyball ? 'Punto' : undefined}
            onAddGoal={() => void (volleyball ? store.addPoints('home', 1) : store.addGoal('home'))}
            onRemoveGoal={() => void (volleyball ? store.addPoints('home', -1) : store.removeGoal('home'))}
          />

          <TimerPanel
            match={match}
            elapsedMs={elapsedMs}
            onStart={() => void store.startClock()}
            onPause={() => void store.pauseClock()}
            onResume={() => void store.resumeClock()}
            onReset={() => void store.resetClock()}
            onAdjust={(delta) => void store.adjustClock(delta)}
            onSetPeriod={(period) => void store.setPeriod(period)}
            onSetStatus={(statusOption) => void store.setStatus(statusOption)}
            onAdjustAdded={(delta) => void store.adjustAddedTime(delta)}
          />

          <TeamScorePanel
            side="away"
            team={away}
            score={match.awayScore}
            disabled={saving}
            pointLabel={volleyball ? 'Punto' : undefined}
            onAddGoal={() => void (volleyball ? store.addPoints('away', 1) : store.addGoal('away'))}
            onRemoveGoal={() => void (volleyball ? store.addPoints('away', -1) : store.removeGoal('away'))}
          />
        </div>

        <div
          className={`grid max-h-[46vh] grid-cols-1 gap-4 overflow-y-auto border-t border-line bg-surface p-4 ${
            volleyball ? 'lg:grid-cols-[1fr_300px_300px_300px]' : 'lg:grid-cols-[1fr_300px_300px]'
          }`}
        >
          <EventTimeline
            events={events}
            home={home}
            away={away}
            players={allPlayers}
            onRemove={(eventId) => void useActiveMatchStore.getState().removeEvent(eventId)}
            onEdit={(event) => {
              setEditingEvent(event)
              setEventModalOpen(true)
            }}
          />

          {volleyball && <SetsControl />}

          <CountdownPanel />

          <div className="card p-4">
            <p className="label-muted mb-3">Atajos de teclado</p>
            <ul className="space-y-1.5">
              {activeShortcuts(shortcutBindings).map((shortcut) => (
                <li key={shortcut.keys} className="flex items-center justify-between gap-3 text-xs">
                  <kbd className="rounded border border-line bg-app px-2 py-1 font-mono text-[11px] font-semibold text-ink">
                    {shortcut.keys}
                  </kbd>
                  <span className="text-muted">{ACTION_LABELS[shortcut.action] ?? shortcut.action}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
              Cronómetro actual: <span className="font-mono text-ink tabular-nums">{formatClock(elapsedMs)}</span>
              {match.timerRunning ? ' (en marcha)' : ' (detenido)'}
            </p>
          </div>
        </div>
          </>
        )}
      </main>

      <Modal open={screensOpen} onClose={() => setScreensOpen(false)} title="Configurar las 3 pantallas" size="xl"><ScreenSetup /></Modal>
      <EventFormModal
        open={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false)
          setEditingEvent(null)
        }}
        matchId={match.id}
        teams={[home, away].filter((t): t is NonNullable<typeof t> => t !== null)}
        players={allPlayers}
        currentMinute={matchMinute(elapsedMs)}
        event={editingEvent}
        onSubmit={async (input) => {
          if (editingEvent) {
            await useActiveMatchStore.getState().updateEvent(editingEvent.id, {
              minute: input.minute,
              description: input.description,
              playerId: input.playerId,
              secondaryPlayerId: input.secondaryPlayerId,
              teamId: input.teamId,
            })
          } else {
            await useActiveMatchStore.getState().addEvent(input)
          }
          return true
        }}
      />
    </div>
  )
}
