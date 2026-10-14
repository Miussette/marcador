import { cn } from '@/utils/cn'
import { contrastText, initials } from '@/utils/format'
import type { DisplayTeamInfo, Team } from '@/types'

type TeamLike = Pick<
  Team | DisplayTeamInfo,
  'name' | 'shortName' | 'logo' | 'primaryColor' | 'secondaryColor'
>

interface TeamBadgeProps {
  team: TeamLike | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
  xl: 'h-28 w-28 text-3xl',
}

export function TeamBadge({ team, size = 'md', className }: TeamBadgeProps) {
  if (!team) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-surface-2 text-muted', SIZES[size], className)}>
        ?
      </div>
    )
  }

  if (team.logo) {
    return (
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-xl border border-line bg-white/95 p-1.5',
          SIZES[size],
          className,
        )}
        style={{ backgroundColor: team.secondaryColor || '#FFFFFF' }}
      >
        <img src={team.logo} alt={team.name} className="h-full w-full object-contain" />
      </div>
    )
  }

  const background = team.primaryColor || '#2563EB'
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl font-black tracking-tight',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: background, color: contrastText(background) }}
      title={team.name}
    >
      {team.shortName ? team.shortName.trim().slice(0, 3).toUpperCase() : initials(team.name)}
    </div>
  )
}
