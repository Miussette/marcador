import * as screens from './screens'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, ipcMain } from 'electron'
import * as repo from './repository'
import { exportActPdf } from './acts'
import { pickImage, pickTextFile, pickVideo } from './files'
import {
  broadcastForSetting,
  playback,
  getOverlay,
  closeDisplay,
  getDisplayState,
  isDisplayFullscreen,
  isDisplayOpen,
  listDisplays,
  minimizeDisplay,
  openDisplay,
  sendOverlay,
  setDisplaySize,
  syncDisplay,
  toggleFullscreen,
} from './display'
import {
  getServerPort,
  getServerUrl,
  isServerRunning,
  startServer,
  stopServer,
} from './obsServer'
import {
  connectObs,
  disconnectObs,
  getObsState,
  onObsStateChange,
  refreshScenes,
  refreshSources,
  refreshStreamingStatus,
  setCurrentScene,
  setSourceVisibility,
  startStreaming,
  stopStreaming,
} from './obs'
import type { DisplaySyncState, ObsConnectionConfig, OverlayPayload } from '../src/types'

/**
 * Registra todos los canales IPC expuestos al renderer mediante contextBridge.
 * El renderer nunca accede a Node ni a la base de datos directamente.
 */
export function registerIpcHandlers(): void {
  let playbackRequest = 0
  /* ------------------------------ proyectos ------------------------------ */
  ipcMain.handle('projects:list', () => repo.listProjects())
  ipcMain.handle('projects:get', (_e, id: string) => repo.getProject(id) ?? null)
  ipcMain.handle('projects:create', (_e, input) => repo.createProject(input))
  ipcMain.handle('projects:update', (_e, id: string, patch) => repo.updateProject(id, patch))
  ipcMain.handle('projects:remove', (_e, id: string) => repo.deleteProject(id))
  ipcMain.handle('projects:duplicate', (_e, id: string) => repo.duplicateProject(id))
  ipcMain.handle('projects:export', (_e, id: string) => repo.exportProject(id))
  ipcMain.handle('projects:import', () => repo.importProject())

  /* -------------------------------- equipos ------------------------------ */
  ipcMain.handle('teams:list', (_e, projectId: string) => repo.listTeams(projectId))
  ipcMain.handle('teams:create', (_e, input) => repo.createTeam(input))
  ipcMain.handle('teams:update', (_e, id: string, patch) => repo.updateTeam(id, patch))
  ipcMain.handle('teams:remove', (_e, id: string) => repo.deleteTeam(id))

  /* ------------------------------ jugadores ------------------------------ */
  ipcMain.handle('players:listByTeam', (_e, teamId: string) => repo.listPlayersByTeam(teamId))
  ipcMain.handle('players:create', (_e, input) => repo.createPlayer(input))
  ipcMain.handle('players:update', (_e, id: string, patch) => repo.updatePlayer(id, patch))
  ipcMain.handle('players:remove', (_e, id: string) => repo.deletePlayer(id))
  ipcMain.handle('players:bulkCreate', (_e, inputs) => repo.bulkCreatePlayers(inputs))

  /* ------------------------------- partidos ------------------------------ */
  ipcMain.handle('matches:sportAction', (_e, id, action) => repo.sportAction(id, action))
  ipcMain.handle('screens:getAssignment', () => screens.getScreenAssignment())
  ipcMain.handle('screens:apply', (_e, assignment) => screens.applyScreenAssignment(assignment))
  ipcMain.handle('screens:openLive', (_e, id, fullscreen) => screens.openLive(id, fullscreen))
  ipcMain.handle('screens:closeLive', () => screens.closeLive())
  ipcMain.handle('screens:liveIsOpen', () => screens.liveIsOpen())
  ipcMain.handle('screens:toggleLiveFullscreen', () => screens.toggleLiveFullscreen())
  ipcMain.handle('matches:list', (_e, projectId: string) => repo.listMatches(projectId))
  ipcMain.handle('matches:adjustPlayerStat', (_e, matchId, playerId, key, delta) => repo.adjustPlayerStat(matchId, playerId, key, delta))
  ipcMain.handle('matches:get', (_e, id: string) => repo.getMatch(id) ?? null)
  ipcMain.handle('matches:create', (_e, input) => repo.createMatch(input))
  ipcMain.handle('matches:update', (_e, id: string, patch) => repo.updateMatch(id, patch))
  ipcMain.handle('matches:remove', (_e, id: string) => repo.deleteMatch(id))

  /* ------------------------------ oficiales ------------------------------ */
  ipcMain.handle('officials:listByMatch', (_e, matchId: string) => repo.listOfficialsByMatch(matchId))
  ipcMain.handle('officials:create', (_e, input) => repo.createOfficial(input))
  ipcMain.handle('officials:update', (_e, id: string, patch) => repo.updateOfficial(id, patch))
  ipcMain.handle('officials:remove', (_e, id: string) => repo.deleteOfficial(id))
  ipcMain.handle('officials:replaceAll', (_e, matchId: string, officials) => repo.replaceAllOfficials(matchId, officials))

  /* -------------------------------- eventos ------------------------------ */
  ipcMain.handle('events:list', (_e, matchId: string) => repo.listEvents(matchId))
  ipcMain.handle('events:create', (_e, input) => repo.createEvent(input))
  ipcMain.handle('events:update', (_e, id: string, patch) => repo.updateEvent(id, patch))
  ipcMain.handle('events:remove', (_e, id: string) => repo.deleteEvent(id))

  /* ------------------------------ multimedia ----------------------------- */
  ipcMain.handle('media:list', (_e, projectId: string) => repo.listMedia(projectId))
  ipcMain.handle('media:create', (_e, input) => repo.createMedia(input))
  ipcMain.handle('media:remove', (_e, id: string) => repo.deleteMedia(id))

  /* ------------------------------ videos ----------------------------- */
  ipcMain.handle('videos:list', (_e, projectId: string) => repo.listVideos(projectId))
  ipcMain.handle('videos:create', (_e, input) => repo.createVideo(input))
  ipcMain.handle('videos:remove', (_e, id: string) => {
    if (getOverlay()?.sourceKind === 'video' && getOverlay()?.sourceId === id) playback.stop()
    repo.deleteVideo(id)
  })

  /* ------------------------------ secuencias programadas ----------------------------- */
  ipcMain.handle('sequences:list', (_e, projectId: string) => repo.listScheduledSequences(projectId))
  ipcMain.handle('sequences:create', (_e, input) => repo.createScheduledSequence(input))
  ipcMain.handle('sequences:remove', (_e, id: string) => {
    if (getOverlay()?.sourceKind === 'sequence' && getOverlay()?.sourceId === id) playback.stop()
    repo.deleteScheduledSequence(id)
  })

  /* ------------------------------ rotación de sponsors ----------------------------- */
  ipcMain.handle('sponsors:list', (_e, projectId: string) => repo.listSponsorRotations(projectId))
  ipcMain.handle('sponsors:create', (_e, input) => repo.createSponsorRotation(input))
  ipcMain.handle('sponsors:remove', (_e, id: string) => {
    if (getOverlay()?.sourceKind === 'sponsor' && getOverlay()?.sourceId === id) playback.stop()
    repo.deleteSponsorRotation(id)
  })

  /* ------------------------------ tabla de posiciones ----------------------------- */
  ipcMain.handle('standings:list', (_e, projectId: string) => repo.listStandings(projectId))
  ipcMain.handle('standings:create', (_e, input) => repo.createStandingEntry(input))
  ipcMain.handle('standings:update', (_e, id: string, patch) => repo.updateStandingEntry(id, patch))
  ipcMain.handle('standings:remove', (_e, id: string) => repo.deleteStandingEntry(id))

  /* ------------------------------ atajos configurables ----------------------------- */
  ipcMain.handle('shortcuts:list', () => repo.listShortcuts())
  ipcMain.handle('shortcuts:create', (_e, input) => repo.createShortcut(input))
  ipcMain.handle('shortcuts:update', (_e, id: string, patch) => repo.updateShortcut(id, patch))
  ipcMain.handle('shortcuts:remove', (_e, id: string) => repo.deleteShortcut(id))

  /* ------------------------------ perfiles de operador ----------------------------- */
  ipcMain.handle('operators:list', () => repo.listOperatorProfiles())
  ipcMain.handle('operators:create', (_e, input) => repo.createOperatorProfile(input))
  ipcMain.handle('operators:remove', (_e, id: string) => repo.deleteOperatorProfile(id))

  /* ------------------------------ actas de partido ----------------------------- */
  ipcMain.handle('acts:list', (_e, matchId: string) => repo.listMatchActs(matchId))
  ipcMain.handle('acts:create', (_e, input) => repo.createMatchAct(input))
  ipcMain.handle('acts:remove', (_e, id: string) => repo.deleteMatchAct(id))
  ipcMain.handle('acts:exportPdf', (_e, actId: string) => exportActPdf(actId))

  /* ----------------------------- configuración --------------------------- */
  ipcMain.handle('settings:get', (_e, key: string) => repo.getSetting(key))
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    repo.setSetting(key, value)
    // Cambios que afectan a la pantalla deben refrescarla al instante.
    broadcastForSetting(key)
  })

  /* -------------------------------- display ------------------------------ */
  ipcMain.handle('display:open', (_e, options) => openDisplay(options))
  ipcMain.handle('display:close', () => closeDisplay())
  ipcMain.handle('display:isOpen', () => isDisplayOpen())
  ipcMain.handle('display:toggleFullscreen', () => toggleFullscreen())
  ipcMain.handle('display:isFullscreen', () => isDisplayFullscreen())
  ipcMain.handle('display:minimize', () => minimizeDisplay())
  ipcMain.handle('display:setSize', (_e, size: { width?: number; height?: number }) =>
    setDisplaySize(size ?? {}),
  )
  ipcMain.handle('display:listDisplays', () => listDisplays())
  ipcMain.handle('display:getState', () => getDisplayState())
  ipcMain.handle('display:sync', (_e, state: DisplaySyncState | null) => syncDisplay(state))
  ipcMain.handle('display:overlay', (_e, payload: Omit<OverlayPayload, 'id'>) => { playbackRequest += 1; sendOverlay(payload) })
  ipcMain.handle('display:finishContent', (_e, id: string) => { if (getOverlay()?.id === id) { playbackRequest += 1; playback.stop() } })
  ipcMain.handle('display:getOverlay', () => getOverlay())
  ipcMain.handle('display:stopContent', () => { playbackRequest += 1; playback.stop() })
  ipcMain.handle('display:playContent', async (_e, kind: string, id: string) => {
    const request = ++playbackRequest
    if (kind === 'video') {
      const video = repo.getVideo(id)
      if (!video) throw new Error('El video ya no existe.')
      if (!video.src.startsWith('file:')) throw new Error('Vuelve a agregar el video desde su archivo original.')
      await fs.promises.access(fileURLToPath(video.src))
      const result = await startServer()
      if (!result.ok) throw new Error(result.error)
      if (request !== playbackRequest) return
      playback.play([{ kind: 'video', sourceKind: 'video', sourceId: video.id, videoId: video.id, text: video.name, dataUrl: `${getServerUrl()}video/${encodeURIComponent(video.id)}`, durationMs: video.duration > 0 ? video.duration * 1000 : 86_400_000 }], false)
      return
    }
    const content = kind === 'sequence' ? repo.getScheduledSequence(id) : kind === 'sponsor' ? repo.getSponsorRotation(id) : null
    if (!content) throw new Error('El contenido ya no existe.')
    const ids = 'itemIds' in content ? content.itemIds : content.imageIds
    const media = repo.listMedia(content.projectId)
    const entries = ids.map(itemId => media.find(item => item.id === itemId))
    if (!entries.length || entries.some(item => !item || (kind === 'sponsor' && item.kind !== 'image'))) {
      throw new Error('La lista está vacía o contiene elementos eliminados. Vuelve a crearla con contenido disponible.')
    }
    playback.play(entries.map(item => ({ sourceKind: kind as 'sequence' | 'sponsor', sourceId: id, kind: item!.kind, text: item!.kind === 'text' ? item!.data : item!.name, dataUrl: item!.kind === 'image' ? item!.data : null, durationMs: content.intervalSec * 1000 })), 'loop' in content ? content.loop : true)
  })

  /* --------------------------------- archivos ----------------------------- */
  ipcMain.handle('files:pickImage', () => pickImage())
  ipcMain.handle('files:pickVideo', () => pickVideo())
  ipcMain.handle('files:pickTextFile', (_e, extensions: string[]) => pickTextFile(extensions))

  /* ---------------------------------- OBS --------------------------------- */
  ipcMain.handle('obs:connect', (_e, config: ObsConnectionConfig) => connectObs(config))
  ipcMain.handle('obs:disconnect', () => disconnectObs())
  ipcMain.handle('obs:getState', () => getObsState())
  ipcMain.handle('obs:listScenes', () => refreshScenes())
  ipcMain.handle('obs:setCurrentScene', (_e, sceneName: string) => setCurrentScene(sceneName))
  ipcMain.handle('obs:listSources', (_e, sceneName?: string) => refreshSources(sceneName))
  ipcMain.handle('obs:setSourceVisibility', (_e, sourceName: string, visible: boolean) =>
    setSourceVisibility(sourceName, visible),
  )
  ipcMain.handle('obs:startStreaming', () => startStreaming())
  ipcMain.handle('obs:stopStreaming', () => stopStreaming())
  ipcMain.handle('obs:getStreamingStatus', () => refreshStreamingStatus())

  /* --------------------- Servidor web para OBS --------------------- */
  ipcMain.handle('obs:serverStart', (_e, portRequested?: number) => startServer(portRequested))
  ipcMain.handle('obs:serverStop', () => {
    stopServer()
  })
  ipcMain.handle('obs:serverState', () => ({
    running: isServerRunning(),
    port: getServerPort(),
    url: getServerUrl(),
  }))

  // Eventos de cambio de estado OBS → renderer
  onObsStateChange((state) => {
    // Se envía a todas las ventanas; el renderer filtra si está conectado
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('obs:statusChange', state)
      }
    })
  })
}
