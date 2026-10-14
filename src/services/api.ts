import type { Api } from '@/types/api'

/** Puente IPC expuesto por electron/preload.ts (contextBridge). */
export const api: Api = window.api

export function hasApi(): boolean {
  return typeof window !== 'undefined' && Boolean(window.api)
}
