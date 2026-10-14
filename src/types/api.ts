import type { ScreenAssignment } from './index'
import type { SportAction } from '../features/sports/types'
import type {
  DisplayInfo,
  DisplayOpenOptions,
  DisplayState,
  DisplaySyncState,
  ExportResult,
  ImportResult,
  Match,
  MatchAct,
  MatchEvent,
  MatchEventUpdate,
  MatchOfficial,
  MatchOfficialUpdate,
  MediaItem,
  NewMatchActInput,
  NewMatchEventInput,
  NewMatchInput,
  NewMatchOfficialInput,
  NewOperatorProfileInput,
  NewPlayerInput,
  NewProjectInput,
  NewScheduledSequenceInput,
  NewShortcutBindingInput,
  NewSponsorRotationInput,
  NewStandingEntryInput,
  NewTeamInput,
  NewVideoInput,
  ObsConnectionConfig,
  ObsServerState,
  ObsState,
  OperatorProfile,
  OverlayPayload,
  Player,
  Project,
  ScheduledSequence,
  ShortcutBinding,
  SponsorRotation,
  StandingEntry,
  Team,
  VideoItem,
} from './index'

export interface Api {
  screens: {
    getAssignment(): Promise<ScreenAssignment>
    apply(assignment: ScreenAssignment): Promise<{ ok: boolean; error?: string }>
    openLive(displayId?: number, fullscreen?: boolean): Promise<{ ok: boolean; error?: string }>
    closeLive(): Promise<void>
    liveIsOpen(): Promise<boolean>
    toggleLiveFullscreen(): Promise<boolean>
  }
  projects: {
    list(): Promise<Project[]>
    get(id: string): Promise<Project | null>
    create(input: NewProjectInput): Promise<Project>
    update(id: string, patch: Partial<NewProjectInput>): Promise<Project>
    remove(id: string): Promise<void>
    duplicate(id: string): Promise<Project>
    exportProject(id: string): Promise<ExportResult>
    importProject(): Promise<ImportResult>
  }

  teams: {
    list(projectId: string): Promise<Team[]>
    create(input: NewTeamInput): Promise<Team>
    update(id: string, patch: Partial<NewTeamInput>): Promise<Team>
    remove(id: string): Promise<void>
  }

  players: {
    listByTeam(teamId: string): Promise<Player[]>
    create(input: NewPlayerInput): Promise<Player>
    update(id: string, patch: Partial<NewPlayerInput>): Promise<Player>
    remove(id: string): Promise<void>
    bulkCreate(inputs: NewPlayerInput[]): Promise<number>
  }

  matches: {
    sportAction(id: string, action: SportAction): Promise<Match>
    list(projectId: string): Promise<Match[]>
    adjustPlayerStat(matchId: string, playerId: string, key: 'points' | 'fouls', delta: number): Promise<Match>
    get(id: string): Promise<Match | null>
    create(input: NewMatchInput): Promise<Match>
    update(id: string, patch: Partial<Match>): Promise<Match>
    remove(id: string): Promise<void>
  }

  /** Oficiales del partido (árbitros, anotadores…). */
  officials: {
    listByMatch(matchId: string): Promise<MatchOfficial[]>
    create(input: NewMatchOfficialInput & { matchId: string }): Promise<MatchOfficial>
    update(id: string, patch: MatchOfficialUpdate): Promise<MatchOfficial>
    remove(id: string): Promise<void>
    /** Sincroniza la lista completa de oficiales de un partido (borra los ausentes). */
    replaceAll(matchId: string, officials: NewMatchOfficialInput[]): Promise<MatchOfficial[]>
  }

  events: {
    list(matchId: string): Promise<MatchEvent[]>
    create(input: NewMatchEventInput): Promise<MatchEvent>
    update(id: string, patch: MatchEventUpdate): Promise<MatchEvent>
    remove(id: string): Promise<void>
  }

  media: {
    list(projectId: string): Promise<MediaItem[]>
    create(input: {
      projectId: string
      name: string
      kind: 'image' | 'text'
      data: string
      duration: number
    }): Promise<MediaItem>
    remove(id: string): Promise<void>
  }

  videos: {
    list(projectId: string): Promise<VideoItem[]>
    create(input: NewVideoInput): Promise<VideoItem>
    remove(id: string): Promise<void>
  }

