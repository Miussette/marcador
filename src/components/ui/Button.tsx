import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  block?: boolean
  className?: string
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary hover:bg-primary-strong text-white shadow-lg shadow-blue-950/40',
  secondary: 'bg-surface-2 hover:bg-surface-3 text-ink border border-line',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-danger hover:bg-red-600 text-white',
  success: 'bg-success hover:bg-green-600 text-white',
  warning: 'bg-warning hover:bg-amber-600 text-black',
  outline: 'border border-line text-ink hover:bg-surface-2',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-sm gap-2',
  xl: 'h-14 px-7 text-base gap-2.5',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  block = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-colors select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
