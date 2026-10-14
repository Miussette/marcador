/** Formato mm:ss; desde 100 minutos, hh:mm:ss. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const totalMinutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const mm = String(totalMinutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (totalMinutes >= 100) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${minutes}:${ss}`
  }
  return `${mm}:${ss}`
}

/** Minuto de partido aproximado para eventos (1-based, 0 si no arrancó). */
export function matchMinute(ms: number): number {
  if (ms <= 0) return 0
  return Math.floor(ms / 60000) + 1
}

export function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** '2026-10-02' -> '02/10/2026' (devuelve el valor tal cual si no es fecha ISO) */
export function formatDate(iso: string): string {
  if (!iso) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return iso
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