  sequences: {
    list(projectId: string): Promise<ScheduledSequence[]>
    create(input: NewScheduledSequenceInput): Promise<ScheduledSequence>
    remove(id: string): Promise<void>
  }

  sponsors: {
    list(projectId: string): Promise<SponsorRotation[]>
    create(input: NewSponsorRotationInput): Promise<SponsorRotation>
    remove(id: string): Promise<void>
  }

  standings: {
    list(projectId: string): Promise<StandingEntry[]>
    create(input: NewStandingEntryInput): Promise<StandingEntry>
    update(id: string, patch: Partial<NewStandingEntryInput>): Promise<StandingEntry>
    remove(id: string): Promise<void>
  }

  shortcuts: {
    list(): Promise<ShortcutBinding[]>
    create(input: NewShortcutBindingInput): Promise<ShortcutBinding>
    update(id: string, patch: Partial<NewShortcutBindingInput>): Promise<ShortcutBinding>
    remove(id: string): Promise<void>
  }

  operators: {
    list(): Promise<OperatorProfile[]>
    create(input: NewOperatorProfileInput): Promise<OperatorProfile>
    remove(id: string): Promise<void>
  }

  acts: {
    list(matchId: string): Promise<MatchAct[]>
    create(input: NewMatchActInput): Promise<MatchAct>
    remove(id: string): Promise<void>
    /** Genera el PDF del acta y muestra el diálogo de guardado. */
    exportPdf(actId: string): Promise<ExportResult>
  }

  settings: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
  }

  display: {
    open(options?: DisplayOpenOptions): Promise<{ ok: boolean; error?: string }>
    close(): Promise<void>
    toggleFullscreen(): Promise<boolean>
    /** Estado actual de pantalla completa de la ventana Display. */
    isFullscreen(): Promise<boolean>
    /** Minimiza la ventana Display (la deja en la barra de tareas). */
    minimize(): Promise<void>
    /** Redimensiona la ventana Display sin bordes (limitado al monitor actual). */
    setSize(size: { width: number; height: number }): Promise<void>
    isOpen(): Promise<boolean>
    listDisplays(): Promise<DisplayInfo[]>
    getState(): Promise<DisplayState | null>
    /** Envía el estado del marcador a la ventana Display (null = pantalla de espera). */
    sync(state: DisplaySyncState | null): Promise<void>
    /** Muestra una superposición temporal (gol, sponsor, mensaje). */
    playContent(kind: 'video' | 'sequence' | 'sponsor', id: string): Promise<void>
    finishContent(id: string): Promise<void>
    stopContent(): Promise<void>
    getOverlay(): Promise<OverlayPayload | null>
    overlay(payload: Omit<OverlayPayload, 'id'>): Promise<void>
    onState(listener: (state: DisplayState | null) => void): () => void
    onOverlay(listener: (payload: OverlayPayload | null) => void): () => void
    /** Cambia de pantalla completa ↔ ventana (F11, botones, sistema). */
    onFullscreen(listener: (fullscreen: boolean) => void): () => void
  }

  files: {
    /** Abre un diálogo de imágenes y devuelve un data URL. */
    pickVideo(): Promise<string | null>
    pickImage(): Promise<string | null>
    /** Abre un diálogo de texto y devuelve el contenido (ej. CSV). */
    pickTextFile(extensions: string[]): Promise<string | null>
  }

  obs: {
    connect(config: ObsConnectionConfig): Promise<void>
    disconnect(): Promise<void>
    getState(): Promise<ObsState>
    listScenes(): Promise<ObsState['scenes']>
    setCurrentScene(sceneName: string): Promise<void>
    listSources(sceneName?: string): Promise<ObsState['sources']>
    setSourceVisibility(sourceName: string, visible: boolean): Promise<void>
    startStreaming(): Promise<void>
    stopStreaming(): Promise<void>
    getStreamingStatus(): Promise<ObsState['streamingStatus']>
    /** Servidor web local para usar el marcador en OBS (Browser Source). */
    serverStart(port?: number): Promise<{ ok: boolean; url?: string; error?: string }>
    serverStop(): Promise<void>
    serverState(): Promise<ObsServerState>
    onStatusChange(listener: (state: ObsState) => void): () => void
  }
}

declare global {
  interface Window {
    api: Api
  }
}

export {}
