/**
 * Declaración de tipos para sql.js (el paquete no incluye .d.ts).
 * Se usa un tipo laxo aquí y se afina en electron/db.ts con interfaces propias.
 */
declare module 'sql.js' {
  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<unknown>
  export default initSqlJs
}
