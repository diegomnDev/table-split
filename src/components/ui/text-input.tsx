import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function TextInput({ invalid = false, className = '', ...props }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`min-h-11 w-full bg-transparent px-2 text-ticket-base text-ink placeholder:text-ink-faint border-b border-rule outline-none focus:border-ink aria-[invalid]:border-accent ${className}`}
      {...props}
    />
  )
}
