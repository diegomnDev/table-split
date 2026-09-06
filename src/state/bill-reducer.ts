import { nanoid } from 'nanoid'
import type { Cents } from '@/core/money'
import type { Assignment, Bill, Item } from '@/core/types'

export type BillAction =
  | { type: 'SET_TITLE'; title: string }
  | { type: 'ADD_DINER'; name: string }
  | { type: 'RENAME_DINER'; dinerId: string; name: string }
  | { type: 'REMOVE_DINER'; dinerId: string }
  | { type: 'ADD_ITEM'; name: string; unitPrice: Cents; quantity: number }
  | { type: 'UPDATE_ITEM'; itemId: string; name: string; unitPrice: Cents; quantity: number }
  | { type: 'SET_ASSIGNMENT'; itemId: string; assignment: Assignment }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'ADD_EXTRA'; label: string; amount: Cents }
  | { type: 'REMOVE_EXTRA'; extraId: string }
  | { type: 'SET_PAYMENT'; dinerId: string; amount: Cents }
  | { type: 'CLEAR_PAYMENTS' }

export function createBill(title: string): Bill {
  return {
    id: nanoid(),
    title,
    createdAt: Date.now(),
    diners: [],
    items: [],
    extras: [],
    payments: [],
  }
}

/** Drops a departed diner from an item's assignment, whichever mode it uses. */
function withoutDiner(item: Item, dinerId: string): Item {
  if (item.assignment.mode === 'equal') {
    return {
      ...item,
      assignment: {
        mode: 'equal',
        dinerIds: item.assignment.dinerIds.filter((id) => id !== dinerId),
      },
    }
  }

  const units = { ...item.assignment.units }
  delete units[dinerId]
  return { ...item, assignment: { mode: 'units', units } }
}

export function billReducer(bill: Bill, action: BillAction): Bill {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...bill, title: action.title }

    case 'ADD_DINER': {
      const name = action.name.trim()
      if (name === '') return bill
      const order = bill.diners.reduce((max, diner) => Math.max(max, diner.order + 1), 0)
      return { ...bill, diners: [...bill.diners, { id: nanoid(), name, order }] }
    }

    case 'RENAME_DINER': {
      const name = action.name.trim()
      if (name === '') return bill
      return {
        ...bill,
        diners: bill.diners.map((diner) =>
          diner.id === action.dinerId ? { ...diner, name } : diner,
        ),
      }
    }

    case 'REMOVE_DINER':
      return {
        ...bill,
        diners: bill.diners.filter((diner) => diner.id !== action.dinerId),
        items: bill.items.map((item) => withoutDiner(item, action.dinerId)),
        payments: bill.payments.filter((payment) => payment.dinerId !== action.dinerId),
      }

    case 'ADD_ITEM': {
      const name = action.name.trim()
      if (name === '') return bill
      return {
        ...bill,
        items: [
          ...bill.items,
          {
            id: nanoid(),
            name,
            unitPrice: action.unitPrice,
            quantity: action.quantity,
            assignment: { mode: 'equal', dinerIds: [] },
          },
        ],
      }
    }

    case 'UPDATE_ITEM':
      return {
        ...bill,
        items: bill.items.map((item) =>
          item.id === action.itemId
            ? {
                ...item,
                name: action.name.trim() === '' ? item.name : action.name.trim(),
                unitPrice: action.unitPrice,
                quantity: action.quantity,
              }
            : item,
        ),
      }

    case 'SET_ASSIGNMENT':
      return {
        ...bill,
        items: bill.items.map((item) =>
          item.id === action.itemId ? { ...item, assignment: action.assignment } : item,
        ),
      }

    case 'REMOVE_ITEM':
      return { ...bill, items: bill.items.filter((item) => item.id !== action.itemId) }

    case 'ADD_EXTRA': {
      const label = action.label.trim()
      if (label === '') return bill
      return { ...bill, extras: [...bill.extras, { id: nanoid(), label, amount: action.amount }] }
    }

    case 'REMOVE_EXTRA':
      return { ...bill, extras: bill.extras.filter((extra) => extra.id !== action.extraId) }

    case 'SET_PAYMENT': {
      const others = bill.payments.filter((payment) => payment.dinerId !== action.dinerId)
      if (action.amount === 0) return { ...bill, payments: others }
      return { ...bill, payments: [...others, { dinerId: action.dinerId, amount: action.amount }] }
    }

    case 'CLEAR_PAYMENTS':
      return { ...bill, payments: [] }
  }
}
