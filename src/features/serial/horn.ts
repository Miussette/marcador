export const HORN_SETTING_KEY = 'horn.config'
export interface HornConfig {
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: 'none' | 'even' | 'odd'
  flowControl: 'none' | 'hardware'
  command: string
  ending: 'none' | 'cr' | 'lf' | 'crlf'
}
export const DEFAULT_HORN: HornConfig = { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', command: '#T', ending: 'none' }
export function validateHorn(config: HornConfig): void {
  if (!Number.isInteger(config.baudRate) || config.baudRate < 1 || config.baudRate > 4000000) throw new Error('Baudios inválidos.')
  if (![7, 8].includes(config.dataBits) || ![1, 2].includes(config.stopBits) || !['none', 'even', 'odd'].includes(config.parity) || !['none', 'hardware'].includes(config.flowControl) || !['none', 'cr', 'lf', 'crlf'].includes(config.ending)) throw new Error('Configuración serial inválida.')
  if (!config.command || config.command.length > 1024 || /[^\x00-\x7f]/.test(config.command)) throw new Error('El comando debe contener entre 1 y 1024 caracteres ASCII.')
}
export function hornBytes(config: HornConfig): Uint8Array {
  validateHorn(config)
  const endings = { none: '', cr: '\r', lf: '\n', crlf: '\r\n' }
  return new TextEncoder().encode(config.command + endings[config.ending])
}
export function parseHorn(raw: string | null): HornConfig {
  try { const config = { ...DEFAULT_HORN, ...JSON.parse(raw ?? '{}') }; validateHorn(config); return config } catch { return { ...DEFAULT_HORN } }
}
