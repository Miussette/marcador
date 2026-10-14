import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../src/types/api'
import type { DisplayState, ObsConnectionConfig, ObsState, OverlayPayload } from '../src/types'

/**
 * Puente seguro entre el renderer y Electron.
 * Solo se exponen operaciones concretas (contextBridge + ipcRenderer),
 * nunca APIs de Node ni acceso directo a la base de datos.
 */
const api: Api = {
  screens: {
    getAssignment: () => ipcRenderer.invoke('screens:getAssignment'),
    apply: assignment => ipcRenderer.invoke('screens:apply', assignment),
    openLive: (id, fullscreen) => ipcRenderer.invoke('screens:openLive', id, fullscreen),
    closeLive: () => ipcRenderer.invoke('screens:closeLive'),
    liveIsOpen: () => ipcRenderer.invoke('screens:liveIsOpen'),
    toggleLiveFullscreen: () => ipcRenderer.invoke('screens:toggleLiveFullscreen'),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    update: (id, patch) => ipcRenderer.invoke('projects:update', id, patch),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    duplicate: (id) => ipcRenderer.invoke('projects:duplicate', id),
    exportProject: (id) => ipcRenderer.invoke('projects:export', id),
    importProject: () => ipcRenderer.invoke('projects:import'),
  },

  teams: {
    list: (projectId) => ipcRenderer.invoke('teams:list', projectId),
    create: (input) => ipcRenderer.invoke('teams:create', input),
    update: (id, patch) => ipcRenderer.invoke('teams:update', id, patch),
    remove: (id) => ipcRenderer.invoke('teams:remove', id),
  },

  players: {
    listByTeam: (teamId) => ipcRenderer.invoke('players:listByTeam', teamId),
    create: (input) => ipcRenderer.invoke('players:create', input),
    update: (id, patch) => ipcRenderer.invoke('players:update', id, patch),
    remove: (id) => ipcRenderer.invoke('players:remove', id),
    bulkCreate: (inputs) => ipcRenderer.invoke('players:bulkCreate', inputs),
  },

  matches: {
    sportAction: (id, action) => ipcRenderer.invoke('matches:sportAction', id, action),
    list: (projectId) => ipcRenderer.invoke('matches:list', projectId),
    get: (id) => ipcRenderer.invoke('matches:get', id),
    adjustPlayerStat: (matchId, playerId, key, delta) => ipcRenderer.invoke('matches:adjustPlayerStat', matchId, playerId, key, delta),
    create: (input) => ipcRenderer.invoke('matches:create', input),
    update: (id, patch) => ipcRenderer.invoke('matches:update', id, patch),
    remove: (id) => ipcRenderer.invoke('matches:remove', id),
  },

  officials: {
    listByMatch: (matchId) => ipcRenderer.invoke('officials:listByMatch', matchId),
    create: (input) => ipcRenderer.invoke('officials:create', input),
    update: (id, patch) => ipcRenderer.invoke('officials:update', id, patch),
    remove: (id) => ipcRenderer.invoke('officials:remove', id),
    replaceAll: (matchId, officials) => ipcRenderer.invoke('officials:replaceAll', matchId, officials),
  },

  events: {
    list: (matchId) => ipcRenderer.invoke('events:list', matchId),
    create: (input) => ipcRenderer.invoke('events:create', input),
    update: (id, patch) => ipcRenderer.invoke('events:update', id, patch),
    remove: (id) => ipcRenderer.invoke('events:remove', id),
  },

  media: {
    list: (projectId) => ipcRenderer.invoke('media:list', projectId),
    create: (input) => ipcRenderer.invoke('media:create', input),
    remove: (id) => ipcRenderer.invoke('media:remove', id),
  },

  videos: {
    list: (projectId) => ipcRenderer.invoke('videos:list', projectId),
    create: (input) => ipcRenderer.invoke('videos:create', input),
    remove: (id) => ipcRenderer.invoke('videos:remove', id),
  },

  sequences: {
    list: (projectId) => ipcRenderer.invoke('sequences:list', projectId),
    create: (input) => ipcRenderer.invoke('sequences:create', input),
    remove: (id) => ipcRenderer.invoke('sequences:remove', id),
  },

  sponsors: {
    list: (projectId) => ipcRenderer.invoke('sponsors:list', projectId),
    create: (input) => ipcRenderer.invoke('sponsors:create', input),
    remove: (id) => ipcRenderer.invoke('sponsors:remove', id),
  },

  standings: {
    list: (projectId) => ipcRenderer.invoke('standings:list', projectId),
    create: (input) => ipcRenderer.invoke('standings:create', input),
    update: (id, patch) => ipcRenderer.invoke('standings:update', id, patch),
    remove: (id) => ipcRenderer.invoke('standings:remove', id),
  },

  shortcuts: {
    list: () => ipcRenderer.invoke('shortcuts:list'),
    create: (input) => ipcRenderer.invoke('shortcuts:create', input),
    update: (id, patch) => ipcRenderer.invoke('shortcuts:update', id, patch),
    remove: (id) => ipcRenderer.invoke('shortcuts:remove', id),
  },

  operators: {
    list: () => ipcRenderer.invoke('operators:list'),
    create: (input) => ipcRenderer.invoke('operators:create', input),
    remove: (id) => ipcRenderer.invoke('operators:remove', id),
  },

  acts: {
    list: (matchId) => ipcRenderer.invoke('acts:list', matchId),
    create: (input) => ipcRenderer.invoke('acts:create', input),
    remove: (id) => ipcRenderer.invoke('acts:remove', id),
    exportPdf: (actId) => ipcRenderer.invoke('acts:exportPdf', actId),
  },

  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },

  display: {
    open: (options) => ipcRenderer.invoke('display:open', options),
    close: () => ipcRenderer.invoke('display:close'),
    toggleFullscreen: () => ipcRenderer.invoke('display:toggleFullscreen'),
    isFullscreen: () => ipcRenderer.invoke('display:isFullscreen'),
    minimize: () => ipcRenderer.invoke('display:minimize'),
    setSize: (size) => ipcRenderer.invoke('display:setSize', size),
    isOpen: () => ipcRenderer.invoke('display:isOpen'),
    listDisplays: () => ipcRenderer.invoke('display:listDisplays'),
    getState: () => ipcRenderer.invoke('display:getState'),
    sync: (state) => ipcRenderer.invoke('display:sync', state),
    playContent: (kind, id) => ipcRenderer.invoke('display:playContent', kind, id),
    finishContent: (id) => ipcRenderer.invoke('display:finishContent', id),
    stopContent: () => ipcRenderer.invoke('display:stopContent'),
    getOverlay: () => ipcRenderer.invoke('display:getOverlay'),
    overlay: (payload) => ipcRenderer.invoke('display:overlay', payload),
    onState: (listener: (state: DisplayState | null) => void) => {
      const handler = (_event: unknown, state: DisplayState): void => listener(state)
      ipcRenderer.on('display:state', handler)
      return () => ipcRenderer.removeListener('display:state', handler)
    },
    onOverlay: (listener: (payload: OverlayPayload | null) => void) => {
      const handler = (_event: unknown, payload: OverlayPayload | null): void => listener(payload)
      ipcRenderer.on('display:overlay', handler)
      return () => ipcRenderer.removeListener('display:overlay', handler)
    },
    onFullscreen: (listener: (fullscreen: boolean) => void) => {
      const handler = (_event: unknown, fullscreen: boolean): void => listener(fullscreen)
      ipcRenderer.on('display:fullscreen', handler)
      return () => ipcRenderer.removeListener('display:fullscreen', handler)
    },
  },

  files: {
    pickVideo: () => ipcRenderer.invoke('files:pickVideo'),
    pickImage: () => ipcRenderer.invoke('files:pickImage'),
    pickTextFile: (extensions) => ipcRenderer.invoke('files:pickTextFile', extensions),
  },

  obs: {
    connect: (config: ObsConnectionConfig) => ipcRenderer.invoke('obs:connect', config),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getState: () => ipcRenderer.invoke('obs:getState'),
    listScenes: () => ipcRenderer.invoke('obs:listScenes'),
    setCurrentScene: (sceneName: string) => ipcRenderer.invoke('obs:setCurrentScene', sceneName),
    listSources: (sceneName?: string) => ipcRenderer.invoke('obs:listSources', sceneName),
    setSourceVisibility: (sourceName: string, visible: boolean) =>
      ipcRenderer.invoke('obs:setSourceVisibility', sourceName, visible),
    startStreaming: () => ipcRenderer.invoke('obs:startStreaming'),
    stopStreaming: () => ipcRenderer.invoke('obs:stopStreaming'),
    getStreamingStatus: () => ipcRenderer.invoke('obs:getStreamingStatus'),
    serverStart: (port?: number) => ipcRenderer.invoke('obs:serverStart', port),
    serverStop: () => ipcRenderer.invoke('obs:serverStop'),
    serverState: () => ipcRenderer.invoke('obs:serverState'),
    onStatusChange: (listener: (state: ObsState) => void) => {
      const handler = (_event: unknown, state: ObsState): void => listener(state)
      ipcRenderer.on('obs:statusChange', handler)
      return () => ipcRenderer.removeListener('obs:statusChange', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
