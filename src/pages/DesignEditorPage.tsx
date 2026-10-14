import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  ImagePlus,
  Layers,
  MonitorPlay,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { ScreenSetup } from '@/features/display/ScreenSetup'
import { Button } from '@/components/ui/Button'
import { ColorField, Field, Input, Select } from '@/components/ui/Form'
import { DesignItemView } from '@/features/design/DesignItemView'
import { useCanvasScale } from '@/features/design/useCanvasScale'
import {
  DESIGN_ITEM_TYPES,
  DESIGN_SETTING_KEY,
  applyItemType,
  clampItem,
  cloneItem,
  createDesignItem,
  defaultDesign,
  fiba1Design,
  fiba2Design,
  designItemLabel,
  parseDesign,
  previewState,
  serializeDesign,
  visibleDesignItems,
} from '@/features/design/designModel'
import { timerElapsed } from '@/features/timer/timer'
import { useTicker } from '@/features/timer/useTicker'
import { api } from '@/services/api'
import { useProjectsStore } from '@/stores/projectsStore'
import { toast } from '@/stores/toastStore'
import { DESIGN_CANVAS, SPORTS, type DesignItem, type DesignItemType, type ScoreboardDesign, type SportId } from '@/types'
import { cn } from '@/utils/cn'

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

interface DragState {
  id: string
  mode: DragMode
  startX: number
  startY: number
  /** Ítem tal y como estaba al empezar el arrastre (base de los deltas). */
  item: DesignItem
}

const HANDLES: { mode: DragMode; className: string }[] = [
  { mode: 'nw', className: '-top-2.5 -left-2.5 cursor-nwse-resize' },
  { mode: 'ne', className: '-top-2.5 -right-2.5 cursor-nesw-resize' },
  { mode: 'sw', className: '-bottom-2.5 -left-2.5 cursor-nesw-resize' },
  { mode: 'se', className: '-bottom-2.5 -right-2.5 cursor-nwse-resize' },
]

