import { useEffect, useState, type RefObject } from 'react'
import { DESIGN_CANVAS } from '@/types'

/**
 * Escala necesaria para encajar el lienzo virtual 1920×1080 dentro del
 * contenedor (letterbox centrado). Se recalcula al redimensionar.
 */
export function useCanvasScale(ref: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = (): void => {
      const { width, height } = element.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      setScale(Math.min(width / DESIGN_CANVAS.width, height / DESIGN_CANVAS.height))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref])

  return scale
}
