import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  Film,
  Images,
  Keyboard,
  LayoutDashboard,
  ListVideo,
  Loader2,
  MonitorPlay,
  Radio,
  RefreshCw,
  Settings,
  Shield,
  Trophy,
  User,
  UserRound,
  Users,
} from 'lucide-react'
import { useProjectsStore } from '@/stores/projectsStore'
import { useMatchesStore } from '@/stores/matchesStore'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: 'matches', label: 'Partidos', icon: CalendarDays },
  { to: 'teams', label: 'Equipos', icon: Shield },
  { to: 'players', label: 'Jugadores', icon: Users },
  { to: 'participants', label: 'Participantes', icon: UserRound },
  { to: 'competition', label: 'Competencia', icon: Trophy },
  { to: 'calendar', label: 'Calendario', icon: CalendarRange },
  { to: 'standings', label: 'Tabla de posiciones', icon: Trophy },
  { to: 'scoreboard', label: 'Marcador', icon: MonitorPlay },
  { to: 'multimedia', label: 'Multimedia', icon: Images },
  { to: 'videos', label: 'Videos', icon: Film },
  { to: 'sequences', label: 'Secuencias', icon: ListVideo },
  { to: 'sponsors', label: 'Sponsors', icon: RefreshCw },
  { to: 'obs', label: 'OBS / Streaming', icon: Radio },
  { to: 'shortcuts', label: 'Atajos', icon: Keyboard },
  { to: 'operators', label: 'Operadores', icon: User },
  { to: 'settings', label: 'Configuración', icon: Settings },
]

export function ProjectSidebar() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const projects = useProjectsStore((state) => state.projects)
  const projectsLoading = useProjectsStore((state) => state.loading)
  const activeMatchId = useMatchesStore((state) => state.activeMatchId)
  const matches = useMatchesStore((state) => state.matches)

  const project = projects.find((p) => p.id === projectId) ?? null
  const activeMatch = matches.find((m) => m.id === activeMatchId) ?? null

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
            MP
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-ink">Marcador Pro</p>
            <p className="truncate text-[11px] text-muted">Control deportivo</p>
          </div>
        </div>
      </div>

      <div className="border-b border-line px-5 py-4">
        <p className="label-muted mb-1">Proyecto</p>
        {projectsLoading && !project ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" /> Cargando…
          </div>
        ) : project ? (
          <>
            <p className="truncate text-sm font-semibold text-ink" title={project.name}>
              {project.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {project.season || 'Sin temporada'} · {project.location || 'Sin sede'}
            </p>
          </>
        ) : (
          <p className="text-xs text-danger">Proyecto no encontrado</p>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to === '' ? '.' : item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-blue-300 border border-primary/40'
                  : 'text-muted hover:bg-surface-2 hover:text-ink border border-transparent',
              )
            }
          >
            <item.icon size={17} />
            <span className="flex-1">{item.label}</span>
            {item.to === 'scoreboard' && activeMatch ? (
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse-dot" title="Partido activo" />
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        {activeMatch ? (
          <button
            type="button"
            onClick={() => navigate(`/p/${projectId}/control/${activeMatch.id}`)}
            className="mb-2 w-full rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-left transition-colors hover:bg-danger/20"
          >
            <span className="label-muted block text-danger">Partido activo</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-ink">
              {activeMatch.homeScore} — {activeMatch.awayScore}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft size={16} />
          Volver a Proyectos
        </button>
      </div>
    </aside>
  )
}
