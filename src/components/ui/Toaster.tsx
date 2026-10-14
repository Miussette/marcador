import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/utils/cn'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const

const TONES = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-primary/40 text-blue-300',
} as const

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind]
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-surface-2 px-3.5 py-3 shadow-xl shadow-black/40 animate-pop',
              TONES[toast.kind],
            )}
          >
            <Icon size={17} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-xs leading-relaxed text-ink">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar aviso"
              className="text-muted transition-colors hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
