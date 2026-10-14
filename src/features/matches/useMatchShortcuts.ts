import { ruleFamily } from '@/features/sports/rules'
import { useEffect, useRef } from 'react'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { useDisplayStore } from '@/stores/displayStore'
import { activeShortcuts, keyboardShortcut, normalizeShortcut } from '@/utils/shortcuts'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { useCountdownStore } from '@/stores/countdownStore'
import { isQuarterSport, isSetSport } from '@/utils/format'
import { signalHorn } from '@/features/serial/hornSound'
import { createDownTimer, pauseDownTimer, resetDownTimer, setDownTimerMs, startDownTimer } from '@/features/timer/timer'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * Atajos del operador (Fase 1):
 *  SPACE       iniciar / pausar cronómetro
 *  Q / P       gol local / gol visitante
 *  CTRL+Q/P    restar gol local / visitante
 *  F11         pantalla completa del marcador
 */
export function useMatchShortcuts(onAddEvent?: () => void): void {
  const addEventRef = useRef(onAddEvent)
  addEventRef.current = onAddEvent
  useEffect(() => {
    void useShortcutsStore.getState().load()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target) || document.querySelector('[role="dialog"]')) return

      const store = useActiveMatchStore.getState()
      const match = store.match
      if (!match) return


      if (event.repeat) return
      const combo = keyboardShortcut(event)
      const binding = activeShortcuts(useShortcutsStore.getState().items).find(item => normalizeShortcut(item.keys) === combo)
      if (!binding) return
      event.preventDefault()
      if (store.saving) return
      const basketball = isQuarterSport(match.sportState?.sport ?? store.project?.sport ?? '')
      const breakTimer = match.breakTimer ?? createDownTimer(60000)
      const shotTimer = match.shotClock ?? createDownTimer(24000)
      const pointSport = isSetSport(store.project?.sport ?? '') || isQuarterSport(store.project?.sport ?? '')
      const score = (side: 'home' | 'away', delta: number): void => {
        const family = ruleFamily(match.sportState?.sport ?? store.project?.sport ?? '')
        if (family) {
          if (delta < 0) void store.sportAction({ type: 'undo' })
          else if (family === 'baseball') void store.sportAction({ type: 'run', side, delta: 1 })
          else if (family === 'tennis' || family === 'sets' || (family === 'combat' && (match.sportState?.sport ?? store.project?.sport) !== 'judo')) void store.sportAction({ type: 'point', side })
          return
        }
        if (pointSport) void store.addPoints(side, delta)
        else if (delta > 0) void store.addGoal(side)
        else void store.removeGoal(side)
      }
      switch (binding.action) {
        case 'points.home2': if (basketball) void store.addPoints('home', 2); break
        case 'points.home3': if (basketball) void store.addPoints('home', 3); break
        case 'points.away2': if (basketball) void store.addPoints('away', 2); break
        case 'points.away3': if (basketball) void store.addPoints('away', 3); break
        case 'horn.send': void signalHorn(); break
        case 'break.toggle': if (basketball) void store.setBreakTimer(breakTimer.running ? pauseDownTimer(breakTimer) : startDownTimer(breakTimer)); break
        case 'break.reset': if (basketball) void store.setBreakTimer(resetDownTimer(breakTimer)); break
        case 'break.30': if (basketball) void store.setBreakTimer(createDownTimer(30000)); break
        case 'break.60': if (basketball) void store.setBreakTimer(createDownTimer(60000)); break
        case 'break.90': if (basketball) void store.setBreakTimer(createDownTimer(90000)); break
        case 'shot.toggle': if (basketball) void store.setShotClock(shotTimer.running ? pauseDownTimer(shotTimer) : startDownTimer(shotTimer)); break
        case 'shot.24': if (basketball) void store.setShotClock(setDownTimerMs(shotTimer, 24000)); break
        case 'shot.14': if (basketball) void store.setShotClock(setDownTimerMs(shotTimer, 14000)); break
        case 'goal.home': score('home', 1); break
        case 'goal.away': score('away', 1); break
        case 'goal.removeHome': score('home', -1); break
        case 'goal.removeAway': score('away', -1); break
        case 'clock.toggle':
          if (match.timerRunning) void store.pauseClock()
          else if (match.timerElapsed > 0) void store.resumeClock()
          else void store.startClock()
          break
        case 'clock.reset': void store.resetClock(); break
        case 'display.fullscreen': void useDisplayStore.getState().toggleFullscreen(); break
        case 'event.add': addEventRef.current?.(); break
        case 'countdown.toggle': useCountdownStore.getState().toggleVisible(); store.syncNow(); break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
