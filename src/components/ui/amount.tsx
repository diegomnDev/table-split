import { type Cents, formatAmount } from '@/core/money'

/** Renders money. Credits are visually distinct from charges, not just signed. */
export function Amount({ cents, className = '' }: { cents: Cents; className?: string }) {
  const tone = cents < 0 ? 'text-credit' : 'text-ink'
  return <span className={`tabular ${tone} ${className}`}>{formatAmount(cents)}</span>
}
