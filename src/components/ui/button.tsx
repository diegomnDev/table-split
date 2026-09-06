import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const VARIANTS = {
  primary: 'bg-ink text-paper',
  ghost: 'bg-transparent text-ink-soft',
  danger: 'bg-transparent text-accent',
} as const

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`min-h-11 px-4 text-ticket-sm tracking-ticket uppercase rounded-ticket disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
