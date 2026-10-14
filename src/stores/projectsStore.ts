import { create } from 'zustand'
import { pushDisplayState } from '@/services/displaySync'
import { api } from '@/services/api'
import type { NewProjectInput, Project } from '@/types'
import { toast } from './toastStore'
import { useActiveMatchStore } from './activeMatchStore'
import { useMatchesStore } from './matchesStore'

interface ProjectsState {
  projects: Project[]
  loading: boolean
  loaded: boolean
  error: string | null
  /** id del proyecto sobre el que hay una operación en curso */
  busyId: string | null

  load: () => Promise<void>
  create: (input: NewProjectInput) => Promise<Project | null>
  update: (id: string, patch: Partial<NewProjectInput>) => Promise<Project | null>
  remove: (id: string) => Promise<boolean>
  duplicate: (id: string) => Promise<Project | null>
  exportProject: (id: string) => Promise<void>
  importProject: () => Promise<Project | null>
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  loaded: false,
  error: null,
  busyId: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await api.projects.list()
      set({ projects, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true, error: error instanceof Error ? error.message : String(error) })
      toast.error(error)
    }
  },

  create: async (input) => {
    try {
      const project = await api.projects.create(input)
      set((state) => ({ projects: [project, ...state.projects] }))
      toast.success(`Proyecto "${project.name}" creado.`)
      return project
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  update: async (id, patch) => {
    try {
      const project = await api.projects.update(id, patch)
      set((state) => ({ projects: state.projects.map((p) => (p.id === id ? project : p)) }))
      toast.success('Proyecto actualizado.')
      return project
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    set({ busyId: id })
    try {
      await api.projects.remove(id)
      set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }))
      // Si el partido activo pertenecía a este proyecto: se descarta el
      // control, se limpia la recuperación y la pantalla externa vuelve a
      // la espera (evita que la TV siga mostrando datos ya borrados).
      const active = useActiveMatchStore.getState()
      if (active.match?.projectId === id) {
        const deletedMatchId = active.match.id
        active.unload()
        void pushDisplayState(null)
        if (useMatchesStore.getState().activeMatchId === deletedMatchId) {
          await api.settings.set('activeMatchId', '')
        }
      }
      toast.success('Proyecto eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    } finally {
      set({ busyId: null })
    }
  },

  duplicate: async (id) => {
    set({ busyId: id })
    try {
      const copy = await api.projects.duplicate(id)
      set((state) => ({ projects: [copy, ...state.projects] }))
      toast.success('Proyecto duplicado.')
      return copy
    } catch (error) {
      toast.error(error)
      return null
    } finally {
      set({ busyId: null })
    }
  },

  exportProject: async (id) => {
    set({ busyId: id })
    try {
      const result = await api.projects.exportProject(id)
      if (result.canceled) return
      if (!result.ok) throw new Error(result.error ?? 'No se pudo exportar el proyecto.')
      toast.success(`Exportado a ${result.filePath}`)
    } catch (error) {
      toast.error(error)
    } finally {
      set({ busyId: null })
    }
  },

  importProject: async () => {
    try {
      const result = await api.projects.importProject()
      if (result.canceled) return null
      if (!result.ok || !result.project) throw new Error(result.error ?? 'No se pudo importar el proyecto.')
      set((state) => ({ projects: [result.project as Project, ...state.projects] }))
      toast.success(`Proyecto "${result.project.name}" importado.`)
      return result.project
    } catch (error) {
      toast.error(error)
      return null
    }
  },
}))
