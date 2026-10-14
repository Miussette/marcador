import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Match, Team } from '@/types'
import { calendarDayKey, localDateKey, monthDays } from '@/utils/calendar'
import { cn } from '@/utils/cn'

interface Props {
  matches: Match[]
  teamById: Map<string, Team>
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
  onOpenMatch: (match: Match) => void
}

export function MatchCalendar({ matches, teamById, selectedDay, onSelectDay, onOpenMatch }: Props) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const today = localDateKey(new Date())
  const days = monthDays(month.getFullYear(), month.getMonth())
  const byDay = new Map<string, Match[]>()
  for (const match of matches) {
    const key = calendarDayKey(match.kickoff)
    byDay.set(key, [...(byDay.get(key) ?? []), match])
  }
  const moveMonth = (delta: number): void => {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
    onSelectDay(null)
  }
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-line bg-surface" aria-label="Calendario mensual de partidos">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <h2 className="text-lg font-bold capitalize text-ink" aria-live="polite">{month.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); onSelectDay(today) }}>Hoy</Button>
          <Button variant="outline" size="sm" aria-label="Mes anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></Button>
          <Button variant="outline" size="sm" aria-label="Mes siguiente" onClick={() => moveMonth(1)}><ChevronRight size={16} /></Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-line bg-app/40">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <div key={day} className="p-3 text-center text-xs font-bold text-muted">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map(date => {
              const key = localDateKey(date)
              const list = byDay.get(key) ?? []
              return (
                <div key={key} className={cn('min-h-[115px] border-r border-b border-line p-2', date.getMonth() !== month.getMonth() && 'bg-app/50', selectedDay === key && 'bg-primary/10')}>
                  <button type="button" aria-label={date.toLocaleDateString('es-CL', { dateStyle: 'full' })} aria-pressed={selectedDay === key} aria-current={key === today ? 'date' : undefined} onClick={() => onSelectDay(selectedDay === key ? null : key)} className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold hover:bg-surface-2', date.getMonth() === month.getMonth() ? 'text-ink' : 'text-muted', key === today && 'bg-primary text-white')}>
                    {date.getDate()}
                  </button>
                  <div className="space-y-1">
                    {list.map(match => {
                      const home = teamById.get(match.homeTeamId)
                      const away = teamById.get(match.awayTeamId)
                      const date = new Date(match.kickoff)
                      const time = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                      return <button key={match.id} type="button" onClick={() => onOpenMatch(match)} title={`${home?.name ?? 'Local'} vs ${away?.name ?? 'Visitante'}`} className={cn('block w-full rounded-md border-l-2 px-2 py-1.5 text-left text-[11px] hover:brightness-125', match.status === 'finished' ? 'border-success bg-success/10 text-ink' : match.status === 'live' ? 'border-danger bg-danger/10 text-ink' : 'border-primary bg-primary/10 text-ink')}>
                        <span className="block font-bold">{time}{match.status === 'finished' ? ` · ${match.homeScore}–${match.awayScore}` : match.status === 'live' ? ' · En juego' : ''}</span>
                        <span className="block truncate">{home?.shortName || home?.name || 'Local'} vs {away?.shortName || away?.name || 'Visitante'}</span>
                      </button>
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 p-3 text-xs text-muted">
        <span>● Programado</span><span className="text-danger">● En juego</span><span className="text-success">● Finalizado</span>
        {selectedDay && <Button variant="ghost" size="sm" onClick={() => onSelectDay(null)}>Ver todas las fechas</Button>}
      </div>
    </section>
  )
}
