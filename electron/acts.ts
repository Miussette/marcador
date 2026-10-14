import fs from 'node:fs'
import { dialog } from 'electron'
import { jsPDF } from 'jspdf'
import {
  getMatch,
  getMatchAct,
  getProject,
  getTeam,
  listEvents,
  listOfficialsByMatch,
  listPlayersByTeam,
} from './repository'
import type { ExportResult, MatchEvent } from '../src/types'

/* ------------------------------------------------------------------ *
 *  Exportación de actas de partido a PDF (jsPDF, 100% offline).
 *  Se genera en el PROCESO PRINCIPAL: el contenido vive en SQLite.
 * ------------------------------------------------------------------ */

/** Etiquetas en español de los tipos de evento (coinciden con EventTimeline). */
const EVENT_TYPE_LABELS: Record<string, string> = {
  goal: 'Gol',
  own_goal: 'Autogol',
  yellow: 'Tarjeta amarilla',
  red: 'Tarjeta roja',
  substitution: 'Sustitución',
  penalty: 'Penal',
  var: 'VAR',
  added_time: 'Tiempo añadido',
  assist: 'Asistencia',
  save: 'Atajada',
  foul: 'Falta',
  offside: 'Fuera de juego',
  corner: 'Córner',
  free_kick: 'Tiro libre',
  set: 'Set',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  live: 'En juego',
  finished: 'Finalizado',
}

/** Coordenadas de contenido (márgenes A4 en puntos). */
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

/** Convierte la fecha de kickoff (ISO o epoch) a texto legible. */
function formatKickoff(kickoff: string): string {
  if (!kickoff) return '—'
  const date = new Date(kickoff)
  if (Number.isNaN(date.getTime())) return kickoff
  return date.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
}

/** Formatea los eventos para la tabla (minuto, tipo, equipo, jugador, detalle). */
function eventRow(event: MatchEvent, teamName: string, playerName: string): string[] {
  return [
    event.minute > 0 ? `${event.minute}'` : '—',
    EVENT_TYPE_LABELS[event.type] ?? event.type,
    teamName || '—',
    playerName || '—',
    event.description || '',
  ]
}

