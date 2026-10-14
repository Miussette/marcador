import { useLayoutEffect, useRef } from 'react'

interface FittedTextProps {
  text: string
  width: number
  height: number
  fontSize: number
  fontFamily?: string
  className?: string
}

/** Mide la fuente real en unidades del lienzo, incluso cuando está escalado. */
export function FittedText({ text, width, height, fontSize, fontFamily, className }: FittedTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    let cancelled = false
    const fit = () => {
      const element = ref.current
      if (cancelled || !element) return
      element.style.fontSize = `${fontSize}px`
      const scale = Math.min(1, Math.max(1, width - 16) / Math.max(1, element.offsetWidth), Math.max(1, height - 8) / Math.max(1, element.offsetHeight))
      element.style.fontSize = `${fontSize * scale}px`
    }
    fit()
    void document.fonts.ready.then(fit)
    document.fonts.addEventListener('loadingdone', fit)
    return () => { cancelled = true; document.fonts.removeEventListener('loadingdone', fit) }
  }, [text, width, height, fontSize, fontFamily, className])
  return <span ref={ref} className={className} style={{ display: 'inline-block', flexShrink: 0, whiteSpace: 'nowrap', fontFamily, fontSize }}>{text}</span>
}
