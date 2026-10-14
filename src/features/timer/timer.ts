import type { TimerSnapshot, DownTimerSnapshot } from '@/types'

/* ------------------------------------------------------------------ *
 *  Cronómetro basado en timestamps.
 *
 *  El estado guarda SIEMPRE cuándo arrancó (epoch ms) y cuánto se
 *  acumuló antes, nunca "un número que sube cada segundo". Así el
 *  valor real se deriva de Date.now() y sobrevive a retrasos de
 *  renderizado, pausas de la UI o un cierre inesperado de la app.
 * ------------------------------------------------------------------ */

export const createTimer = (): TimerSnapshot => ({
  running: false,
  startedAt: null,
  elapsed: 0,
})

export function timerElapsed(timer: TimerSnapshot, now: number = Date.now()): number {
  const base = Math.max(0, timer.elapsed)
  if (timer.running && timer.startedAt !== null) {
    return base + Math.max(0, now - timer.startedAt)
  }
  return base
}

export function startTimer(): TimerSnapshot {
  return { running: true, startedAt: Date.now(), elapsed: 0 }
}

export function pauseTimer(timer: TimerSnapshot, now: number = Date.now()): TimerSnapshot {
  if (!timer.running) return timer
  return { running: false, startedAt: null, elapsed: timerElapsed(timer, now) }
}

export function resumeTimer(timer: TimerSnapshot): TimerSnapshot {
  if (timer.running) return timer
  return { running: true, startedAt: Date.now(), elapsed: Math.max(0, timer.elapsed) }
}

export function resetTimer(): TimerSnapshot {
  return { running: false, startedAt: null, elapsed: 0 }
}

export function setTimerMs(timer: TimerSnapshot, ms: number, now: number = Date.now()): TimerSnapshot {
  const total = Math.max(0, ms)
  if (timer.running) return { running: true, startedAt: now - total, elapsed: 0 }
  return { running: false, startedAt: null, elapsed: total }
}

export function addTime(timer: TimerSnapshot, deltaMs: number, now: number = Date.now()): TimerSnapshot {
  return setTimerMs(timer, timerElapsed(timer, now) + deltaMs, now)
}

/* ------------------------------------------------------------------ *
 *  Cuenta atrás (shot clock / break timer) basada en timestamps.
 *  Igual filosofía que el cronómetro: mientras corre, el valor
 *  restante se deriva de `endAt`, nunca de ticks acumulados.
 * ------------------------------------------------------------------ */

export function createDownTimer(durationMs: number): DownTimerSnapshot {
  return { durationMs, running: false, endAt: null, remainingMs: durationMs }
}

/** ms restantes de una cuenta atrás. */
export function downTimerRemaining(timer: DownTimerSnapshot | null, now: number = Date.now()): number {
  if (!timer) return 0
  if (timer.running && timer.endAt !== null) return Math.max(0, timer.endAt - now)
  return Math.max(0, timer.remainingMs)
}

export function startDownTimer(timer: DownTimerSnapshot, now: number = Date.now()): DownTimerSnapshot {
  const remaining = downTimerRemaining(timer, now) || timer.durationMs
  return { ...timer, running: true, endAt: now + remaining }
}

export function pauseDownTimer(timer: DownTimerSnapshot, now: number = Date.now()): DownTimerSnapshot {
  if (!timer.running) return timer
  return { ...timer, running: false, endAt: null, remainingMs: downTimerRemaining(timer, now) }
}

export function resetDownTimer(timer: DownTimerSnapshot): DownTimerSnapshot {
  return { ...timer, running: false, endAt: null, remainingMs: timer.durationMs }
}

/** Fija los ms restantes (redondea al entero más cercano). */
export function setDownTimerMs(timer: DownTimerSnapshot, ms: number, now: number = Date.now()): DownTimerSnapshot {
  const remaining = Math.max(0, Math.round(ms))
  if (timer.running) return { ...timer, endAt: now + remaining, remainingMs: remaining }
  return { ...timer, endAt: null, remainingMs: remaining }
}

export function changeDownTimerMs(timer: DownTimerSnapshot, deltaMs: number, now: number = Date.now()): DownTimerSnapshot {
  return setDownTimerMs(timer, downTimerRemaining(timer, now) + deltaMs, now)
}
