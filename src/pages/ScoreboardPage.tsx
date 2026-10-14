import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, MonitorPlay, Maximize, Pencil, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, EmptyState, LoadingBlock } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { useDisplayStore } from '@/stores/displayStore'
import { useMatchesStore } from '@/stores/matchesStore'

/**
 * Sección "Marcador": si hay un partido activo en este proyecto
 * redirige al panel de control; si no, ofrece abrir la pantalla externa.
 */
export function ScoreboardPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { matches, loaded, activeMatchId } = useMatchesStore()
  const display = useDisplayStore()

  const activeMatch = matches.find((match) => match.id === activeMatchId) ?? null

  useEffect(() => {
    void useDisplayStore.getState().refresh()
  }, [])

  useEffect(() => {
    if (activeMatch && activeMatch.projectId === projectId) {
      navigate(`/p/${projectId}/control/${activeMatch.id}`, { replace: true })
    }
  }, [activeMatch, projectId, navigate])

  if (!loaded) return <LoadingBlock label="Cargando marcador…" />

  if (activeMatch) return <LoadingBlock label="Abriendo el panel de control…" />

  return (
    <div>
      <PageHeader
        title="Marcador"
        description="Pantalla externa para TV, proyector o LED, y acceso al panel de control."
        actions={
          <Button variant="primary" icon={<Pencil size={16} />} onClick={() => navigate('design')}>
            Diseño…
          </Button>
        }
      />

      <EmptyState
        icon={MonitorPlay}
        title="Ningún partido activo"
        description="Abre un partido desde la sección Partidos para controlar el marcador en vivo, o lanza la pantalla externa en modo de espera."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" icon={<CalendarDays size={16} />} onClick={() => navigate('matches')}>
              Ir a partidos
            </Button>
            {display.isOpen ? (
              <>
                <Button variant="secondary" icon={<Maximize size={16} />} onClick={() => void display.toggleFullscreen()}>
                  Pantalla completa
                </Button>
                <Button variant="ghost" icon={<X size={16} />} onClick={() => void display.close()}>
                  Cerrar pantalla
                </Button>
              </>
            ) : (
              <Button variant="outline" icon={<MonitorPlay size={16} />} onClick={() => void display.openOn()} loading={display.loading}>
                Abrir marcador
              </Button>
            )}
          </div>
        }
      />

      {display.isOpen ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge tone="success" dot>
            Pantalla externa conectada
          </Badge>
        </div>
      ) : null}
    </div>
  )
}
