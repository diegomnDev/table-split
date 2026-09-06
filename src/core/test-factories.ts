import type { Assignment, Bill, Diner, Extra, Item } from '@/core/types'

export function makeDiner(id: string, order: number, name = id): Diner {
  return { id, name, order }
}

export function makeItem(
  id: string,
  unitPrice: number,
  assignment: Assignment,
  quantity = 1,
  name = id,
): Item {
  return { id, name, unitPrice, quantity, assignment }
}

export function makeExtra(id: string, amount: number, label = id): Extra {
  return { id, label, amount }
}

export function makeBill(partial: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    title: 'Cena',
    createdAt: 0,
    diners: [],
    items: [],
    extras: [],
    payments: [],
    ...partial,
  }
}
