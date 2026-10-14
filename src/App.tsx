import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Toaster } from '@/components/ui/Toaster'
import { ActsPage } from '@/pages/ActsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { CompetitionPage } from '@/pages/CompetitionPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DesignEditorPage } from '@/pages/DesignEditorPage'
import { MatchControlPage } from '@/pages/MatchControlPage'
import { MatchesPage } from '@/pages/MatchesPage'
import { MultimediaPage } from '@/pages/MultimediaPage'
import { ObsSettingsPage } from '@/pages/ObsSettingsPage'
import { OperatorsPage } from '@/pages/OperatorsPage'
import { ParticipantsPage } from '@/pages/ParticipantsPage'
import { PlayersPage } from '@/pages/PlayersPage'
import { ProjectLayout } from '@/pages/ProjectLayout'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ScoreboardPage } from '@/pages/ScoreboardPage'
import { SequencesPage } from '@/pages/SequencesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ShortcutsPage } from '@/pages/ShortcutsPage'
import { SponsorsPage } from '@/pages/SponsorsPage'
import { StandingsPage } from '@/pages/StandingsPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { VideosPage } from '@/pages/VideosPage'
import { useMatchesStore } from '@/stores/matchesStore'
import { useSettingsStore } from '@/stores/settingsStore'

function BootScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-app">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white">
        MP
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" />
        Recuperando sesión…
      </div>
    </div>
  )
}

export function App() {
  const navigate = useNavigate()
  const [booting, setBooting] = useState(true)

  // Arranque: carga configuración y recupera el partido activo (autoguardado).
  useEffect(() => {
    let cancelled = false
    const boot = async (): Promise<void> => {
      try {
        await useSettingsStore.getState().load()
        await useMatchesStore.getState().restoreActive()
        if (!cancelled) navigate('/', { replace: true })
      } catch (error) {
        console.warn('[boot] No se pudo recuperar el estado:', error)
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
    // Ejecutar una sola vez: los cambios de ruta no deben repetir el arranque.
  }, [])

  if (booting) return <BootScreen />

  return (
    <>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/p/:projectId" element={<ProjectLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="competition" element={<CompetitionPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="scoreboard" element={<ScoreboardPage />} />
          <Route path="multimedia" element={<MultimediaPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="sequences" element={<SequencesPage />} />
          <Route path="sponsors" element={<SponsorsPage />} />
          <Route path="standings" element={<StandingsPage />} />
          <Route path="shortcuts" element={<ShortcutsPage />} />
          <Route path="operators" element={<OperatorsPage />} />
          <Route path="obs" element={<ObsSettingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/p/:projectId/control/:matchId" element={<MatchControlPage />} />
        <Route path="/p/:projectId/acts/:matchId" element={<ActsPage />} />
        <Route path="/p/:projectId/design" element={<DesignEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
