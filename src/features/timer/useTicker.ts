import { useEffect, useState } from 'react'

/**
 * Fuerza un re-render periódico para derivar valores en tiempo real
 * (p. ej. el cronómetro) sin almacenar el contador en estado.
 */
export function useTicker(intervalMs = 250): number {
  const [tick, setTick] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return tick
}
