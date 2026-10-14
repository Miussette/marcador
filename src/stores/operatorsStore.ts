import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewOperatorProfileInput, OperatorProfile } from '@/types'
import { toast } from './toastStore'

interface OperatorsState {
  items: OperatorProfile[]
  loading: boolean
  loaded: boolean

  load: () => Promise<void>
  create: (input: NewOperatorProfileInput) => Promise<OperatorProfile | null>
  remove: (id: string) => Promise<boolean>
}

export const useOperatorsStore = create<OperatorsState>((set) => ({
  items: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true, loaded: false })
    try {
      const items = await api.operators.list()
      set({ items, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true })
      toast.error(error)
    }
  },

  create: async (input) => {
    try {
      const item = await api.operators.create(input)
      set((state) => ({ items: [...state.items, item] }))
      toast.success('Perfil creado.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.operators.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Perfil eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
