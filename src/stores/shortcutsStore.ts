import { create } from 'zustand'
import { api } from '@/services/api'
import type { NewShortcutBindingInput, ShortcutBinding } from '@/types'
import { toast } from './toastStore'

interface ShortcutsState {
  items: ShortcutBinding[]
  loading: boolean
  loaded: boolean

  load: () => Promise<void>
  create: (input: NewShortcutBindingInput) => Promise<ShortcutBinding | null>
  update: (id: string, patch: Partial<NewShortcutBindingInput>) => Promise<ShortcutBinding | null>
  remove: (id: string) => Promise<boolean>
}

export const useShortcutsStore = create<ShortcutsState>((set) => ({
  items: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true, loaded: false })
    try {
      const items = await api.shortcuts.list()
      set({ items, loading: false, loaded: true })
    } catch (error) {
      set({ loading: false, loaded: true })
      toast.error(error)
    }
  },

  create: async (input) => {
    try {
      const item = await api.shortcuts.create(input)
      set((state) => ({ items: [...state.items, item] }))
      toast.success('Atajo creado.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  update: async (id, patch) => {
    try {
      const item = await api.shortcuts.update(id, patch)
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? item : i)),
      }))
      toast.success('Atajo actualizado.')
      return item
    } catch (error) {
      toast.error(error)
      return null
    }
  },

  remove: async (id) => {
    try {
      await api.shortcuts.remove(id)
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      toast.success('Atajo eliminado.')
      return true
    } catch (error) {
      toast.error(error)
      return false
    }
  },
}))
