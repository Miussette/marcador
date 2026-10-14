import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const CONTROL_CLASS =
  'w-full rounded-lg bg-app border border-line px-3 text-sm text-ink placeholder:text-muted/60 ' +
  'transition-colors focus:border-primary focus:outline-none'

interface FieldProps {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="label-muted mb-1.5 flex items-center gap-1">
        {label}
        {required ? <span className="text-danger">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return <input className={cn(CONTROL_CLASS, 'h-10', invalid && 'border-danger', className)} {...rest} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(CONTROL_CLASS, 'min-h-24 py-2 leading-relaxed', invalid && 'border-danger', className)}
      {...rest}
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <select className={cn(CONTROL_CLASS, 'h-10 pr-8', invalid && 'border-danger', className)} {...rest}>
      {children}
    </select>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <span className="label-muted mb-1.5 block">{label}</span>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-app px-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-8 cursor-pointer rounded"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent font-mono text-xs uppercase text-muted focus:outline-none"
        />
      </div>
    </div>
  )
}
