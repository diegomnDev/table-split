import { describe, expect, it } from 'vitest'
import { computeSplit } from '@/core/split'
import { makeBill, makeDiner, makeExtra, makeItem } from '@/core/test-factories'
import type { SplitResult } from '@/core/types'

const ana = makeDiner('ana', 0)
const luis = makeDiner('luis', 1)
const mar = makeDiner('mar', 2)

function totalOf(dinerId: string, result: SplitResult) {
  return result.perDiner.find((d) => d.dinerId === dinerId)?.total ?? 0
}

describe('computeSplit — ítems', () => {
  it('carga un ítem individual a su comensal', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 2450, { mode: 'equal', dinerIds: ['ana'] })],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(2450)
    expect(totalOf('luis', result)).toBe(0)
    expect(result.billTotal).toBe(2450)
    expect(result.unassignedTotal).toBe(0)
  })

  it('reparte a partes iguales entre los marcados', () => {
    const bill = makeBill({
      diners: [ana, luis, mar],
      items: [makeItem('i1', 1980, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(990)
    expect(totalOf('luis', result)).toBe(990)
    expect(totalOf('mar', result)).toBe(0)
  })

  it('multiplica por la cantidad', () => {
    const bill = makeBill({
      diners: [ana],
      items: [makeItem('i1', 350, { mode: 'equal', dinerIds: ['ana'] }, 3)],
    })

    expect(computeSplit(bill).billTotal).toBe(1050)
  })

  it('reparte por unidades', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 350, { mode: 'units', units: { ana: 2, luis: 1 } }, 3)],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(700)
    expect(totalOf('luis', result)).toBe(350)
  })

  it('ignora a comensales que ya no existen en la cuenta', () => {
    const bill = makeBill({
      diners: [ana],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'fantasma'] })],
    })

    expect(totalOf('ana', computeSplit(bill))).toBe(1000)
  })
})

describe('computeSplit — extras', () => {
  it('reparte la propina a partes iguales entre todos, coman o no', () => {
    const bill = makeBill({
      diners: [ana, luis, mar],
      items: [makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana'] })],
      extras: [makeExtra('e1', 1000, 'Propina')],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(3334)
    expect(totalOf('luis', result)).toBe(333)
    expect(totalOf('mar', result)).toBe(333)
    expect(result.billTotal).toBe(4000)
  })

  it('trata el descuento como un extra negativo', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 2000, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
      extras: [makeExtra('e1', -400, 'Cupón')],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(800)
    expect(totalOf('luis', result)).toBe(800)
    expect(result.billTotal).toBe(1600)
  })
})

describe('computeSplit — avisos', () => {
  it('no reparte un ítem sin asignar y lo declara', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [
        makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] }),
        makeItem('i2', 600, { mode: 'equal', dinerIds: [] }),
      ],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(1000)
    expect(totalOf('luis', result)).toBe(0)
    expect(result.unassignedTotal).toBe(600)
    expect(result.billTotal).toBe(1600)
    expect(result.warnings).toContainEqual({ kind: 'unassigned-item', itemId: 'i2' })
  })

  it('avisa cuando las unidades no suman la cantidad', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 500, { mode: 'units', units: { ana: 1 } }, 3)],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(1500)
    expect(result.warnings).toContainEqual({
      kind: 'units-mismatch',
      itemId: 'i1',
      assigned: 1,
      expected: 3,
    })
  })

  it('permite saldo negativo y lo avisa', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['luis'] })],
      extras: [makeExtra('e1', -1600, 'Cupón')],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(-800)
    expect(result.warnings).toContainEqual({ kind: 'negative-share', dinerId: 'ana', amount: -800 })
  })

  it('sin comensales, todo queda sin asignar', () => {
    const bill = makeBill({
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })],
      extras: [makeExtra('e1', 200)],
    })
    const result = computeSplit(bill)

    expect(result.perDiner).toEqual([])
    expect(result.billTotal).toBe(1200)
    expect(result.unassignedTotal).toBe(1200)
    expect(result.warnings).toContainEqual({ kind: 'no-diners' })
  })
})

describe('computeSplit — deudas', () => {
  it('sin pagador no hay deudas', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
    })

    expect(computeSplit(bill).debts).toEqual([])
  })

  it('con pagador, los demás le deben su parte', () => {
    const bill = makeBill({
      diners: [ana, luis, mar],
      items: [makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana', 'luis', 'mar'] })],
      payerId: 'ana',
    })

    expect(computeSplit(bill).debts).toEqual([
      { from: 'luis', to: 'ana', amount: 1000 },
      { from: 'mar', to: 'ana', amount: 1000 },
    ])
  })

  it('omite a quien no debe nada', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] })],
      payerId: 'ana',
    })

    expect(computeSplit(bill).debts).toEqual([])
  })

  it('un saldo negativo se convierte en deuda del pagador', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['luis'] })],
      extras: [makeExtra('e1', -1600, 'Cupón')],
      payerId: 'luis',
    })

    expect(computeSplit(bill).debts).toEqual([{ from: 'luis', to: 'ana', amount: 800 }])
  })
})
