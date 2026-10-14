export interface ParsedPlayerRow {
  firstName: string
  lastName: string
  number: number | null
  position: string
  /** true si la fila se descartó (fila de encabezado o vacía) */
  skipped: boolean
}

const HEADER_TOKENS = [
  'nombre',
  'name',
  'firstname',
  'first_name',
  'apellido',
  'lastname',
  'last_name',
  'numero',
  'número',
  'dorsal',
  'number',
  'shirt',
  'posicion',
  'posición',
  'position',
  'rol',
  'role',
]

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const candidates = [';', ',', '\t']
  let best = ','
  let bestCount = -1
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1
    if (count > bestCount) {
      bestCount = count
      best = c
    }
  }
  return best
}

/** Parser CSV tolerante a comillas, comas/point-commas y saltos Windows. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(clean)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function isHeaderRow(cells: string[]): boolean {
  const normalized = cells.map((c) => c.trim().toLowerCase())
  const matches = normalized.filter((cell) => HEADER_TOKENS.includes(cell))
  return matches.length >= 2 || (normalized.length > 0 && HEADER_TOKENS.includes(normalized[0]) && matches.length >= 1)
}

function indexOfHeader(cells: string[], names: string[]): number {
  const normalized = cells.map((c) => c.trim().toLowerCase())
  for (const name of names) {
    const index = normalized.indexOf(name)
    if (index >= 0) return index
  }
  return -1
}

/**
 * Convierte filas CSV en jugadores.
 * Soporta encabezados en español/inglés y, en su ausencia, el orden:
 * nombre,apellido,numero,posicion
 */
export function playersFromCsv(text: string): ParsedPlayerRow[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []

  const hasHeader = isHeaderRow(rows[0])
  const header = hasHeader ? rows[0] : null
  const dataRows = hasHeader ? rows.slice(1) : rows

  const idx = header
    ? {
        first: indexOfHeader(header, ['nombre', 'name', 'firstname', 'first_name']),
        last: indexOfHeader(header, ['apellido', 'lastname', 'last_name']),
        number: indexOfHeader(header, ['numero', 'número', 'dorsal', 'number', 'shirt']),
        position: indexOfHeader(header, ['posicion', 'posición', 'position', 'rol', 'role']),
      }
    : { first: 0, last: 1, number: 2, position: 3 }

  const out: ParsedPlayerRow[] = []
  if (hasHeader) {
    out.push({ firstName: '', lastName: '', number: null, position: '', skipped: true })
  }

  for (const cells of dataRows) {
    const cell = (i: number): string => (i >= 0 && i < cells.length ? (cells[i] ?? '').trim() : '')
    const rawNumber = cell(idx.number)
    const parsedNumber = rawNumber === '' ? null : Number.parseInt(rawNumber, 10)
    out.push({
      firstName: cell(idx.first),
      lastName: cell(idx.last),
      number: Number.isFinite(parsedNumber as number) ? (parsedNumber as number) : null,
      position: cell(idx.position),
      skipped: false,
    })
  }
  return out
}

export const PLAYERS_CSV_TEMPLATE = 'nombre,apellido,numero,posicion\nJuan,Pérez,10,Delantero\nPedro,López,4,Defensa\n'
