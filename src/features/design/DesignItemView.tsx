import { scoreText } from '@/features/sports/display'
import type { ReactNode } from 'react'
import { downTimerRemaining } from '@/features/timer/timer'
import { previewState } from '@/features/design/designModel'
import type { DesignItem, DisplayState } from '@/types'
import { formatClock } from '@/utils/time'

interface DesignItemViewProps {
  item: DesignItem
  /** Estado en vivo de la pantalla. Si es null se usa un estado de ejemplo. */
  state?: DisplayState | null
  /** Cronómetro ya calculado (ms). */
  elapsedMs?: number
}

const ALIGN: Record<DesignItem['align'], 'flex-start' | 'center' | 'flex-end'> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

function shotClockLabel(state: DisplayState): string {
  const ms = state.shotClock ? downTimerRemaining(state.shotClock) : 24_000
  if (ms <= 0) return '0.0'
  return ms < 5000 ? (ms / 1000).toFixed(1) : String(Math.ceil(ms / 1000))
}

/**
 * Renderiza un ítem del diseño. Lo comparten la ventana Display y el editor,
 * de modo que lo que se ve en el lienzo es exactamente lo que se emite.
 */
export function DesignItemView({ item, state, elapsedMs }: DesignItemViewProps) {
  const live = state ?? previewState()
  const team = item.side === 'away' ? live.away : live.home

  let content: ReactNode = null
  /** Padding interno: los bloques llenos el ítem, el resto deja respirar el texto. */
  let padding = '0 0.35em'

  switch (item.type) {
    case 'title':
      content = <span className="truncate">{item.text || live.competition || 'Título del partido'}</span>
      break
    case 'text':
      content = <span>{item.text || 'Etiqueta'}</span>
      break
    case 'box':
      padding = '0'
      break
    case 'image':
      if (item.src) {
        padding = '0'
        content = <img src={item.src} alt="" className="h-full w-full object-contain" draggable={false} />
      } else {
        content = <span className="text-[0.5em] opacity-60">Imagen</span>
      }
      break
    case 'team_home':
    case 'team_away': {
      if (item.fullTeamName) padding = '0'
      const name = (item.fullTeamName ? team?.name : team?.shortName || team?.name) || (item.side === 'away' ? 'Visitante' : 'Local')
      content = (
        <span className="truncate font-black uppercase tracking-wide" style={item.fullTeamName ? { fontSize: `${Math.max(0.45, Math.min(1, (item.w - item.fontSize * 0.7) / (name.length * item.fontSize * 0.7)))}em` } : undefined}>
          {name}
        </span>
      )
      break
    }
    case 'score_home':
    case 'score_away':
      padding = '0'
      content = (
        <span className="font-black tabular-nums" style={{ fontFamily: item.fontFamily || 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <span style={{ fontSize: `${Math.min(1, item.w / (Math.max(1, scoreText(live, item.side === 'away' ? 'away' : 'home').length) * item.fontSize * 0.65))}em` }}>{scoreText(live, item.side === 'away' ? 'away' : 'home')}</span>
        </span>
      )
      break
    case 'period':
      content = <span className="font-bold tracking-wider uppercase">{live.periodLabel}</span>
      break
    case 'clock': {
      const clock = item.clockStyle === 'basketball' && (elapsedMs ?? 0) < 60_000 ? (Math.max(0, elapsedMs ?? 0) / 1000).toFixed(1) : formatClock(elapsedMs ?? 0)
      padding = '0'
      content = (
        <span className="font-black tabular-nums" style={{ fontFamily: item.fontFamily || 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: `${Math.min(1, item.w / (clock.length * item.fontSize * 0.65))}em` }}>
          {clock}
        </span>
      )
      break
    }
    case 'shot_clock':
      content = (
        <span className="font-black tabular-nums" style={{ fontFamily: item.fontFamily || 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {shotClockLabel(live)}
        </span>
      )
      break
    case 'fouls_home':
    case 'fouls_away':
      content = (
        <span className="font-black tabular-nums" style={{ fontFamily: item.fontFamily || 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {item.side === 'away' ? (live.awayFouls ?? 0) : (live.homeFouls ?? 0)}
        </span>
      )
      break
    case 'timeouts_home':
    case 'timeouts_away': {
      padding = '0'
      const used = item.side === 'away' ? live.awayTimeouts ?? 0 : live.homeTimeouts ?? 0
      content = <span className="flex h-full w-full items-center justify-center gap-[0.18em]" aria-label={`${used} tiempos muertos utilizados`}>{Array.from({ length: Math.max(3, used) }, (_, i) => <span key={i} className="h-[0.7em] w-[0.7em] border" style={{ background: i < used ? item.color : 'transparent', borderColor: item.color }} />)}</span>
      break
    }
    case 'possession_home':
    case 'possession_away': {
      const active = live.possession === item.side
      const points = item.side === 'away' ? '20,12 80,50 20,88' : '80,12 20,50 80,88'
      padding = '0'
      content = <svg viewBox="0 0 100 100" className="h-full w-full" aria-label={`Posesión ${item.side === 'away' ? 'visitante' : 'local'}${active ? ' activa' : ''}`}><polygon points={points} stroke={active ? item.activeColor || '#00ff00' : item.color} strokeWidth="2" fill={active ? item.activeColor || '#00ff00' : 'none'} /></svg>
      break
    }
    case 'player_stats_row': {
      const player = team?.players?.[(item.index ?? 1) - 1]
      if (state && !player) return null
      const stat = player ? live.playerStats?.[player.id] : null
      padding = '0'
      content = <span className="grid h-full w-full grid-cols-[2ch_minmax(0,1fr)_auto_2ch] items-center gap-[0.22em]" data-player-row={player?.id ?? item.index}>
        <span className="tabular-nums">{player?.number ?? item.index}</span>
        <span className="truncate">{player ? `${player.firstName} ${player.lastName}`.trim() : 'Jugador'}</span>
        <span className="flex gap-[0.07em]" aria-label={`${stat?.fouls ?? 0} faltas`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className="h-[0.5em] w-[0.5em] rounded-full border" style={{ borderColor: item.indicatorColor || '#dddddd', background: i < (stat?.fouls ?? 0) ? item.activeColor || '#ffff00' : 'transparent' }} />)}</span>
        <span className="text-right tabular-nums">{stat?.points ?? 0}</span>
      </span>
      break
    }
    case 'logo_home':
    case 'logo_away': {
      if (team?.logo) {
        padding = '0'
        content = <img src={team.logo} alt={team.name} className="h-full w-full object-contain" draggable={false} />
      } else {
        padding = '6%'
        content = (
          <span
            className="flex h-full w-full items-center justify-center rounded-[inherit] text-[0.42em] font-black text-white"
            style={{ backgroundColor: team?.primaryColor ?? '#334155' }}
          >
            {(team?.shortName || team?.name || '---').slice(0, 3).toUpperCase()}
          </span>
        )
      }
      break
    }
    case 'player_row':
      content = (
        <span className="flex h-full w-full items-center gap-[0.7em]">
          <span
            className="flex h-[0.9em] min-w-[0.9em] items-center justify-center rounded-[0.18em] px-[0.22em] font-black tabular-nums"
            style={{ backgroundColor: team?.primaryColor ?? '#1E293B', fontSize: '0.86em' }}
          >
            {item.index ?? 1}
          </span>
          <span className="truncate font-semibold">{item.text || 'Nombre jugador'}</span>
        </span>
      )
      break
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: ALIGN[item.align],
        boxSizing: 'border-box',
        padding,
        gap: '0.3em',
        backgroundColor: item.bg || 'transparent',
        backgroundImage: item.bg.startsWith('url(') || item.bg.includes('gradient(') ? item.bg : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: item.radius || 0,
        color: item.color || '#F8FAFC',
        fontSize: `${item.fontSize}px`,
        fontFamily: item.fontFamily,
        lineHeight: 1.05,
        textAlign: item.align,
        whiteSpace: 'nowrap',
      }}
    >
      {content}
    </div>
  )
}
