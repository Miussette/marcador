import OBSWebSocket from 'obs-websocket-js'
import type {
  ObsConnectionConfig,
  ObsScene,
  ObsSource,
  ObsState,
  ObsStreamingStatus,
} from '../src/types'

/* ------------------------------------------------------------------ *
 *  Servicio OBS: conexión, streaming y control de escenas/fuentes
 * ------------------------------------------------------------------ */

/** Respuesta tipada de `GetSceneList`. */
interface SceneListResponse {
  scenes: { sceneName: string; sceneIndex: number }[]
  currentProgramSceneName?: string
}

/** Respuesta tipada de `GetSceneItemList`. */
interface SceneItemListResponse {
  sceneItems: {
    sceneItemId: number
    sourceName: string
    inputKind?: string
    isGroup?: boolean
    sceneItemEnabled: boolean
  }[]
}

let obs: OBSWebSocket | null = null
let currentState: ObsState = {
  connectionStatus: 'disconnected',
  streamingStatus: 'offline',
  currentScene: null,
  scenes: [],
  sources: [],
  error: null,
}

type StateListener = (state: ObsState) => void
const listeners = new Set<StateListener>()

function setState(patch: Partial<ObsState>): void {
  currentState = { ...currentState, ...patch }
  listeners.forEach((listener) => listener(currentState))
}

export function onObsStateChange(listener: StateListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getObsState(): ObsState {
  return currentState
}

export async function connectObs(config: ObsConnectionConfig): Promise<void> {
  if (obs) {
    await disconnectObs()
  }

  setState({ connectionStatus: 'connecting', error: null })
  obs = new OBSWebSocket()

  try {
    await obs.connect(`ws://${config.host}:${config.port}`, config.password || undefined)

    setState({ connectionStatus: 'connected' })

    // Cargar estado inicial
    await refreshScenes()
    await refreshStreamingStatus()

    // Escuchar eventos de OBS
    obs.on('ConnectionClosed', () => {
      setState({ connectionStatus: 'disconnected', currentScene: null, scenes: [], sources: [] })
    })

    obs.on('CurrentProgramSceneChanged', (data) => {
      setState({ currentScene: data.sceneName })
    })

    obs.on('SceneListChanged', () => {
      void refreshScenes()
    })

    obs.on('StreamStateChanged', (data) => {
      setState({ streamingStatus: data.outputActive ? 'streaming' : 'offline' })
    })
  } catch (err) {
    setState({
      connectionStatus: 'error',
      error: err instanceof Error ? err.message : 'Error de conexión',
    })
    obs = null
    throw err
  }
}

export async function disconnectObs(): Promise<void> {
  if (obs) {
    try {
      await obs.disconnect()
    } catch {
      // Ignorar errores al desconectar
    }
    obs = null
  }
  setState({
    connectionStatus: 'disconnected',
    streamingStatus: 'offline',
    currentScene: null,
    scenes: [],
    sources: [],
  })
}

export async function refreshScenes(): Promise<ObsScene[]> {
  if (!obs) return []
  try {
    const response = (await obs.call('GetSceneList')) as unknown as SceneListResponse
    const scenes: ObsScene[] = response.scenes.map((s) => ({
      sceneName: s.sceneName,
      sceneIndex: s.sceneIndex,
    }))
    const currentScene = response.currentProgramSceneName ?? null
    setState({ scenes, currentScene })
    return scenes
  } catch (err) {
    setState({ error: err instanceof Error ? err.message : 'Error al obtener escenas' })
    return []
  }
}

export async function setCurrentScene(sceneName: string): Promise<void> {
  if (!obs) throw new Error('No conectado a OBS')
  await obs.call('SetCurrentProgramScene', { sceneName })
  setState({ currentScene: sceneName })
  await refreshSources(sceneName)
}

export async function refreshSources(sceneName?: string): Promise<ObsSource[]> {
  if (!obs) return []
  try {
    const targetScene = sceneName ?? currentState.currentScene
    if (!targetScene) return []

    const response = (await obs.call('GetSceneItemList', { sceneName: targetScene })) as unknown as SceneItemListResponse
    const sources: ObsSource[] = response.sceneItems.map((item) => ({
      sourceName: item.sourceName,
      sourceType: item.inputKind ?? (item.isGroup ? 'group' : 'unknown'),
      visible: item.sceneItemEnabled,
    }))
    setState({ sources })
    return sources
  } catch (err) {
    setState({ error: err instanceof Error ? err.message : 'Error al obtener fuentes' })
    return []
  }
}

export async function setSourceVisibility(sourceName: string, visible: boolean): Promise<void> {
  if (!obs) throw new Error('No conectado a OBS')
  const sceneName = currentState.currentScene
  if (!sceneName) throw new Error('No hay escena activa')

  // Buscar el ID de la fuente
  const response = (await obs.call('GetSceneItemList', { sceneName })) as unknown as SceneItemListResponse
  const item = response.sceneItems.find((i) => i.sourceName === sourceName)
  if (!item) throw new Error(`Fuente "${sourceName}" no encontrada`)

  await obs.call('SetSceneItemEnabled', {
    sceneName,
    sceneItemId: item.sceneItemId,
    sceneItemEnabled: visible,
  })

  // Actualizar estado local
  const sources = currentState.sources.map((s) =>
    s.sourceName === sourceName ? { ...s, visible } : s,
  )
  setState({ sources })
}

export async function startStreaming(): Promise<void> {
  if (!obs) throw new Error('No conectado a OBS')
  setState({ streamingStatus: 'starting' })
  try {
    await obs.call('StartStream')
    setState({ streamingStatus: 'streaming' })
  } catch (err) {
    setState({
      streamingStatus: 'offline',
      error: err instanceof Error ? err.message : 'Error al iniciar streaming',
    })
    throw err
  }
}

export async function stopStreaming(): Promise<void> {
  if (!obs) throw new Error('No conectado a OBS')
  setState({ streamingStatus: 'stopping' })
  try {
    await obs.call('StopStream')
    setState({ streamingStatus: 'offline' })
  } catch (err) {
    setState({
      streamingStatus: 'streaming',
      error: err instanceof Error ? err.message : 'Error al detener streaming',
    })
    throw err
  }
}

export async function refreshStreamingStatus(): Promise<ObsStreamingStatus> {
  if (!obs) return 'offline'
  try {
    const response = await obs.call('GetStreamStatus')
    const status: ObsStreamingStatus = response.outputActive ? 'streaming' : 'offline'
    setState({ streamingStatus: status })
    return status
  } catch {
    return 'offline'
  }
}
