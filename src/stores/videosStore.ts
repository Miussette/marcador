import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewVideoInput, VideoItem } from '@/types'
import { toast } from './toastStore'

interface VideosState {
  projectId: string | null
  items: VideoItem[]
  loading: boolean
  loaded: boolean

  load: (projectId: string) => Promise<void>
  create: (input: NewVideoInput) => Promise<VideoItem | null>
  remove: (id: string) => Promise<boolean>
}

export const useVideosStore = create<VideosState>((set, get) => ({
  projectId: null,
  items: [],
  loading: false,
  loaded: false,

  load: async (projectId) => {
    set({ projectId, loading: true, loaded: false })
    try {
      const items = await api.videos.list(projectId)
      set({ items, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true })
      toast.error(error)
    }
  },

  create: async (input) => {
    const projectId = get().projectId
    if (!projectId) {
      toast.error('No hay un proyecto seleccionado.')
      return null
    }
    try {
      const item = await api.videos.create({ ...input, projectId })
      set((state) => ({ items: [item, ...state.items] }))
      toast.success('Video añadido.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.videos.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Video eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
