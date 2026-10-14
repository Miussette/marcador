import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { api } from '@/services/api'
import { toast } from '@/stores/toastStore'
import { useContentPlayback } from '@/features/display/useContentPlayback'
import type { VideoItem } from '@/types'

export function QuickVideos({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<VideoItem[]>([])
  const [busy, setBusy] = useState(false)
  const current = useContentPlayback()
  const refresh = useCallback(async () => { setItems(await api.videos.list(projectId)) }, [projectId])
  useEffect(() => { void refresh().catch(toast.error) }, [refresh])
  const play = useCallback((video: VideoItem) => { void api.display.playContent('video', video.id).catch(toast.error) }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.shiftKey || event.repeat || document.querySelector('[role="dialog"]') || (event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable))) return
      const digit = /^Digit([0-9])$/.exec(event.code)?.[1]
      if (digit === undefined) return
      event.preventDefault()
      if (digit === '0') void api.display.stopContent().catch(toast.error)
      else if (items[Number(digit) - 1]) play(items[Number(digit) - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, play])
  const add = async () => {
    setBusy(true)
    try {
      const src = await api.files.pickVideo()
      if (!src) return
      const name = decodeURIComponent(new URL(src).pathname.split('/').pop() ?? 'Video').replace(/\.[^.]+$/, '')
      await api.videos.create({ projectId, name, src, duration: 0 })
      await refresh()
    } catch (error) { toast.error(error) } finally { setBusy(false) }
  }
  return <section className="quick-videos mx-4 my-2 max-h-40 shrink-0 overflow-auto rounded-xl border border-line bg-surface p-3">
    <div className="mb-2 flex flex-wrap items-center gap-2"><span className="label-muted">Videos rápidos</span><Button size="sm" disabled={busy} onClick={() => void add()}>Añadir video</Button><Button size="sm" onClick={() => void refresh().catch(toast.error)}>Actualizar lista</Button><Button size="sm" variant="danger" onClick={() => void api.display.stopContent().catch(toast.error)}>Detener · Alt+0</Button></div>
    <div className="flex flex-wrap gap-2">{items.map((video, index) => <Button key={video.id} size="sm" variant={current?.sourceId === video.id ? 'success' : 'secondary'} onClick={() => play(video)}>{video.name}{index < 9 ? ` · Alt+${index + 1}` : ''}</Button>)}{!items.length && <p className="text-xs text-muted">Añade videos aquí o en Videos del proyecto.</p>}</div>
  </section>
}
