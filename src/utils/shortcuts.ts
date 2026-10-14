import type { ShortcutBinding } from '@/types'

export const DEFAULT_SHORTCUTS = [
  { action: 'clock.toggle', keys: 'SPACE' },
  { action: 'goal.home', keys: 'Q' },
  { action: 'goal.away', keys: 'P' },
  { action: 'goal.removeHome', keys: 'CTRL+Q' },
  { action: 'goal.removeAway', keys: 'CTRL+P' },
  { action: 'display.fullscreen', keys: 'F11' },
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
