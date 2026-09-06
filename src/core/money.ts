/** An integer number of euro cents. Money is never a float in this codebase. */
export type Cents = number

const AMOUNT_PATTERN = /^-?\d+(?:[.,]\d{1,2})?$/

/**
 * Parses user input into cents. Accepts both `12,50` and `12.50`, tolerates
 * spaces and a euro sign, and returns null for anything else rather than
 * silently coercing bad input to zero.
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[\s€]/g, '')
  if (!AMOUNT_PATTERN.test(cleaned)) return null

  const negative = cleaned.startsWith('-')
  const digits = negative ? cleaned.slice(1) : cleaned
  const [whole = '0', fraction = ''] = digits.split(/[.,]/)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

  return negative ? -cents : cents
}

/**
 * Formats cents as Spanish currency. Built by string surgery on integers
 * rather than dividing by 100, so no float ever touches a displayed amount.
 */
export function formatAmount(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const whole = Math.trunc(absolute / 100).toLocaleString('es-ES')
  const fraction = String(absolute % 100).padStart(2, '0')

  return `${sign}${whole},${fraction} €`
}

/**
 * Splits `amount` proportionally to `weights` using the largest remainder
 * method, so the parts always sum back to `amount` exactly. Leftover cents go
 * to the largest fractional remainders; ties break by lowest index, and
 * callers pass diners in `order`, which makes the outcome deterministic.
 */
export function distribute(amount: Cents, weights: number[]): Cents[] {
  if (weights.length === 0) return []

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) return weights.map(() => 0)

  const sign = amount < 0 ? -1 : 1
  const absolute = Math.abs(amount)

  const exact = weights.map((weight) => (absolute * weight) / totalWeight)
  const parts = exact.map((value) => Math.floor(value))
  const distributed = parts.reduce((sum, part) => sum + part, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (let given = 0; given < absolute - distributed; given += 1) {
    const target = byRemainder[given]
    if (!target) break
    parts[target.index] = (parts[target.index] ?? 0) + 1
  }

  return parts.map((part) => part * sign)
}
