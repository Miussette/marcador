import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import initSqlJsModule from 'sql.js'

/* ------------------------------------------------------------------ *
 *  Capa SQLite (sql.js — SQLite compilado a WASM, 100% offline)
 *  La base vive en el PROCESO PRINCIPAL. El renderer solo habla IPC.
 * ------------------------------------------------------------------ */

export interface SqlStatement {
  bind(params?: unknown[]): void
  step(): boolean
  getAsObject(): Record<string, unknown>
  free(): void
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement
  run(sql: string, params?: unknown[]): void
  export(): Uint8Array
  close(): void
}

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlDatabase
}

type SqlJsFactory = (config?: {
  locateFile?: (file: string) => string
}) => Promise<SqlJsStatic>

let db: SqlDatabase | null = null
let dbFile = ''
let persistTimer: ReturnType<typeof setTimeout> | null = null
let dirty = false

function locateWasm(file: string): string {
  const appPath = app.getAppPath()
  // En la app empaquetada sql.js queda descomprimida en app.asar.unpacked
  // (ver `asarUnpack` en la configuración de electron-builder).
  const unpacked = appPath.replace(/app\.asar$/, 'app.asar.unpacked')
  const candidates = [
    path.join(unpacked, 'node_modules', 'sql.js', 'dist', file),
    path.join(appPath, 'node_modules', 'sql.js', 'dist', file),
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  ]
  const found = candidates.find((c) => fs.existsSync(c))
  if (!found) {
    throw new Error(
      `No se encontró el archivo WASM de SQLite (${file}). Rutas probadas:\n${candidates.join('\n')}`,
    )
  }
  return found
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  season TEXT DEFAULT '',
  location TEXT DEFAULT '',
  date TEXT DEFAULT '',
  modality TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT DEFAULT '',
  code TEXT DEFAULT '',
  logo TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  secondary_color TEXT DEFAULT '#FFFFFF',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  lot TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT DEFAULT '',
  number INTEGER,
  position TEXT DEFAULT '',
  photo TEXT,
  is_starter INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  period TEXT NOT NULL DEFAULT 'first_half',
  venue TEXT DEFAULT '',
  kickoff TEXT DEFAULT '',
  round TEXT DEFAULT '',
  competition TEXT DEFAULT '',
  added_time INTEGER NOT NULL DEFAULT 0,
  timer_running INTEGER NOT NULL DEFAULT 0,
  timer_started_at INTEGER,
  timer_elapsed INTEGER NOT NULL DEFAULT 0,
  home_fouls INTEGER NOT NULL DEFAULT 0,
  away_fouls INTEGER NOT NULL DEFAULT 0,
  home_timeouts INTEGER NOT NULL DEFAULT 0,
  away_timeouts INTEGER NOT NULL DEFAULT 0,
  shot_clock TEXT,
  break_timer TEXT,
  result_confirmed INTEGER NOT NULL DEFAULT 0,
  sets TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_officials (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 1,
  type TEXT DEFAULT '',
  name TEXT DEFAULT '',
  country TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  team_id TEXT,
  player_id TEXT,
  type TEXT NOT NULL,
  minute INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  data TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 5,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  src TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_sequences (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  item_ids TEXT NOT NULL DEFAULT '[]',
  interval_sec INTEGER NOT NULL DEFAULT 5,
  loop INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sponsor_rotations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_ids TEXT NOT NULL DEFAULT '[]',
  interval_sec INTEGER NOT NULL DEFAULT 10,
  active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS standings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shortcuts (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  keys TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS operator_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_acts (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`

export async function initDatabase(): Promise<void> {
  const initSqlJs = initSqlJsModule as unknown as SqlJsFactory
  const SQL = await initSqlJs({ locateFile: locateWasm })

  const dir = app.getPath('userData')
  fs.mkdirSync(dir, { recursive: true })
  dbFile = path.join(dir, 'marcador.db')

  let data: Uint8Array | undefined
  if (fs.existsSync(dbFile)) {
    const buf = fs.readFileSync(dbFile)
    if (buf.length > 0) data = new Uint8Array(buf)
  }

  db = data ? new SQL.Database(data) : new SQL.Database()
  db.run(SCHEMA)
  migrate(db)
  schedulePersist()
}

/** Migraciones incrementales para bases creadas por versiones anteriores. */
function migrate(database: SqlDatabase): void {
  const columnsOf = (table: string): string[] => {
    const columns: string[] = []
    const stmt = database.prepare(`PRAGMA table_info(${table})`)
    try {
      while (stmt.step()) columns.push(String(stmt.getAsObject().name ?? ''))
    } finally {
      stmt.free()
    }
    return columns
  }

  const columns = columnsOf('projects')
  // Fase 2a: propiedades de competencia (código, sesión, cancha).
  if (!columns.includes('comp_props')) {
    database.run('ALTER TABLE projects ADD COLUMN comp_props TEXT')
  }

  // Fase 2b: campo secondary_player_id en match_events.
  const eventColumns = columnsOf('match_events')
  if (!eventColumns.includes('secondary_player_id')) {
    database.run('ALTER TABLE match_events ADD COLUMN secondary_player_id TEXT')
  }

  // Fase 3: equipos con código de país y "Lots" (pantalla Participantes).
  const teamColumns = columnsOf('teams')
  if (!teamColumns.includes('country_code')) {
    database.run('ALTER TABLE teams ADD COLUMN country_code TEXT NOT NULL DEFAULT \'\'')
  }
  if (!teamColumns.includes('lot')) {
    database.run("ALTER TABLE teams ADD COLUMN lot TEXT NOT NULL DEFAULT ''")
  }

  // Fase 3: partidos con estado de básquetbol (faltas, tiempos, shot clock…).
  const matchColumns = columnsOf('matches')
  const matchAdds: [string, string][] = [
    ['game_duration_ms', 'INTEGER'],
    ['timeout_active', 'INTEGER NOT NULL DEFAULT 0'],
    ['home_fouls', "INTEGER NOT NULL DEFAULT 0"],
    ['away_fouls', "INTEGER NOT NULL DEFAULT 0"],
    ['home_timeouts', "INTEGER NOT NULL DEFAULT 0"],
    ['away_timeouts', "INTEGER NOT NULL DEFAULT 0"],
    ['shot_clock', 'TEXT'],
    ['break_timer', 'TEXT'],
    ['result_confirmed', 'INTEGER NOT NULL DEFAULT 0'],
    ['sets', "TEXT NOT NULL DEFAULT '[]'"],
    ['sport_state', 'TEXT'],
    ['possession', 'TEXT'],
    ['player_stats', "TEXT NOT NULL DEFAULT '{}'"],
  ]
  for (const [name, definition] of matchAdds) {
    if (!matchColumns.includes(name)) {
      database.run(`ALTER TABLE matches ADD COLUMN ${name} ${definition}`)
    }
  }
}

export function getDb(): SqlDatabase {
  if (!db) throw new Error('La base de datos aún no está inicializada.')
  return db
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const stmt = getDb().prepare(sql)
  const rows: T[] = []
  try {
    stmt.bind(params)
    while (stmt.step()) rows.push(stmt.getAsObject() as T)
  } finally {
    stmt.free()
  }
  return rows
}

export function get<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  return all<T>(sql, params)[0]
}

/** Ejecuta una escritura y marca la base como sucia (pendiente de guardar). */
export function run(sql: string, params: unknown[] = []): void {
  getDb().run(sql, params)
  schedulePersist()
}

export function schedulePersist(): void {
  dirty = true
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    void persistNow()
  }, 200)
}

export async function persistNow(): Promise<void> {
  if (!db || !dirty) return
  dirty = false
  const bytes = db.export()
  const tmp = `${dbFile}.tmp`
  await fs.promises.writeFile(tmp, bytes)
  await fs.promises.rename(tmp, dbFile)
}

export async function closeDatabase(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  await persistNow()
  if (db) {
    db.close()
    db = null
  }
}

/** Guardado síncrono, usado al salir de la aplicación. */
export function flushSync(): void {
  if (!db || !dirty) return
  dirty = false
  try {
    const bytes = db.export()
    const tmp = `${dbFile}.tmp`
    fs.writeFileSync(tmp, bytes)
    fs.renameSync(tmp, dbFile)
  } catch (err) {
    console.error('[db] Error al guardar la base de datos:', err)
  }
}
