import type { OverlayPayload } from '../src/types'

export type PlaybackItem = Omit<OverlayPayload, 'id'>

/** Una sola cola: reemplazar o detener cancela todos los cambios pendientes. */
export class PlaybackQueue {
  private timer: ReturnType<typeof setTimeout> | undefined
  private generation = 0
  constructor(private emit: (item: PlaybackItem | null) => void) {}

  stop(): void {
    this.generation += 1
    clearTimeout(this.timer)
    this.emit(null)
  }

  play(items: PlaybackItem[], loop: boolean): void {
    if (!items.length) throw new Error('No hay contenido disponible para reproducir.')
    if (items.some(item => !Number.isFinite(item.durationMs) || item.durationMs < 1000)) {
      throw new Error('La duración debe ser de al menos un segundo.')
    }
    this.stop()
    const generation = this.generation
    const next = (index: number): void => {
      if (generation !== this.generation) return
      const item = items[index]
      this.emit(item)
      this.timer = setTimeout(() => {
        if (index + 1 < items.length) next(index + 1)
        else if (loop) next(0)
        else this.stop()
      }, item.durationMs)
    }
    next(0)
  }
}
