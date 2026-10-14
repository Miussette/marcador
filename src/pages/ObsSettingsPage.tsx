import { ScreenSetup } from '@/features/display/ScreenSetup'
import { useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MonitorPlay,
  Radio,
  RefreshCw,
  Settings,
  Video,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { useObsStore } from '@/stores/obsStore'
import { cn } from '@/utils/cn'

export function ObsSettingsPage() {
  const obs = useObsStore()

  useEffect(() => {
    const unsubscribe = obs.init()
    void obs.refresh()
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isConnected = obs.connectionStatus === 'connected'
  const isConnecting = obs.connectionStatus === 'connecting'
  const isStreaming = obs.streamingStatus === 'streaming'

  return (
    <div>
      <PageHeader
        title="OBS Studio"
        description="Conexión, streaming y control de escenas para transmisiones en vivo."
      />

      <div className="mb-5"><ScreenSetup /></div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* --------------------------- Conexión --------------------------- */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Conexión</p>
            {isConnected ? (
              <Badge tone="success" dot>
                Conectado
              </Badge>
            ) : isConnecting ? (
              <Badge tone="warning" dot>
                Conectando…
              </Badge>
            ) : obs.connectionStatus === 'error' ? (
              <Badge tone="danger" dot>
                Error
              </Badge>
            ) : (
              <Badge tone="default">Desconectado</Badge>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="label-muted mb-1 block">Host</label>
              <input
                type="text"
                value={obs.config.host}
                onChange={(e) => obs.setConfig({ host: e.target.value })}
                disabled={isConnected || isConnecting}
                className="input w-full"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="label-muted mb-1 block">Puerto</label>
              <input
                type="number"
                value={obs.config.port}
                onChange={(e) => obs.setConfig({ port: parseInt(e.target.value, 10) || 4455 })}
                disabled={isConnected || isConnecting}
                className="input w-full"
                placeholder="4455"
              />
            </div>
            <div>
              <label className="label-muted mb-1 block">Contraseña (opcional)</label>
              <input
                type="password"
                value={obs.config.password}
                onChange={(e) => obs.setConfig({ password: e.target.value })}
                disabled={isConnected || isConnecting}
                className="input w-full"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {isConnected ? (
              <Button
                variant="danger"
                icon={<WifiOff size={15} />}
                onClick={() => void obs.disconnect()}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={isConnecting ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
                loading={isConnecting}
                onClick={() => void obs.connect()}
              >
                Conectar
              </Button>
            )}
            <Button
              variant="ghost"
              icon={<RefreshCw size={15} />}
              onClick={() => void obs.refresh()}
              disabled={!isConnected}
            >
              Actualizar
            </Button>
          </div>

          {obs.error && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {obs.error}
            </p>
          )}
        </section>

        {/* --------------------------- Streaming --------------------------- */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Streaming</p>
            {isStreaming ? (
              <Badge tone="danger" dot>
                En vivo
              </Badge>
            ) : (
              <Badge tone="default">Fuera de línea</Badge>
            )}
          </div>

          <div className="rounded-xl border border-line bg-app p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isStreaming ? 'bg-danger/20 text-danger' : 'bg-surface-2 text-muted',
                )}
              >
                <Radio size={20} className={isStreaming ? 'animate-pulse' : ''} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {isStreaming ? 'Transmitiendo en vivo' : 'Streaming detenido'}
                </p>
                <p className="text-[11px] text-muted">
                  {isStreaming
                    ? 'La transmisión está activa en OBS'
                    : 'Inicia el streaming cuando estés listo'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {isStreaming ? (
              <Button
                variant="danger"
                icon={<Video size={15} />}
                onClick={() => void obs.stopStreaming()}
                disabled={!isConnected}
              >
                Detener streaming
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Video size={15} />}
                onClick={() => void obs.startStreaming()}
                disabled={!isConnected}
              >
                Iniciar streaming
              </Button>
            )}
          </div>
        </section>

        {/* --------------------- Servidor web para OBS --------------------- */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Marcador web para OBS</p>
            {obs.server.running ? (
              <Badge tone="success" dot>
                Servidor activo
              </Badge>
            ) : (
              <Badge tone="default">Detenido</Badge>
            )}
          </div>

          <div className="rounded-xl border border-line bg-app p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  obs.server.running ? 'bg-success/20 text-success' : 'bg-surface-2 text-muted',
                )}
              >
                <Globe size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {obs.server.running ? 'Servidor en marcha' : 'Servidor detenido'}
                </p>
                <p className="text-[11px] text-muted">
                  Sirve el marcador por HTTP para usarlo en OBS como «Fuente de navegador».
                </p>
              </div>
            </div>

            {obs.server.running && obs.server.url ? (
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-primary">
                  {obs.server.url}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={14} />}
                  onClick={() => {
                    void navigator.clipboard?.writeText(obs.server.url ?? '')
                  }}
                  title="Copiar URL"
                >
                  Copiar
                </Button>
              </div>
            ) : null}

            <div className="mt-3 flex items-end gap-2">
              <div className="w-32">
                <label className="label-muted mb-1 block">Puerto</label>
                <Input
                  type="number"
                  min={1024}
                  max={65535}
                  value={obs.serverPort}
                  onChange={(e) => obs.setServerPort(e.target.value)}
                  disabled={obs.server.running}
                  className="font-mono"
                  aria-label="Puerto del servidor"
                />
              </div>
              {obs.server.running ? (
                <Button variant="danger" icon={<WifiOff size={15} />} onClick={() => void obs.stopServer()}>
                  Detener servidor
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon={<Globe size={15} />}
                  loading={obs.loading}
                  onClick={() => void obs.startServer()}
                >
                  Iniciar servidor
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs leading-relaxed text-muted">
              <strong className="text-ink">Cómo usarlo en OBS:</strong> abre OBS, añade una
              fuente <strong>«Navegador»</strong> (o «Browser Source»), pega la URL del servidor
              y marca «Cerrar fuente al no estar visible». El marcador se actualiza en vivo
              con los goles, el cronómetro y la cuenta atrás. También puedes capturar la
              ventana «Marcador Pro — Pantalla» con una fuente «Captura de ventana».
            </p>
          </div>
        </section>

        {/* ---------------------------- Escenas ---------------------------- */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Escenas</p>
            {obs.currentScene && (
              <Badge tone="primary">Actual: {obs.currentScene}</Badge>
            )}
          </div>

          {obs.scenes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
              {isConnected
                ? 'No se encontraron escenas en OBS'
                : 'Conéctate a OBS para ver las escenas'}
            </p>
          ) : (
            <div className="space-y-2">
              {obs.scenes.map((scene) => (
                <button
                  key={scene.sceneName}
                  type="button"
                  disabled={!isConnected}
                  onClick={() => void obs.setCurrentScene(scene.sceneName)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                    obs.currentScene === scene.sceneName
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-line bg-app hover:border-line/80',
                    !isConnected && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <MonitorPlay
                    size={16}
                    className={obs.currentScene === scene.sceneName ? 'text-primary' : 'text-muted'}
                  />
                  <span className="flex-1 text-sm font-medium text-ink">{scene.sceneName}</span>
                  {obs.currentScene === scene.sceneName && (
                    <Badge tone="success">Activa</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------- Fuentes ---------------------------- */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-muted">Fuentes de la escena actual</p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => void obs.listSources()}
              disabled={!isConnected || !obs.currentScene}
            >
              Actualizar
            </Button>
          </div>

          {obs.sources.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
              {!obs.currentScene
                ? 'Selecciona una escena para ver sus fuentes'
                : 'No se encontraron fuentes en esta escena'}
            </p>
          ) : (
            <div className="space-y-2">
              {obs.sources.map((source) => (
                <div
                  key={source.sourceName}
                  className="flex items-center gap-3 rounded-xl border border-line bg-app px-4 py-3"
                >
                  <Settings size={14} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{source.sourceName}</p>
                    <p className="text-[11px] text-muted">{source.sourceType}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void obs.setSourceVisibility(source.sourceName, !source.visible)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      source.visible
                        ? 'bg-success/20 text-success hover:bg-success/30'
                        : 'bg-surface-2 text-muted hover:bg-surface-3',
                    )}
                    title={source.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {source.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* --------------------------- Información --------------------------- */}
      <section className="card mt-5 p-5">
        <p className="label-muted mb-2">Información</p>
        <p className="text-xs leading-relaxed text-muted">
          Para conectar OBS Studio, instala el plugin <strong>obs-websocket</strong> (incluido por
          defecto en OBS 28+). Ve a <strong>Herramientas → Configuración del servidor WebSocket</strong>{' '}
          en OBS y habilita el servidor en el puerto 4455. Si configuraste una contraseña, ingrésala
          aquí.
        </p>
      </section>
    </div>
  )
}
