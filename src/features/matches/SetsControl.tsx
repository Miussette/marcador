import { RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useActiveMatchStore } from '@/stores/activeMatchStore'

/**
 * Panel "Sets" (vóleibol): lista los sets finalizados, muestra el set en
 * curso con sus puntos y permite finalizar/deshacer un set.
 * Los puntos del set en curso se suman con los botones de TeamScorePanel
 * (addPoints); aquí solo se gestiona el traspaso entre sets.
 */
export function SetsControl() {
  const match = useActiveMatchStore((s) => s.match)
  const saving = useActiveMatchStore((s) => s.saving)
  if (!match) return null

  const sets = match.sets ?? []
  const setsWon = sets.reduce(
    (acc, s) => {
      if (s.home > s.away) acc.home += 1
      else if (s.away > s.home) acc.away += 1
      return acc
    },
    { home: 0, away: 0 },
  )
  const isDrawn = setsWon.home === setsWon.away
  const currentSetNumber = sets.length + 1

  const canFinish = match.homeScore > 0 || match.awayScore > 0

  return (
    <section className="card p-4" data-testid="sets-control">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="label-muted flex items-center gap-2">
          <Trophy size={14} />
          Sets — Set {currentSetNumber}
        </p>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums ${
            isDrawn
              ? 'border-line bg-app text-muted'
              : setsWon.home > setsWon.away
                ? 'border-primary/60 bg-primary/15 text-blue-300'
                : 'border-amber-500/50 bg-amber-500/15 text-amber-400'
          }`}
          data-testid="sets-score"
        >
          {setsWon.home} – {setsWon.away}
        </span>
      </div>

      {/* Sets finalizados */}
      {sets.length > 0 ? (
        <ul className="mb-4 space-y-1.5" data-testid="sets-list">
          {sets.map((set, index) => {
            const winner = set.home > set.away ? 'home' : set.away > set.home ? 'away' : null
            return (
              <li
                key={index}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm"
              >
                <span className="text-muted">Set {index + 1}</span>
                <span className="font-mono font-bold tabular-nums">
                  <span className={winner === 'home' ? 'text-ink' : 'text-muted'}>{set.home}</span>
                  <span className="mx-1.5 text-muted">–</span>
                  <span className={winner === 'away' ? 'text-ink' : 'text-muted'}>{set.away}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-4 rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-muted">
          Aún no se ha finalizado ningún set.
        </p>
      )}

      {/* Set en curso */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-blue-300">Set en curso</span>
        <span className="font-mono text-lg font-black tabular-nums text-ink">
          {match.homeScore} – {match.awayScore}
        </span>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="primary"
          size="lg"
          icon={<Trophy size={16} />}
          disabled={saving || !canFinish}
          onClick={() => void useActiveMatchStore.getState().winSet('home')}
          title="Finaliza el set y lo asigna al equipo local"
        >
          Gana local
        </Button>
        <Button
          variant="secondary"
          size="lg"
          icon={<Trophy size={16} />}
          disabled={saving || !canFinish}
          onClick={() => void useActiveMatchStore.getState().winSet('away')}
          title="Finaliza el set y lo asigna al equipo visitante"
        >
          Gana visitante
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon={<RotateCcw size={14} />}
        disabled={saving || sets.length === 0}
        onClick={() => void useActiveMatchStore.getState().undoSet()}
        className="mt-2 w-full"
      >
        Deshacer último set
      </Button>
    </section>
  )
}
