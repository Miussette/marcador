import { useEffect, useState } from 'react'
import { CheckCircle2, Maximize, MonitorPlay, X, Zap } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { DESIGN_SETTING_KEY, parseDesign } from '@/features/design/designModel'
import { api } from '@/services/api'
import { useDisplayStore } from '@/stores/displayStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { SCOREBOARD_LAYOUTS } from '@/types'
import { cn } from '@/utils/cn'
import { SerialHornPanel } from '@/features/serial/SerialHornPanel'

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'ESPACIO', label: 'Iniciar / pausar cronómetro' },
  { keys: 'Q', label: 'Gol equipo local' },
  { keys: 'P', label: 'Gol equipo visitante' },
  { keys: 'CTRL + Q', label: 'Restar gol local' },
  { keys: 'CTRL + P', label: 'Restar gol visitante' },
  { keys: 'F11', label: 'Pantalla completa del marcador' },
]

export function SettingsPage() {
  const display = useDisplayStore()
  const settings = useSettingsStore()

  const layout = settings.get('scoreboard.layout', 'broadcast')
  const goalOverlay = settings.get('display.goalOverlay', 'true') === 'true'
  const [customDesign, setCustomDesign] = useState(false)

  useEffect(() => {
    void useDisplayStore.getState().refresh()
    if (!useSettingsStore.getState().loaded) void useSettingsStore.getState().load()
    // ¿Hay un diseño personalizado que sustituye a las plantillas?
    void api.settings
      .get(DESIGN_SETTING_KEY)
      .then((raw) => {
        const design = parseDesign(raw)
        setCustomDesign(Boolean(design?.enabled && design.items.length > 0))
      })
      .catch(() => setCustomDesign(false))
  }, [])

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Pantalla externa, diseño del marcador y preferencias de la sesión."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SerialHornPanel />
        {/* ------------------------------ Pantalla ------------------------------ */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Pantalla externa (TV / proyector / LED)</p>
            {display.isOpen ? (
              <Badge tone="success" dot>
                Conectada
              </Badge>
            ) : (
              <Badge tone="default">Cerrada</Badge>
            )}
          </div>

          <div className="space-y-2">
            {display.displays.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
                No se detectaron monitores adicionales. Se usará la pantalla principal.
              </p>
            ) : (
              display.displays.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                    display.selectedDisplayId === item.id
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-line bg-app hover:border-line/80',
                  )}
                >
                  <input
                    type="radio"
                    name="display-monitor"
                    className="accent-blue-500"
                    checked={display.selectedDisplayId === item.id}
                    onChange={() => {
                      useDisplayStore.setState({ selectedDisplayId: item.id })
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{item.label}</p>
                    <p className="text-[11px] text-muted">
                      {item.width} × {item.height}
                      {item.primary ? ' · Principal' : ''}
                    </p>
                  </div>
                  {display.selectedDisplayId === item.id ? (
                    <CheckCircle2 size={16} className="text-primary" />
                  ) : null}
                </label>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {display.isOpen ? (
              <>
                <Button
                  variant="secondary"
                  icon={<Maximize size={15} />}
                  onClick={() => void display.toggleFullscreen()}
                >
                  Pantalla completa
                </Button>
                <Button variant="ghost" icon={<X size={15} />} onClick={() => void display.close()}>
                  Cerrar pantalla
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                icon={<MonitorPlay size={16} />}
                loading={display.loading}
                onClick={() => void display.openOn(display.selectedDisplayId ?? undefined)}
              >
                Abrir marcador
              </Button>
            )}
            <Button variant="ghost" onClick={() => void display.refresh()} loading={display.loading}>
              Actualizar monitores
            </Button>
          </div>
        </section>

        {/* ------------------------------ Diseño ------------------------------ */}
        <section className="card p-5">
          <p className="label-muted mb-4">Diseño del marcador</p>
          <div className="grid grid-cols-2 gap-3">
            {SCOREBOARD_LAYOUTS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => void settings.set('scoreboard.layout', option.id)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  layout === option.id
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-line bg-app hover:border-line/80',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{option.label}</span>
                  {layout === option.id ? <CheckCircle2 size={15} className="text-primary" /> : null}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted">{option.hint}</p>
                <div className="mt-3 flex gap-1">
                  <span className="h-2 flex-1 rounded-sm bg-success/70" />
                  <span className="h-2 flex-1 rounded-sm bg-surface-3" />
                  <span className="h-2 flex-1 rounded-sm bg-danger/70" />
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">El cambio se aplica en caliente a la pantalla externa.</p>
          {customDesign ? (
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-snug text-amber-300">
              Hay un diseño personalizado activo (botón «Diseño…» en la sección Marcador): mientras esté activo, la
              pantalla muestra ese diseño en lugar de estas plantillas.
            </p>
          ) : null}
        </section>

        {/* --------------------------- Superposiciones -------------------------- */}
        <section className="card p-5">
          <p className="label-muted mb-4">Superposiciones</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-app p-4">
            <input
              type="checkbox"
              className="mt-0.5 accent-blue-500"
              checked={goalOverlay}
              onChange={(event) => void settings.set('display.goalOverlay', event.target.checked ? 'true' : 'false')}
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Zap size={14} className="text-warning" /> Animación de gol en pantalla
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Muestra “¡GOOOL!” durante 3 segundos cada vez que se marca un gol. Se puede desactivar si ya usas la
                sección Multimedia para esos efectos.
              </p>
            </div>
          </label>
        </section>

        {/* ------------------------------ Atajos ------------------------------- */}
        <section className="card p-5">
          <p className="label-muted mb-4">Atajos de teclado</p>
          <ul className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.keys} className="flex items-center justify-between gap-3 text-xs">
                <kbd className="rounded border border-line bg-app px-2 py-1 font-mono font-semibold text-ink">
                  {shortcut.keys}
                </kbd>
                <span className="text-muted">{shortcut.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
            Los atajos son configurables en la Fase 2. Están desactivados mientras escribes en un campo de texto.
          </p>
        </section>
      </div>

      <section className="card mt-5 p-5">
        <p className="label-muted mb-2">Datos y almacenamiento</p>
        <p className="text-xs leading-relaxed text-muted">
          Todos los proyectos, equipos, jugadores, partidos, eventos y configuraciones se guardan localmente en una
          base de datos SQLite dentro de la carpeta de datos de la aplicación. Funciona al 100% sin conexión a
          internet, con autoguardado en cada cambio y recuperación automática del partido activo si se cierra el
          programa.
        </p>
      </section>
    </div>
  )
}
