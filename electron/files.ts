import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { dialog } from 'electron'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
}

/** Selecciona una imagen y la devuelve como data URL (para guardar en SQLite). */
export async function pickImage(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar imagen',
    properties: ['openFile'],
    filters: [
      { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
    ],
  })
  if (result.canceled || !result.filePaths[0]) return null
  const filePath = result.filePaths[0]
  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME_BY_EXT[ext]
  if (!mime) throw new Error(`Formato de imagen no soportado: ${ext}`)
  const buf = await fs.promises.readFile(filePath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

/** Selecciona un archivo de texto (ej. CSV) y devuelve su contenido. */
export async function pickTextFile(extensions: string[]): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar archivo',
    properties: ['openFile'],
    filters: [
      { name: 'Archivos de texto', extensions },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  })
  if (result.canceled || !result.filePaths[0]) return null
  return fs.promises.readFile(result.filePaths[0], 'utf8')
}

export async function pickVideo(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ title: 'Seleccionar video', properties: ['openFile'], filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'ogg'] }] })
  if (result.canceled || !result.filePaths[0]) return null
  return pathToFileURL(result.filePaths[0]).href
}
