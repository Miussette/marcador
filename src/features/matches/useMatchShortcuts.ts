import { ruleFamily } from '@/features/sports/rules'
import { useEffect, useRef } from 'react'
import { useActiveMatchStore } from '@/stores/activeMatchStore'
import { useDisplayStore } from '@/stores/displayStore'
import { activeShortcuts, keyboardShortcut, normalizeShortcut } from '@/utils/shortcuts'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { useCountdownStore } from '@/stores/countdownStore'
import { isQuarterSport, isSetSport } from '@/utils/format'

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
      if (isTypingTarget(event.target)) return

      const store = useActiveMatchStore.getState()
      const match = store.match
      if (!match) return


      if (event.repeat) return
      const combo = keyboardShortcut(event)
      const binding = activeShortcuts(useShortcutsStore.getState().items).find(item => normalizeShortcut(item.keys) === combo)
      if (!binding) return
      event.preventDefault()
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
