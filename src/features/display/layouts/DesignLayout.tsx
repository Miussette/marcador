import { useRef } from 'react'
import { DesignItemView } from '@/features/design/DesignItemView'
import { useCanvasScale } from '@/features/design/useCanvasScale'
import { DESIGN_CANVAS } from '@/types'
import { visibleDesignItems } from '@/features/design/designModel'
import type { LayoutProps } from './common'

/**
 * Diseño personalizado: reproduce tal cual lo configurado en el editor
 * ("Diseño…" de la página Marcador), escalando el lienzo virtual 1920×1080.
 */
export function DesignLayout({ state, elapsedMs }: LayoutProps) {
  const design = state.design
  const boxRef = useRef<HTMLDivElement>(null)
  const scale = useCanvasScale(boxRef)

  if (!design) return null

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden bg-[#05070A]" style={{ backgroundColor: design.backgroundColor }}>
      {design.background ? (
        <img
          src={design.background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : null}

      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: DESIGN_CANVAS.width,
          height: DESIGN_CANVAS.height,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {visibleDesignItems(design).filter(item => item.type !== 'player_row' && (item.type !== 'player_stats_row' || state.showPlayers)).map((item) => (
          <div
            key={item.id}
            className="absolute"
            style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
          >
            <DesignItemView item={item} state={state} elapsedMs={elapsedMs} />
          </div>
        ))}
      </div>
    </div>
  )
}
