import { run } from './db'
import { createMatch, createOfficial, createPlayer, createProject, createTeam, getSetting, setSetting } from './repository'

const EXAMPLES_KEY = 'examples.sports.v1'
const firstNames = ['Tomás', 'Benjamín', 'Matías', 'Vicente', 'Joaquín', 'Lucas', 'Gabriel', 'Diego', 'Nicolás', 'Felipe', 'Sebastián', 'Ignacio', 'Martín', 'Cristóbal', 'Francisco', 'Pablo', 'Andrés', 'Daniel']
const surnames = ['Rojas', 'Muñoz', 'Soto', 'Pérez', 'Silva', 'Contreras', 'González', 'Torres', 'Vargas', 'Castro', 'Díaz', 'Reyes', 'Morales', 'Fuentes', 'Herrera', 'Navarro', 'Medina', 'Araya']
const examples = [
  { sport: 'football', label: 'Fútbol', venue: 'Estadio de ejemplo', starters: 11, positions: ['Portero', 'Defensa', 'Defensa', 'Defensa', 'Defensa', 'Mediocampista', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero', 'Delantero', 'Portero', 'Defensa', 'Defensa', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero'] },
  { sport: 'futsal', label: 'Futsal', venue: 'Gimnasio de ejemplo', starters: 5, positions: ['Portero', 'Cierre', 'Ala', 'Ala', 'Pívot', 'Portero', 'Cierre', 'Cierre', 'Ala', 'Ala', 'Ala', 'Pívot', 'Pívot', 'Ala'] },
  { sport: 'basketball', label: 'Básquet', venue: 'Gimnasio de ejemplo', starters: 5, positions: ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot', 'Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot', 'Escolta', 'Alero'] },
] as const

function badge(initials: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180"><path d="M10 10H150V100Q150 145 80 170Q10 145 10 100Z" fill="${color}" stroke="#ffffff" stroke-width="6"/><text x="80" y="101" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="44" font-weight="bold">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Ejemplos editables, instalados una sola vez sin alterar proyectos existentes. */
export function ensureExampleProjects(date: string): void {
  if (getSetting(EXAMPLES_KEY) === 'installed') return
  run('BEGIN TRANSACTION')
  try {
    for (const example of examples) {
      const project = createProject({ name: `Ejemplo · ${example.label}`, sport: example.sport, season: date.slice(0, 4), date, modality: 'friendly', location: example.venue, compProps: { title: `Amistoso de ${example.label}`, code: example.sport === 'basketball' ? 'BAS' : example.sport === 'futsal' ? 'FUT' : 'FUB', session: '01', court: '1', workingMode: 'standalone', uploadResults: false, uploadPlayByPlay: false } })
      const teams = [
        { name: 'Halcones del Norte', shortName: 'HAL', color: '#2563EB', city: 'Santiago' },
        { name: 'Cóndores del Sur', shortName: 'CON', color: '#DC2626', city: 'Concepción' },
      ].map((sample, side) => {
        const team = createTeam({ projectId: project.id, name: sample.name, shortName: sample.shortName, code: sample.shortName, logo: badge(sample.shortName, sample.color), primaryColor: sample.color, secondaryColor: '#FFFFFF', city: sample.city, country: 'Chile', countryCode: 'CHL', lot: String(side + 1) })
        example.positions.forEach((position, index) => createPlayer({ teamId: team.id, firstName: firstNames[(index + side * 5) % firstNames.length], lastName: surnames[(index + side * 7) % surnames.length], number: example.sport === 'basketball' ? index + 4 : index + 1, position, photo: null, isStarter: index < example.starters }))
        return team
      })
      const match = createMatch({ projectId: project.id, homeTeamId: teams[0].id, awayTeamId: teams[1].id, venue: example.venue, kickoff: `${date}T19:00`, round: 'Partido de ejemplo', competition: `Amistoso de ${example.label}` })
      const types = example.sport === 'basketball' ? ['referee', 'referee', 'scorer', 'timer'] : example.sport === 'futsal' ? ['referee', 'referee', 'timer'] : ['referee', 'referee', 'referee']
      types.forEach((type, index) => createOfficial({ matchId: match.id, order: index + 1, type, name: ['Alex Campos', 'Camila Vidal', 'José Molina', 'Valentina León'][index], country: 'Chile', grade: 'local' }))
    }
    setSetting(EXAMPLES_KEY, 'installed')
    run('COMMIT')
  } catch (error) { run('ROLLBACK'); throw error }
}
