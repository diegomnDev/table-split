import type { Cents } from '@/core/money'
import type { Debt, DinerSplit, Payment } from '@/core/types'

type Balance = {
  dinerId: string
  /** Positive: this diner is owed money. Negative: this diner owes money. */
  amount: Cents
}

/**
 * Turns per-diner shares and actual payments into a short list of transfers.
 *
 * Greedy largest-creditor / largest-debtor matching in diner order. It is not
 * guaranteed to be the theoretical minimum number of transfers — that problem
 * is NP-hard — but it is optimal for the shapes a dinner produces, one or two
 * payers, and it always settles every balance exactly.
 *
 * Input order decides ties, so the output is deterministic.
 */
export function settle(perDiner: DinerSplit[], payments: Payment[]): Debt[] {
  if (payments.length === 0) return []

  const paid = new Map<string, Cents>()
  for (const payment of payments) {
    paid.set(payment.dinerId, (paid.get(payment.dinerId) ?? 0) + payment.amount)
  }

  const balances: Balance[] = perDiner.map((share) => ({
    dinerId: share.dinerId,
    amount: (paid.get(share.dinerId) ?? 0) - share.total,
  }))

  const creditors = balances.filter((balance) => balance.amount > 0).map((b) => ({ ...b }))
  const debtors = balances.filter((balance) => balance.amount < 0).map((b) => ({ ...b }))

  const debts: Debt[] = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    if (!creditor || !debtor) break

    const amount = Math.min(creditor.amount, -debtor.amount)
    if (amount > 0) {
      debts.push({ from: debtor.dinerId, to: creditor.dinerId, amount })
      creditor.amount -= amount
      debtor.amount += amount
    }

    if (creditor.amount === 0) creditorIndex += 1
    if (debtor.amount === 0) debtorIndex += 1
  }

  return debts
}
