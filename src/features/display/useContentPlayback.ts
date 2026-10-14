import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import type { OverlayPayload } from '@/types'

export function useContentPlayback(): OverlayPayload | null {
  const [current, setCurrent] = useState<OverlayPayload | null>(null)
  useEffect(() => {
    let version = 0
    let disposed = false
    const off = api.display.onOverlay(payload => { version += 1; setCurrent(payload) })
    void api.display.getOverlay().then(payload => { if (!disposed && version === 0) setCurrent(payload) }).catch(() => undefined)
    return () => { disposed = true; off() }
  }, [])
  return current
}
