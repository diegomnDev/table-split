import type { Cents } from '@/core/money'

export type Diner = {
  id: string
  name: string
  /** Creation order. Used as the deterministic tie-break when rounding. */
  order: number
}

export type Assignment =
  | { mode: 'equal'; dinerIds: string[] }
  | { mode: 'units'; units: Record<string, number> }

export type Item = {
  id: string
  name: string
  unitPrice: Cents
  quantity: number
  assignment: Assignment
}

/** Positive for a tip or cover charge, negative for a discount. */
export type Extra = {
  id: string
  label: string
  amount: Cents
}

/** Money actually put in by a diner. Several diners can pay, and one diner
 * can pay more than once. */
export type Payment = {
  dinerId: string
  amount: Cents
}

export type Bill = {
  id: string
  title: string
  createdAt: number
  diners: Diner[]
  items: Item[]
  extras: Extra[]
  /** Empty means nobody has fronted money yet: each diner pays their own share. */
  payments: Payment[]
}

export type Warning =
  | { kind: 'unassigned-item'; itemId: string }
  | { kind: 'units-mismatch'; itemId: string; assigned: number; expected: number }
  | { kind: 'negative-share'; dinerId: string; amount: Cents }
  | { kind: 'no-diners' }
  | { kind: 'payments-mismatch'; paid: Cents; expected: Cents }

export type DinerSplit = {
  dinerId: string
  itemsTotal: Cents
  extrasShare: Cents
  total: Cents
}

export type Debt = {
  from: string
  to: string
  amount: Cents
}

export type SplitResult = {
  perDiner: DinerSplit[]
  /** Every item plus every extra: what the printed ticket says. */
  billTotal: Cents
  /** Money that belongs to no diner. Shown, never hidden or redistributed. */
  unassignedTotal: Cents
  /** Sum of every recorded payment. Compare against billTotal. */
  paidTotal: Cents
  debts: Debt[]
  warnings: Warning[]
}
