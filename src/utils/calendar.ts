/** Mantiene las fechas sin zona horaria en el día elegido al programarlas. */
export function calendarDayKey(kickoff: string): string {
  if (!kickoff) return 'sin-fecha'
  if (/^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$)/.test(kickoff)) return kickoff.slice(0, 10)
  const date = new Date(kickoff)
  if (Number.isNaN(date.getTime())) return 'sin-fecha'
  return localDateKey(date)
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const count = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7
  return Array.from({ length: count }, (_, index) => new Date(year, month, 1 - offset + index))
}
