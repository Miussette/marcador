import { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { ProjectSidebar } from '@/components/layout/ProjectSidebar'
import { LoadingBlock } from '@/components/ui/Feedback'
import { useMatchesStore } from '@/stores/matchesStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useTeamsStore } from '@/stores/teamsStore'
import { toast } from '@/stores/toastStore'

export function ProjectLayout() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const projects = useProjectsStore((state) => state.projects)
  const projectsLoading = useProjectsStore((state) => state.loading)
  const projectsLoaded = useProjectsStore((state) => state.loaded)
  const loadProjects = useProjectsStore((state) => state.load)
  const loadMatches = useMatchesStore((state) => state.load)
  const loadTeams = useTeamsStore((state) => state.load)

  const project = projects.find((p) => p.id === projectId) ?? null

  // Un proyecto "ausente" en la lista puede ser un desfase de caché (p. ej. creado
  // o restaurado fuera de este store). Se reintenta una recarga antes de darlo por
  // inexistente. El estado se lee en fresco para evitar falsos positivos cuando
  // React ejecuta dos veces el efecto (StrictMode).
  const refreshTriedRef = useRef(false)

  useEffect(() => {
    refreshTriedRef.current = false
  }, [projectId])

  useEffect(() => {
    if (!projectsLoaded && !projectsLoading) void loadProjects()
  }, [projectsLoaded, projectsLoading, loadProjects])

  useEffect(() => {
    if (!projectId) return
    void loadMatches(projectId)
    void loadTeams(projectId)
  }, [projectId, loadMatches, loadTeams])

  useEffect(() => {
    if (!projectId || project) return
    const state = useProjectsStore.getState()
    if (!state.loaded || state.loading || projectsLoading) return
    if (!refreshTriedRef.current) {
      refreshTriedRef.current = true
      void loadProjects()
      return
    }
    toast.error('El proyecto solicitado no existe.')
    navigate('/', { replace: true })
  }, [projectId, project, projectsLoading, navigate, loadProjects])

  if (!project) return <LoadingBlock label="Abriendo proyecto…" />

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