/** Color válido para <input type="color">. */
function toHex(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Editor de diseño del marcador (botón "Diseño…" de la página Marcador).
 * Lienzo 1920×1080 con elementos arrastrables; el resultado se guarda en
 * settings y la ventana Display lo reproduce tal cual.
 */
export function DesignEditorPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const tick = useTicker(250)

  const [design, setDesign] = useState<ScoreboardDesign | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingType, setPendingType] = useState<DesignItemType>('text')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [screensOpen, setScreensOpen] = useState(false)

  const dragRef = useRef<DragState | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const scale = useCanvasScale(canvasRef)

  const project = useProjectsStore((state) => state.projects.find((p) => p.id === projectId) ?? null)
  const selectedSport = design?.sport ?? project?.sport ?? 'football'

  const items = design?.items ?? []
  const selected = items.find((item) => item.id === selectedId) ?? null

  // Vista previa con datos de ejemplo (el cronómetro avanza para verlo vivo).
  const preview = previewState(selectedSport)
  if (design?.preset === 'fiba1' || design?.preset === 'fiba2') {
    preview.competition = 'Campeonato de Baloncesto'
    preview.homeScore = 0; preview.awayScore = 0
    preview.timer = { running: false, startedAt: null, elapsed: 0 }
    preview.homeFouls = 0; preview.awayFouls = 0
    preview.shotClock = { durationMs: 24000, running: false, endAt: null, remainingMs: 24000 }
    for (const side of ['home', 'away'] as const) {
      const team = preview[side]
      if (team) {
        team.name = side === 'home' ? 'Argentina' : 'Brasil'; team.shortName = team.name
        team.players = Array.from({ length: 12 }, (_, i) => ({ id: `${side}-${i}`, teamId: team.id, firstName: ['Scola', 'Aimar', 'González', 'Oberto', 'Juan', 'Sequeira', 'Delfino', 'Alfredo', 'Gutiérrez', 'Jasen', 'Federico', 'Nicolás'][i], lastName: '', number: i + 4, position: '', photo: null, isStarter: i < 5, createdAt: 0 }))
      }
    }
  }
  const previewElapsed = timerElapsed(preview.timer, tick)

  /* ------------------------------ carga -------------------------------- */
  useEffect(() => {
    let cancelled = false
    void api.settings
      .get(DESIGN_SETTING_KEY)
      .then((raw) => {
        if (cancelled) return
        setDesign(parseDesign(raw) ?? defaultDesign(useProjectsStore.getState().projects.find(p => p.id === projectId)?.sport ?? 'football'))
      })
      .catch((error: unknown) => {
        toast.error(error)
        if (!cancelled) setDesign(defaultDesign(selectedSport))
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* ------------------------------ guardado ----------------------------- */
  const save = async (target: ScoreboardDesign, silent = false): Promise<void> => {
    setSaving(true)
    try {
      await api.settings.set(DESIGN_SETTING_KEY, serializeDesign(target))
      setDirty(false)
      if (!silent) toast.success('Diseño guardado: ya se muestra en la pantalla externa.')
    } catch (error) {
      toast.error(error)
    } finally {
      setSaving(false)
    }
  }

  // Autoguardado con pequeña demora para no escribir en cada píxel arrastrado.
  useEffect(() => {
    if (!dirty || !design) return
    const timeout = window.setTimeout(() => void save(design, true), 900)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, dirty])

  /* ----------------------------- mutaciones ---------------------------- */
  const patch = (mutate: (current: ScoreboardDesign) => ScoreboardDesign): void => {
    setDesign((current) => (current ? mutate(current) : current))
    setDirty(true)
  }

  const updateItem = (id: string, changes: Partial<DesignItem>): void =>
    patch((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? clampItem({ ...item, ...changes }) : item)),
    }))

  const patchSelected = (changes: Partial<DesignItem>): void => {
    if (selected) updateItem(selected.id, changes)
  }

  const addItem = (type: DesignItemType): void => {
    const item = createDesignItem(type, items.length % 6)
    patch((current) => ({ ...current, items: [...current.items, item] }))
    setSelectedId(item.id)
  }

  const duplicateSelected = (): void => {
    if (!selected) return
    const copy = cloneItem(selected)
    patch((current) => ({ ...current, items: [...current.items, copy] }))
    setSelectedId(copy.id)
  }

  const removeItem = (id: string): void => {
    patch((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
    if (selectedId === id) setSelectedId(null)
  }

  const moveLayer = (direction: 'up' | 'down' | 'top' | 'bottom'): void => {
    if (!selectedId) return
    patch((current) => {
      const next = [...current.items]
      const index = next.findIndex((item) => item.id === selectedId)
      if (index < 0) return current
      const [item] = next.splice(index, 1)
      if (direction === 'up') next.splice(Math.min(index + 1, next.length), 0, item)
      else if (direction === 'down') next.splice(Math.max(index - 1, 0), 0, item)
      else if (direction === 'top') next.push(item)
      else next.unshift(item)
      return { ...current, items: next }
    })
  }

  const restoreTemplate = (): void => {
    if (!window.confirm('¿Restaurar la plantilla de diseño por defecto? Se sustituirán los elementos actuales.'))
      return
    setDesign(design?.preset === 'fiba1' ? fiba1Design() : design?.preset === 'fiba2' ? fiba2Design() : defaultDesign(selectedSport))
    setSelectedId(null)
    setDirty(true)
  }

  const pickBackground = async (): Promise<void> => {
    try {
      const image = await api.files.pickImage()
      if (image) patch((current) => ({ ...current, background: image }))
    } catch (error) {
      toast.error(error)
    }
  }

  const pickItemImage = async (): Promise<void> => {
    if (!selected) return
    try {
      const image = await api.files.pickImage()
      if (image) updateItem(selected.id, { src: image })
    } catch (error) {
      toast.error(error)
    }
  }

  /* ------------------------------- arrastre ---------------------------- */
  const startDrag = (event: ReactPointerEvent<HTMLElement>, item: DesignItem, mode: DragMode): void => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = { id: item.id, mode, startX: event.clientX, startY: event.clientY, item }
    setSelectedId(item.id)
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return

    const onMove = (event: PointerEvent): void => {
      const drag = dragRef.current
      if (!drag) return
      const dx = (event.clientX - drag.startX) / (scale || 1)
      const dy = (event.clientY - drag.startY) / (scale || 1)
      const base = drag.item

      let next: DesignItem
      if (drag.mode === 'move') {
        next = { ...base, x: base.x + dx, y: base.y + dy }
      } else {
        next = { ...base }
        if (drag.mode.includes('e')) next.w = base.w + dx
        if (drag.mode.includes('w')) {
          next.x = base.x + dx
          next.w = base.w - dx
        }
        if (drag.mode.includes('s')) next.h = base.h + dy
        if (drag.mode.includes('n')) {
          next.y = base.y + dy
          next.h = base.h - dy
        }
        next.w = Math.max(40, next.w)
        next.h = Math.max(30, next.h)
      }

      const clamped = clampItem(next)
      setDesign((current) =>
        current
          ? { ...current, items: current.items.map((item) => (item.id === drag.id ? clamped : item)) }
          : current,
      )
      setDirty(true)
    }

    const onEnd = (): void => {
      dragRef.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    window.addEventListener('blur', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      window.removeEventListener('blur', onEnd)
    }
  }, [dragging, scale])

  /* ------------------------------ teclado ------------------------------ */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!design || !selectedId) return

      const item = design.items.find((candidate) => candidate.id === selectedId)
      if (!item) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeItem(selectedId)
        return
      }
      if (event.key === 'Escape') {
        setSelectedId(null)
        return
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 1 : 8
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        updateItem(item.id, { x: item.x + dx, y: item.y + dy })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, selectedId])

  /* ------------------------------- render ------------------------------ */
  return (
    <div className="flex h-screen flex-col bg-app">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(`/p/${projectId}/scoreboard`)}
          >
            Volver
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-ink">Diseño del marcador</h1>
            <p className="truncate text-xs text-muted">
              Lienzo {DESIGN_CANVAS.width}×{DESIGN_CANVAS.height} · {items.length} elementos
            </p>
          </div>
          <Badge tone={dirty ? 'warning' : 'success'}>{dirty ? 'Sin guardar' : 'Guardado'}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<MonitorPlay size={15} />}
            onClick={() => void api.display.open()}
          >
            Abrir pantalla
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<CheckCircle2 size={15} />}
            loading={saving}
            disabled={!design}
            onClick={() => design && void save(design)}
          >
            Guardar
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ------------------------- panel izquierdo ------------------------ */}
        <aside className="w-[320px] shrink-0 space-y-4 overflow-y-auto border-r border-line bg-surface p-4">
          {/* Propiedades del archivo */}
          <section className="rounded-xl border border-line bg-app/60 p-3">
            <p className="label-muted mb-3">Propiedades del archivo</p>

            <Field label="Tipo">
              <Select
                value={selectedSport}
                disabled={!design || saving}
                onChange={(event) => {
                  setDesign(defaultDesign(event.target.value as SportId))
                  setSelectedId(null)
                  setDirty(true)
                }}
              >
                {SPORTS.map((sport) => <option key={sport.id} value={sport.id}>{sport.label}</option>)}
              </Select>
              <p className="mt-1 text-xs text-muted">Cambiar de deporte reemplaza los elementos por su plantilla y se guarda autom?ticamente.</p>
            </Field>

            {selectedSport === 'basketball' && <Field label="Plantilla de baloncesto" className="mt-3">
              <Select value={design?.preset ?? 'custom'} disabled={!design || saving} onChange={event => {
                if (event.target.value === 'custom') return
                if (!window.confirm('¿Aplicar esta plantilla? Se sustituirán los elementos del diseño actual.')) return
                setDesign(event.target.value === 'fiba1' ? fiba1Design() : event.target.value === 'fiba2' ? fiba2Design() : { ...defaultDesign(selectedSport), preset: 'default' })
                setSelectedId(null); setDirty(true)
              }}><option value="custom">Diseño actual</option><option value="default">Estándar</option><option value="fiba1">FIBA 1</option><option value="fiba2">FIBA 2</option></Select>
              <p className="mt-1 text-xs text-muted">FIBA 1 incluye jugadores y estadísticas. FIBA 2 muestra el marcador compacto con faltas, tiempos muertos y posesión.</p>
            </Field>}

            <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={design?.enabled ?? false}
                onChange={(event) => patch((current) => ({ ...current, enabled: event.target.checked }))}
                className="h-4 w-4 accent-[#2563EB]"
                disabled={!design}
              />
              Usar diseño personalizado
            </label>
            <p className="mt-1 text-xs text-muted">
              Si se desactiva, la pantalla vuelve a las plantillas Classic/Modern/Minimal/Broadcast.
            </p>

            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={14} />}
              className="mt-3"
              block
              onClick={restoreTemplate}
            >
              Restaurar plantilla
            </Button>
          </section>

          {/* Propiedades de pantalla */}
          <section className="rounded-xl border border-line bg-app/60 p-3">
            <p className="label-muted mb-3">Propiedades de pantalla</p>

            <p className="mb-2 text-xs text-muted">Marcador principal</p>
            <Button variant="secondary" size="sm" block onClick={() => setScreensOpen(true)}>Configurar monitores y abrir pantalla</Button>
            <div className="mt-3">
              <ColorField label="Color de fondo de pantalla" value={toHex(design?.backgroundColor ?? '', '#05070A')} onChange={value => patch(current => ({ ...current, backgroundColor: value, items: current.items.map(item => item.type === 'box' && item.x === 0 && item.y === 0 && item.w === DESIGN_CANVAS.width && item.h === DESIGN_CANVAS.height ? { ...item, bg: value } : item) }))} />
            </div>

            <div className="mt-3">
              <span className="label-muted mb-1.5 block">Imagen de fondo</span>
              <div className="flex items-center gap-2">
                {design?.background ? (
                  <img
                    src={design.background}
                    alt="Fondo"
                    className="h-10 w-16 rounded-md border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-line text-[10px] text-muted">
                    Ninguna
                  </span>
                )}
                <Button variant="secondary" size="sm" icon={<ImagePlus size={14} />} onClick={() => void pickBackground()}>
                  Elegir…
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X size={14} />}
                  disabled={!design?.background}
                  onClick={() => patch((current) => ({ ...current, background: null }))}
                >
                  Quitar
                </Button>
              </div>
            </div>
          </section>

          {/* Propiedades del elemento */}
          <section className="rounded-xl border border-line bg-app/60 p-3">
            <p className="label-muted mb-3">Propiedades del elemento</p>

            <Field label="Item">
              <Select value={selectedId ?? ''} onChange={(event) => setSelectedId(event.target.value || null)}>
                <option value="">— Selecciona un elemento —</option>
                {items.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {designItemLabel(item, index)}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => addItem(pendingType)}>
                Añadir
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy size={14} />}
                disabled={!selected}
                onClick={duplicateSelected}
              >
                Copiar
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                disabled={!selected}
                onClick={() => selected && removeItem(selected.id)}
              >
                Quitar
              </Button>
            </div>

            <Field
              label="Tipo"
              hint="Con un elemento seleccionado cambia su tipo; sin selección, define el tipo del nuevo."
              className="mt-3"
            >
              <Select
                value={selected ? selected.type : pendingType}
                onChange={(event) => {
                  const type = event.target.value as DesignItemType
                  if (!selected) {
                    setPendingType(type)
                    return
                  }
                  patch((current) => ({
                    ...current,
                    items: current.items.map((item) => (item.id === selected.id ? applyItemType(item, type) : item)),
                  }))
                }}
              >
                {DESIGN_ITEM_TYPES.map((meta) => (
                  <option key={meta.id} value={meta.id}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="mt-2 grid grid-cols-4 gap-2">
              <Button variant="ghost" size="sm" icon={<ArrowUp size={14} />} disabled={!selected} onClick={() => moveLayer('up')} title="Subir capa" />
              <Button variant="ghost" size="sm" icon={<ArrowDown size={14} />} disabled={!selected} onClick={() => moveLayer('down')} title="Bajar capa" />
              <Button variant="ghost" size="sm" icon={<Layers size={14} />} disabled={!selected} onClick={() => moveLayer('top')} title="Mover al frente" />
              <Button variant="ghost" size="sm" icon={<Layers size={14} />} disabled={!selected} onClick={() => moveLayer('bottom')} title="Mover al fondo" />
            </div>

            {selected ? (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <Field label="Texto">
                  <Input
                    value={selected.text}
                    onChange={(event) => patchSelected({ text: event.target.value })}
                    placeholder="Etiqueta del elemento"
                  />
                </Field>

                <Field label="Fuente" hint="Usa una fuente instalada en el equipo que muestra el marcador.">
                  <Input
                    list="scoreboard-fonts"
                    value={selected.fontFamily ?? ''}
                    placeholder="Fuente predeterminada"
                    onChange={(event) => patchSelected({ fontFamily: event.target.value || undefined })}
                  />
                  <datalist id="scoreboard-fonts">
                    {['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Consolas', 'Segoe UI'].map(font => <option key={font} value={font} />)}
                  </datalist>
                </Field>
                <Button variant="secondary" size="sm" block onClick={() => patch(current => ({ ...current, items: current.items.map(item => ({ ...item, fontFamily: selected.fontFamily })) }))}>
                  Aplicar fuente a todo el marcador
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tamaño">
                    <Input
                      type="number"
                      min={8}
                      max={400}
                      value={Math.round(selected.fontSize)}
                      onChange={(event) => patchSelected({ fontSize: toNumber(event.target.value, selected.fontSize) })}
                    />
                  </Field>
                  <Field label="Alineación">
                    <Select
                      value={selected.align}
                      onChange={(event) => patchSelected({ align: event.target.value as DesignItem['align'] })}
                    >
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <ColorField
                    label="Color del elemento"
                    value={toHex(selected.color, '#F8FAFC')}
                    onChange={(value) => patchSelected({ color: value })}
                  />
                  <ColorField
                    label="Color fondo"
                    value={toHex(selected.bg, '#101722')}
                    onChange={(value) => patchSelected({ bg: value })}
                  />
                </div>

                {(selected.type === 'possession_home' || selected.type === 'possession_away' || selected.type === 'player_stats_row') && (
                  <div className="grid grid-cols-2 gap-2">
                    <ColorField label="Color activo" value={toHex(selected.activeColor ?? '', selected.type === 'player_stats_row' ? '#ffff00' : '#00ff00')} onChange={value => patchSelected({ activeColor: value })} />
                    {selected.type === 'player_stats_row' && <ColorField label="Borde de faltas" value={toHex(selected.indicatorColor ?? '', '#dddddd')} onChange={value => patchSelected({ indicatorColor: value })} />}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Radio esquina">
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      value={Math.round(selected.radius)}
                      onChange={(event) => patchSelected({ radius: toNumber(event.target.value, selected.radius) })}
                    />
                  </Field>
                  {selected.side ? (
                    <Field label="Lado">
                      <Select value={selected.side} onChange={(event) => patchSelected({ side: event.target.value as 'home' | 'away' })}>
                        <option value="home">Local</option>
                        <option value="away">Visitante</option>
                      </Select>
                    </Field>
                  ) : (
                    <Field label="Fondo">
                      <Button variant="ghost" size="sm" block onClick={() => patchSelected({ bg: 'transparent' })}>
                        Sin fondo
                      </Button>
                    </Field>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(['x', 'y', 'w', 'h'] as const).map((key) => (
                    <Field key={key} label={{ x: 'X', y: 'Y', w: 'Ancho', h: 'Alto' }[key]}>
                      <Input
                        type="number"
                        value={Math.round(selected[key])}
                        onChange={(event) => patchSelected({ [key]: toNumber(event.target.value, selected[key]) })}
                      />
                    </Field>
                  ))}
                </div>

                {selected.type === 'player_row' || selected.type === 'player_stats_row' ? (
                  <Field label="Número de jugador">
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      value={selected.index ?? 1}
                      onChange={(event) => patchSelected({ index: toNumber(event.target.value, selected.index ?? 1) })}
                    />
                  </Field>
                ) : null}

                {selected.type === 'image' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" icon={<ImagePlus size={14} />} onClick={() => void pickItemImage()}>
                      Elegir imagen
                    </Button>
                    <Button variant="ghost" size="sm" disabled={!selected.src} onClick={() => patchSelected({ src: null })}>
                      Quitar imagen
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                Selecciona un elemento en el lienzo para editar sus propiedades.
              </p>
            )}
          </section>
        </aside>

        {/* ---------------------------- lienzo ----------------------------- */}
        <main className="relative min-w-0 flex-1 overflow-hidden bg-[#0B0F14] p-6">
          <div
            ref={canvasRef}
            className="absolute inset-6"
            onPointerDown={() => setSelectedId(null)}
          >
            <div
              className="absolute top-1/2 left-1/2 origin-center"
              style={{
                width: DESIGN_CANVAS.width,
                height: DESIGN_CANVAS.height,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              <div
                className={cn(
                  'relative h-full w-full overflow-hidden bg-[#05070A] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10',
                  dragging ? 'cursor-grabbing' : 'cursor-default',
                )}
                style={{ backgroundColor: design?.backgroundColor }}
              >
                {design?.background ? (
                  <img src={design.background} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}

                {/* Rejilla de referencia */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #94A3B8 1px, transparent 1px), linear-gradient(to bottom, #94A3B8 1px, transparent 1px)',
                    backgroundSize: '80px 80px',
                  }}
                />

                {(design ? visibleDesignItems(design) : []).map((item) => {
                  const isSelected = item.id === selectedId
                  return (
                    <div
                      key={item.id}
                      className={cn('absolute', isSelected ? 'z-10' : '')}
                      style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                      onPointerDown={(event) => startDrag(event, item, 'move')}
                    >
                      <DesignItemView item={item} state={preview} elapsedMs={previewElapsed} />

                      {isSelected ? (
                        <>
                          <span className="pointer-events-none absolute inset-0 ring-[3px] ring-blue-400" />
                          {HANDLES.map((handle) => (
                            <span
                              key={handle.mode}
                              className={cn(
                                'absolute h-5 w-5 rounded-[4px] border border-white bg-blue-400',
                                handle.className,
                              )}
                              onPointerDown={(event) => startDrag(event, item, handle.mode)}
                            />
                          ))}
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute right-9 bottom-9 left-9 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              Arrastra para mover · Esquinas para redimensionar · Flechas para ajustar · Supr para eliminar
            </span>
            <span className="font-mono">
              {selected
                ? `X ${Math.round(selected.x)} · Y ${Math.round(selected.y)} · ${Math.round(selected.w)}×${Math.round(selected.h)}`
                : `${items.length} elementos en el lienzo`}
            </span>
          </div>
        </main>
      </div>
      <Modal open={screensOpen} onClose={() => setScreensOpen(false)} title="Propiedades de pantalla" size="xl"><ScreenSetup /></Modal>
    </div>
  )
}
