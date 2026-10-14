import type { OverlayPayload } from '@/types'

interface OverlayViewProps {
  payload: OverlayPayload
}

/** Superposición temporal (gol, sponsor, mensaje) sobre el marcador. */
export function OverlayView({ payload }: OverlayViewProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-[6vw] ${payload.kind === 'video' ? '' : 'animate-overlay'}`}
      style={{ ['--overlay-duration' as string]: `${payload.durationMs}ms` }}
    >
      {payload.kind === 'video' && payload.dataUrl ? (
        <video key={payload.id} src={payload.dataUrl} autoPlay onEnded={() => void window.api.display.finishContent(payload.id)} className="max-h-full max-w-full" onError={() => void window.api.display.finishContent(payload.id)} />
      ) : payload.kind === 'image' && payload.dataUrl ? (
        <img
          src={payload.dataUrl}
          alt=""
          className="max-h-[80%] max-w-[85%] rounded-2xl object-contain shadow-2xl"
        />
      ) : (
        <div className="text-center">
          <p className="text-[clamp(40px,11vw,240px)] leading-none font-black tracking-tight text-white uppercase drop-shadow-[0_0_40px_rgba(37,99,235,0.55)]">
            {payload.text}
          </p>
          <div className="mx-auto mt-[3vh] h-[clamp(4px,0.7vh,10px)] w-[40%] rounded-full bg-amber-400" />
        </div>
      )}
    </div>
  )
}