export async function exportActPdf(actId: string): Promise<ExportResult> {
  const act = getMatchAct(actId)
  if (!act) return { ok: false, canceled: false, error: 'El acta no existe.' }

  const match = getMatch(act.matchId)
  if (!match) return { ok: false, canceled: false, error: 'El partido no existe.' }

  const project = getProject(match.projectId)
  const home = getTeam(match.homeTeamId)
  const away = getTeam(match.awayTeamId)
  const events = listEvents(match.id)
  const officials = listOfficialsByMatch(match.id)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = MARGIN

  /** Escribe una línea y salta; si no cabe, crea página nueva. */
  const line = (text: string, size: number, style: 'normal' | 'bold' | 'italic', color: [number, number, number], gap = 16) => {
    if (y + size > PAGE_H - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    doc.text(text, MARGIN, y)
    y += size + gap
  }

  /** Escribe un párrafo con ajuste de línea y paginación automática. */
  const paragraph = (text: string, size: number, color: [number, number, number], gap = 8) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[]
    for (const ln of lines) {
      if (y + size > PAGE_H - MARGIN) {
        doc.addPage()
        y = MARGIN
      }
      doc.text(ln, MARGIN, y)
      y += size + gap
    }
  }

  /* ------------------------------ cabecera ------------------------------ */
  doc.setFillColor(16, 24, 39)
  doc.rect(0, 0, PAGE_W, 92, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('ACTA DE PARTIDO', MARGIN, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(203, 213, 225)
  doc.text(match.competition || project?.name || 'Marcador Pro', MARGIN, 68)
  y = 92 + MARGIN

  /* --------------------------- datos generales -------------------------- */
  const info: [string, string][] = [
    ['Fecha', formatKickoff(match.kickoff)],
    ['Competencia', match.competition || project?.name || '—'],
    ['Ronda', match.round || '—'],
    ['Sede', match.venue || project?.location || '—'],
    ['Estado', STATUS_LABELS[match.status] ?? match.status],
  ]
  for (const [label, value] of info) {
    if (y + 14 > PAGE_H - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`${label}:`, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(value, MARGIN + 90, y)
    y += 18
  }

  /* ------------------------------- marcador ----------------------------- */
  y += 10
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(MARGIN, y - 12, CONTENT_W, 64, 6, 6, 'F')
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const homeName = home?.name ?? 'Local'
  const awayName = away?.name ?? 'Visitante'
  doc.text(homeName, MARGIN + 16, y + 14, { maxWidth: 170 })
  doc.text(awayName, PAGE_W - MARGIN - 16, y + 14, { align: 'right', maxWidth: 170 })
  doc.setFontSize(30)
  doc.text(`${match.homeScore} — ${match.awayScore}`, PAGE_W / 2, y + 24, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('MARCADOR FINAL', PAGE_W / 2, y + 42, { align: 'center' })
  y += 76

  /* -------------------------------- eventos ----------------------------- */
  if (events.length > 0) {
    line('EVENTOS DEL PARTIDO', 13, 'bold', [15, 23, 42], 10)

    const cols = [MARGIN, MARGIN + 46, MARGIN + 136, MARGIN + 256, MARGIN + 356]
    const header = ['MIN', 'TIPO', 'EQUIPO', 'JUGADOR', 'DETALLE']
    const widths = [46, 90, 120, 100, CONTENT_W - 308]

    const drawHeader = () => {
      doc.setFillColor(16, 24, 39)
      doc.rect(MARGIN, y - 11, CONTENT_W, 18, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      header.forEach((h, i) => doc.text(h, cols[i] + 4, y + 1))
      y += 20
    }

    drawHeader()
    let zebra = false
    for (const event of events) {
      const team = event.teamId ? getTeam(event.teamId) : undefined
      const player = event.playerId
        ? team
          ? listPlayersByTeam(team.id).find((p) => p.id === event.playerId)
          : undefined
        : undefined
      const playerName = player ? [player.firstName, player.lastName].filter(Boolean).join(' ') : ''
      const cells = eventRow(event, team?.name ?? '', playerName)

      // Ajusta cada celda al ancho de su columna.
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const wrapped = cells.map((cell, i) => doc.splitTextToSize(cell, widths[i] - 8) as string[])
      const rowH = Math.max(16, Math.max(...wrapped.map((w) => w.length)) * 11 + 6)

      if (y + rowH > PAGE_H - MARGIN) {
        doc.addPage()
        y = MARGIN
        drawHeader()
        zebra = false
      }

      if (zebra) {
        doc.setFillColor(248, 250, 252)
        doc.rect(MARGIN, y - 10, CONTENT_W, rowH, 'F')
      }
      zebra = !zebra

      doc.setTextColor(15, 23, 42)
      wrapped.forEach((cell, i) => {
        doc.text(cell, cols[i] + 4, y)
      })
      y += rowH
    }
    y += 6
  }

  /* ---------------------------- texto del acta --------------------------- */
  line('CONTENIDO DEL ACTA', 13, 'bold', [15, 23, 42], 10)
  paragraph(act.content, 11, [30, 41, 59], 7)

  /* --------------------------- oficiales/firmas -------------------------- */
  if (officials.length > 0) {
    y += 14
    line('OFICIALES DEL PARTIDO', 12, 'bold', [15, 23, 42], 8)
    for (const o of officials) {
      const detail = [o.name, o.type, o.country].filter(Boolean).join(' · ')
      paragraph(detail || '—', 10, [71, 85, 105], 6)
    }
  }

  y += 28
  if (y + 70 > PAGE_H - MARGIN) {
    doc.addPage()
    y = MARGIN
  }
  doc.setDrawColor(148, 163, 184)
  doc.line(MARGIN, y + 30, MARGIN + 180, y + 30)
  doc.line(PAGE_W - MARGIN - 180, y + 30, PAGE_W - MARGIN, y + 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('Firma del operador', MARGIN, y + 46)
  doc.text('Firma del árbitro', PAGE_W - MARGIN - 180, y + 46)

  /* --------------------------- pie de página ----------------------------- */
  const stamp = new Date().toLocaleString('es-ES')
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generado por Marcador Pro · ${stamp}`, MARGIN, PAGE_H - 24)
    doc.text(`${p} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' })
  }

  /* --------------------------- guardar archivo --------------------------- */
  const base = `${(match.competition || 'acta').replace(/[^\wáéíóúñü -]/gi, '').trim() || 'acta'}-${homeName}-vs-${awayName}`
    .replace(/\s+/g, '-')
    .toLowerCase()
  const result = await dialog.showSaveDialog({
    title: 'Exportar acta en PDF',
    defaultPath: `${base}.pdf`,
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
  })
  if (result.canceled || !result.filePath) return { ok: false, canceled: true }
  try {
    const buffer = Buffer.from(doc.output('arraybuffer'))
    await fs.promises.writeFile(result.filePath, buffer)
    return { ok: true, canceled: false, filePath: result.filePath }
  } catch (err) {
    return { ok: false, canceled: false, error: err instanceof Error ? err.message : String(err) }
  }
}
