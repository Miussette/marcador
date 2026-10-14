import { create } from 'zustand'
import { api } from '@/services/api'
import type { CountdownSnapshot } from '@/types'

/* ------------------------------------------------------------------ *
 *  Cuenta atrás regresiva (calentamiento, descansos…)
 *  Igual que el cronómetro: se calcula desde timestamps, no por ticks.
 *  Se persiste en settings para recuperarla al reabrir la app.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'countdown.state'
const DEFAULT_DURATION = 5 * 60_000 // 5 minutos
const MIN_DURATION = 1_000
const MAX_DURATION = 2 * 60 * 60_000

/** ms restantes de una cuenta atrás (calculado en cliente). */
export function countdownRemaining(state: CountdownSnapshot, now: number = Date.now()): number {
  if (state.running && state.endAt !== null) return Math.max(0, state.endAt - now)
  return Math.max(0, state.remainingMs)
}

const clamp = (value: number): number =>
  Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(value)))

interface CountdownState extends CountdownSnapshot {
  initialized: boolean
  /** Carga la cuenta atrás persistida (una sola vez). */
  init: () => Promise<void>
  /** Cambia la duración y la deja pausada en el nuevo valor. */
  setDuration: (ms: number) => void
  run: () => void
  pause: () => void
  reset: () => void
  toggleVisible: () => void
  /** Detiene la cuenta al llegar a cero (llamarla desde el tick de UI). */
  settle: () => void
}

function persist(state: CountdownSnapshot): void {
  if (!window.api) return
  const payload = JSON.stringify({
    durationMs: state.durationMs,
    running: state.running,
    endAt: state.endAt,
    remainingMs: state.remainingMs,
    visible: state.visible,
  })
  void api.settings.set(STORAGE_KEY, payload).catch(() => {
    /* la persistencia de la cuenta atrás es best-effort */
  })
}

export const useCountdownStore = create<CountdownState>((set, get) => {
  const apply = (patch: Partial<CountdownSnapshot>): void => {
    const next = { ...get(), ...patch }
    set(patch)
    persist(next)
  }

  return {
    durationMs: DEFAULT_DURATION,
    running: false,
    endAt: null,
    remainingMs: DEFAULT_DURATION,
    visible: false,
    initialized: false,

    init: async () => {
      if (get().initialized) return
      try {
        const raw = await api.settings.get(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<CountdownSnapshot>
          const durationMs = clamp(Number(parsed.durationMs) || DEFAULT_DURATION)
          const visible = parsed.visible === true
          const running = parsed.running === true && typeof parsed.endAt === 'number'
          const endAt = running ? (parsed.endAt as number) : null
          const expired = running && endAt !== null && endAt <= Date.now()
          set({
            durationMs,
            visible,
            running: running && !expired,
            endAt: expired ? null : endAt,
            remainingMs: expired
              ? 0
              : clamp(Number(parsed.remainingMs) || durationMs) > durationMs
                ? durationMs
                : Math.max(0, Number(parsed.remainingMs) || durationMs),
            initialized: true,
          })
          return
        }
      } catch (error) {
        console.warn('[countdown] No se pudo restaurar la cuenta atrás:', error)
      }
      set({ initialized: true })
    },

    setDuration: (ms) => {
      const durationMs = clamp(ms)
      apply({ durationMs, running: false, endAt: null, remainingMs: durationMs })
    },

    run: () => {
      const state = get()
      if (state.running) return
      const remaining = countdownRemaining(state)
      const ms = remaining > 0 ? remaining : state.durationMs
      apply({ running: true, endAt: Date.now() + ms, remainingMs: ms })
    },

    pause: () => {
      const state = get()
      if (!state.running) return
      apply({ running: false, endAt: null, remainingMs: countdownRemaining(state) })
    },

    reset: () => {
      apply({ running: false, endAt: null, remainingMs: get().durationMs })
    },

    toggleVisible: () => {
      apply({ visible: !get().visible })
    },

    settle: () => {
      const state = get()
      if (state.running && countdownRemaining(state) <= 0) {
        set({ running: false, endAt: null, remainingMs: 0 })
        persist({ ...state, running: false, endAt: null, remainingMs: 0 })
      }
    },
  }
})
