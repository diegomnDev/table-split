import { formatAmount } from '@/core/money'
import type { Bill, SplitResult } from '@/core/types'

/**
 * Renders the result as plain text meant to be pasted into a chat.
 *
 * Deliberately plain: no emoji, no box drawing, no separators. A wall of
 * decoration reads as spam in a group chat and survives copy-paste badly.
 */
export function billSummary(bill: Bill, result: SplitResult): string {
  const nameOf = (dinerId: string) => bill.diners.find((diner) => diner.id === dinerId)?.name ?? '?'

  const lines: string[] = [`${bill.title} — ${formatAmount(result.billTotal)}`, '']

  for (const share of result.perDiner) {
    lines.push(`${nameOf(share.dinerId)}: ${formatAmount(share.total)}`)
  }

  if (bill.extras.length > 0) {
    lines.push('')
    for (const extra of bill.extras) {
      lines.push(`${extra.label}: ${formatAmount(extra.amount)}`)
    }
  }

  if (result.unassignedTotal !== 0) {
    lines.push('')
    lines.push(`Sin asignar: ${formatAmount(result.unassignedTotal)}`)
  }

  if (result.debts.length > 0) {
    lines.push('')
    for (const debt of result.debts) {
      lines.push(`${nameOf(debt.from)} debe ${formatAmount(debt.amount)} a ${nameOf(debt.to)}`)
    }
  }

  return lines.join('\n')
}
