import { MonitorPlay } from 'lucide-react'

/** Pantalla de espera cuando aún no hay un partido cargado. */
export function WaitingScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#05070A] text-white">
      <div className="flex h-[9vh] w-[9vh] min-h-14 min-w-14 items-center justify-center rounded-2xl bg-blue-600 text-[clamp(18px,2vw,40px)] font-black text-white">
        MP
      </div>
      <p className="text-center text-[clamp(16px,2.4vw,44px)] font-black tracking-[0.25em] text-slate-300 uppercase">
        Esperando partido
      </p>
      <p className="flex items-center gap-3 text-[clamp(12px,1.4vw,26px)] tracking-widest text-slate-600 uppercase">
        <MonitorPlay size={18} /> Pantalla de marcador conectada
      </p>
    </div>
  )
}
