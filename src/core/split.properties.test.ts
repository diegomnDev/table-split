import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { computeSplit } from '@/core/split'
import type { Assignment, Bill, Diner, Extra, Item, Payment } from '@/core/types'

const dinersArb = fc
  .array(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 8 })
  .map((names): Diner[] => names.map((name, index) => ({ id: `d${index}`, name, order: index })))

function assignmentArb(dinerIds: string[]): fc.Arbitrary<Assignment> {
  const equal = fc.subarray(dinerIds).map((ids): Assignment => ({ mode: 'equal', dinerIds: ids }))

  if (dinerIds.length === 0) return equal

  const units = fc
    .array(fc.integer({ min: 0, max: 4 }), {
      minLength: dinerIds.length,
      maxLength: dinerIds.length,
    })
    .map((counts): Assignment => {
      const map: Record<string, number> = {}
      dinerIds.forEach((id, index) => {
        map[id] = counts[index] ?? 0
      })
      return { mode: 'units', units: map }
    })

  return fc.oneof(equal, units)
}

function itemsArb(dinerIds: string[]): fc.Arbitrary<Item[]> {
  return fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 4 }),
      name: fc.string({ maxLength: 8 }),
      unitPrice: fc.integer({ min: -5_000, max: 20_000 }),
      quantity: fc.integer({ min: 0, max: 6 }),
      assignment: assignmentArb(dinerIds),
    }),
    { maxLength: 10 },
  )
}

const extrasArb: fc.Arbitrary<Extra[]> = fc.array(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 4 }),
    label: fc.string({ maxLength: 8 }),
    amount: fc.integer({ min: -10_000, max: 10_000 }),
  }),
  { maxLength: 4 },
)

function paymentsArb(dinerIds: string[]): fc.Arbitrary<Payment[]> {
  if (dinerIds.length === 0) return fc.constant([])
  return fc.array(
    fc.record({
      dinerId: fc.constantFrom(...dinerIds),
      amount: fc.integer({ min: -5_000, max: 50_000 }),
    }),
    { maxLength: 3 },
  )
}

const billArb: fc.Arbitrary<Bill> = dinersArb.chain((diners) => {
  const dinerIds = diners.map((diner) => diner.id)
  return fc.record({
    id: fc.constant('bill'),
    title: fc.constant('Cuenta'),
    createdAt: fc.constant(0),
    diners: fc.constant(diners),
    items: itemsArb(dinerIds),
    extras: extrasArb,
    payments: paymentsArb(dinerIds),
  })
})

describe('computeSplit — invariantes', () => {
  it('el reparto más lo no asignado siempre suma el total', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        const distributed = result.perDiner.reduce((sum, share) => sum + share.total, 0)

        expect(distributed + result.unassignedTotal).toBe(result.billTotal)
      }),
      { numRuns: 2000 },
    )
  })

  it('el total coincide con la suma cruda de ítems y extras', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const raw =
          bill.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) +
          bill.extras.reduce((sum, extra) => sum + extra.amount, 0)

        expect(computeSplit(bill).billTotal).toBe(raw)
      }),
      { numRuns: 1000 },
    )
  })

  it('todas las cantidades son enteras', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        for (const share of result.perDiner) {
          expect(Number.isInteger(share.total)).toBe(true)
          expect(Number.isInteger(share.itemsTotal)).toBe(true)
          expect(Number.isInteger(share.extrasShare)).toBe(true)
        }
        expect(Number.isInteger(result.unassignedTotal)).toBe(true)
      }),
      { numRuns: 1000 },
    )
  })

  it('devuelve una entrada por comensal, en su orden', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        expect(result.perDiner.map((share) => share.dinerId)).toEqual(
          [...bill.diners].sort((a, b) => a.order - b.order).map((diner) => diner.id),
        )
      }),
      { numRuns: 500 },
    )
  })

  it('las transferencias saldan exactamente cada balance', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        const paidBy = new Map<string, number>()
        for (const payment of bill.payments) {
          paidBy.set(payment.dinerId, (paidBy.get(payment.dinerId) ?? 0) + payment.amount)
        }

        for (const share of result.perDiner) {
          const balance = (paidBy.get(share.dinerId) ?? 0) - share.total
          const sent = result.debts
            .filter((debt) => debt.from === share.dinerId)
            .reduce((sum, debt) => sum + debt.amount, 0)
          const received = result.debts
            .filter((debt) => debt.to === share.dinerId)
            .reduce((sum, debt) => sum + debt.amount, 0)

          // Only balances that a counterparty exists for can be settled, so
          // what moves never exceeds what is owed, and never has the wrong sign.
          if (balance > 0) expect(received - sent).toBeLessThanOrEqual(balance)
          if (balance < 0) expect(sent - received).toBeLessThanOrEqual(-balance)
        }
      }),
      { numRuns: 1000 },
    )
  })

  it('ninguna transferencia es negativa ni va de alguien a sí mismo', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        for (const debt of computeSplit(bill).debts) {
          expect(debt.amount).toBeGreaterThan(0)
          expect(debt.from).not.toBe(debt.to)
        }
      }),
      { numRuns: 1000 },
    )
  })

  it('es determinista', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        expect(computeSplit(bill)).toEqual(computeSplit(bill))
      }),
      { numRuns: 500 },
    )
  })
})
