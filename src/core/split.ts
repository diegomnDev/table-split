import { type Cents, distribute } from '@/core/money'
import type { Bill, Debt, DinerSplit, Item, SplitResult, Warning } from '@/core/types'

/** Weight per diner for one item, in the diner order of `bill.diners`. */
function weightsFor(item: Item, dinerIds: string[]): number[] {
  if (item.assignment.mode === 'equal') {
    const selected = new Set(item.assignment.dinerIds)
    return dinerIds.map((id) => (selected.has(id) ? 1 : 0))
  }

  const { units } = item.assignment
  return dinerIds.map((id) => Math.max(0, units[id] ?? 0))
}

function assignedUnits(item: Item): number {
  if (item.assignment.mode !== 'units') return item.quantity
  return Object.values(item.assignment.units).reduce((sum, units) => sum + Math.max(0, units), 0)
}

/**
 * Turns a bill into per-diner amounts.
 *
 * Guarantees, for every possible input:
 *   sum(perDiner.total) + unassignedTotal === billTotal
 *
 * Money that belongs to nobody lands in `unassignedTotal` and raises a
 * warning. It is never quietly spread over the diners.
 */
export function computeSplit(bill: Bill): SplitResult {
  const diners = [...bill.diners].sort((a, b) => a.order - b.order)
  const dinerIds = diners.map((diner) => diner.id)
  const warnings: Warning[] = []

  const itemsTotals: Cents[] = dinerIds.map(() => 0)
  const extrasShares: Cents[] = dinerIds.map(() => 0)
  let billTotal = 0
  let unassignedTotal = 0

  if (diners.length === 0) warnings.push({ kind: 'no-diners' })

  for (const item of bill.items) {
    const amount = item.unitPrice * item.quantity
    billTotal += amount

    if (item.assignment.mode === 'units') {
      const assigned = assignedUnits(item)
      if (assigned !== item.quantity) {
        warnings.push({
          kind: 'units-mismatch',
          itemId: item.id,
          assigned,
          expected: item.quantity,
        })
      }
    }

    const weights = weightsFor(item, dinerIds)
    const hasOwner = weights.some((weight) => weight > 0)

    if (!hasOwner) {
      unassignedTotal += amount
      warnings.push({ kind: 'unassigned-item', itemId: item.id })
      continue
    }

    const parts = distribute(amount, weights)
    parts.forEach((part, index) => {
      itemsTotals[index] = (itemsTotals[index] ?? 0) + part
    })
  }

  // Each extra is split separately rather than as a lump sum, so a tip and a
  // discount each round on their own and stay individually explainable.
  const equalWeights = dinerIds.map(() => 1)
  for (const extra of bill.extras) {
    billTotal += extra.amount

    if (diners.length === 0) {
      unassignedTotal += extra.amount
      continue
    }

    const parts = distribute(extra.amount, equalWeights)
    parts.forEach((part, index) => {
      extrasShares[index] = (extrasShares[index] ?? 0) + part
    })
  }

  const perDiner: DinerSplit[] = diners.map((diner, index) => {
    const itemsTotal = itemsTotals[index] ?? 0
    const extrasShare = extrasShares[index] ?? 0
    return { dinerId: diner.id, itemsTotal, extrasShare, total: itemsTotal + extrasShare }
  })

  for (const share of perDiner) {
    if (share.total < 0) {
      warnings.push({ kind: 'negative-share', dinerId: share.dinerId, amount: share.total })
    }
  }

  const debts: Debt[] = []
  if (bill.payerId !== null) {
    const payerId = bill.payerId
    for (const share of perDiner) {
      if (share.dinerId === payerId || share.total === 0) continue
      debts.push(
        share.total > 0
          ? { from: share.dinerId, to: payerId, amount: share.total }
          : { from: payerId, to: share.dinerId, amount: -share.total },
      )
    }
  }

  return { perDiner, billTotal, unassignedTotal, debts, warnings }
}
