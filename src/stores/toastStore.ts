import { create } from 'zustand'
import { errorMessage } from '@/utils/format'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => {
      // Evita apilar avisos idénticos: se refresca el existente en su lugar.
      const existing = state.toasts.find((t) => t.kind === kind && t.message === message)
      if (existing) {
        return { toasts: [...state.toasts.filter((t) => t.id !== existing.id), { id, kind, message }] }
      }
      const next = [...state.toasts, { id, kind, message }]
      // Como máximo se mantienen 4 avisos a la vez.
      return { toasts: next.slice(-4) }
    })
    setTimeout(() => useToastStore.getState().dismiss(id), kind === 'error' ? 6500 : 4000)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  info: (message: string) => useToastStore.getState().push('info', message),
  error: (error: unknown) => useToastStore.getState().push('error', errorMessage(error)),
}
