import { useEffect, useState } from 'react'

interface Control { node: HTMLElement; name: string }
/** F8 ofrece acceso por número a todos los controles, incluidas filas dinámicas. */
export function KeyboardControls() {
  const [controls, setControls] = useState<Control[] | null>(null)
  const [digits, setDigits] = useState('')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.key === 'F8') {
        event.preventDefault(); event.stopImmediatePropagation()
        if (controls) { setControls(null); return }
        const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
        const scope = dialogs.at(-1) ?? document.querySelector('[data-match-controls]')
        const found = Array.from(scope?.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]') ?? []).filter(node => !node.matches(':disabled,[type="hidden"]') && node.getClientRects().length > 0)
        setControls(found.map(node => ({ node, name: [node.closest('tr')?.querySelector('td:nth-child(2)')?.textContent, node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || node.closest('label')?.textContent || node.tagName].filter(Boolean).join(' · ').trim() })))
        setDigits(''); return
      }
      if (!controls) return
      event.preventDefault(); event.stopImmediatePropagation()
      if (event.key === 'Escape') setControls(null)
      else if (/^[0-9]$/.test(event.key)) setDigits(value => (value + event.key).slice(0, 4))
      else if (event.key === 'Backspace') setDigits(value => value.slice(0, -1))
      else if (event.key === 'Enter') {
        const control = controls[Number(digits) - 1]?.node
        if (!control?.isConnected || control.matches(':disabled')) return
        setControls(null); control.scrollIntoView({ block: 'nearest' }); control.focus(); control.click()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [controls, digits])
  if (!controls) return <p className="px-5 py-1 text-xs text-muted">F8: acceso por teclado a todos los botones · escribe el número y pulsa Enter</p>
  return <aside className="fixed right-4 top-20 z-[100] max-h-[75vh] w-96 max-w-[90vw] overflow-auto rounded-xl border border-primary bg-surface p-4 shadow-xl" aria-label="Accesos de teclado">
    <p className="sticky top-0 bg-surface pb-2 text-sm text-ink">F8 · Número: <strong>{digits || '—'}</strong> · Enter para ejecutar · Esc para cerrar</p>
    <ol className="space-y-1 text-xs text-ink">{controls.map((control, index) => <li key={index} className={Number(digits) === index + 1 ? 'bg-primary/30 p-1' : 'p-1'}>{index + 1}. {control.name}</li>)}</ol>
  </aside>
}
