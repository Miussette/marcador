import type { ShortcutBinding } from '@/types'

export const DEFAULT_SHORTCUTS = [
  { action: 'clock.toggle', keys: 'SPACE' },
  { action: 'goal.home', keys: 'Q' },
  { action: 'goal.away', keys: 'P' },
  { action: 'goal.removeHome', keys: 'CTRL+Q' },
  { action: 'goal.removeAway', keys: 'CTRL+P' },
  { action: 'display.fullscreen', keys: 'F11' },
  { action: 'points.home2', keys: 'W' },
  { action: 'points.home3', keys: 'E' },
  { action: 'points.away2', keys: 'O' },
  { action: 'points.away3', keys: 'I' },
  { action: 'horn.send', keys: 'B' },
  { action: 'break.toggle', keys: 'T' },
  { action: 'break.reset', keys: 'CTRL+T' },
  { action: 'break.30', keys: 'CTRL+SHIFT+1' },
  { action: 'break.60', keys: 'CTRL+SHIFT+2' },
  { action: 'break.90', keys: 'CTRL+SHIFT+3' },
  { action: 'shot.toggle', keys: 'S' },
  { action: 'shot.24', keys: 'R' },
  { action: 'shot.14', keys: 'SHIFT+R' },
]

export const EXTRA_SHORTCUT_ACTIONS = [
  { value: 'points.home2', label: 'Local +2' }, { value: 'points.home3', label: 'Local +3' },
  { value: 'points.away2', label: 'Visitante +2' }, { value: 'points.away3', label: 'Visitante +3' },
  { value: 'horn.send', label: 'Activar bocina' },
  { value: 'break.toggle', label: 'Descanso: iniciar / pausar' }, { value: 'break.reset', label: 'Descanso: reiniciar' },
  { value: 'break.30', label: 'Descanso: 30 segundos' }, { value: 'break.60', label: 'Descanso: 1 minuto' }, { value: 'break.90', label: 'Descanso: 1:30' },
  { value: 'shot.toggle', label: 'Posesión: iniciar / pausar reloj' }, { value: 'shot.24', label: 'Posesión: 24 segundos' }, { value: 'shot.14', label: 'Posesión: 14 segundos' },
]

export function normalizeShortcut(value: string): string {
  const parts = value.toUpperCase().replace(/\s+/g, '').replace(/CONTROL/g, 'CTRL').replace(/ESPACIO/g, 'SPACE').split('+')
  const modifiers = ['CTRL', 'ALT', 'SHIFT', 'META']
  return [...modifiers.filter(modifier => parts.includes(modifier)), ...parts.filter(part => !modifiers.includes(part))].join('+')
}

export function validShortcut(value: string): boolean {
  return /^(?:(?:CTRL|ALT|SHIFT|META)\+)*(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|SPACE|ENTER|ESCAPE|ARROW(?:UP|DOWN|LEFT|RIGHT))$/.test(normalizeShortcut(value))
}

export function activeShortcuts(bindings: ShortcutBinding[]): { action: string; keys: string }[] {
  const enabled = bindings.filter(item => item.enabled)
  return [...enabled, ...DEFAULT_SHORTCUTS.filter(item => !enabled.some(binding => binding.action === item.action || normalizeShortcut(binding.keys) === normalizeShortcut(item.keys)))]
}

export function keyboardShortcut(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>): string {
  const key = event.code === 'Space' ? 'SPACE' : event.key.toUpperCase()
  return [event.ctrlKey && 'CTRL', event.altKey && 'ALT', event.shiftKey && 'SHIFT', event.metaKey && 'META', key].filter(Boolean).join('+')
}
