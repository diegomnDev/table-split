import { describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import { billReducer, createBill } from '@/state/bill-reducer'

describe('createBill', () => {
  it('crea una cuenta vacía con id y fecha', () => {
    const bill = createBill('Casa Paco')

    expect(bill.title).toBe('Casa Paco')
    expect(bill.id).not.toBe('')
    expect(bill.createdAt).toBeGreaterThan(0)
    expect(bill.diners).toEqual([])
    expect(bill.payerId).toBeNull()
  })
})

describe('billReducer', () => {
  it('añade un comensal con el siguiente orden', () => {
    const withOne = billReducer(makeBill(), { type: 'ADD_DINER', name: 'Ana' })
    const withTwo = billReducer(withOne, { type: 'ADD_DINER', name: 'Luis' })

    expect(withTwo.diners.map((d) => d.name)).toEqual(['Ana', 'Luis'])
    expect(withTwo.diners.map((d) => d.order)).toEqual([0, 1])
  })

  it('ignora un nombre vacío', () => {
    expect(billReducer(makeBill(), { type: 'ADD_DINER', name: '   ' }).diners).toEqual([])
  })

  it('renombra un comensal', () => {
    const bill = makeBill({ diners: [makeDiner('ana', 0, 'Ana')] })
    const next = billReducer(bill, { type: 'RENAME_DINER', dinerId: 'ana', name: 'Anita' })

    expect(next.diners[0]?.name).toBe('Anita')
  })

  it('al borrar un comensal lo quita de las asignaciones', () => {
    const bill = makeBill({
      diners: [makeDiner('ana', 0), makeDiner('luis', 1)],
      items: [
        makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] }),
        makeItem('i2', 500, { mode: 'units', units: { ana: 1, luis: 2 } }, 3),
      ],
      payerId: 'ana',
    })
    const next = billReducer(bill, { type: 'REMOVE_DINER', dinerId: 'ana' })

    expect(next.diners.map((d) => d.id)).toEqual(['luis'])
    expect(next.items[0]?.assignment).toEqual({ mode: 'equal', dinerIds: ['luis'] })
    expect(next.items[1]?.assignment).toEqual({ mode: 'units', units: { luis: 2 } })
    expect(next.payerId).toBeNull()
  })

  it('añade un ítem sin asignar', () => {
    const next = billReducer(makeBill(), {
      type: 'ADD_ITEM',
      name: 'Pulpo',
      unitPrice: 1980,
      quantity: 1,
    })

    expect(next.items[0]?.name).toBe('Pulpo')
    expect(next.items[0]?.assignment).toEqual({ mode: 'equal', dinerIds: [] })
  })

  it('cambia la asignación de un ítem', () => {
    const bill = makeBill({
      diners: [makeDiner('ana', 0)],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })],
    })
    const next = billReducer(bill, {
      type: 'SET_ASSIGNMENT',
      itemId: 'i1',
      assignment: { mode: 'equal', dinerIds: ['ana'] },
    })

    expect(next.items[0]?.assignment).toEqual({ mode: 'equal', dinerIds: ['ana'] })
  })

  it('borra un ítem', () => {
    const bill = makeBill({ items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })] })

    expect(billReducer(bill, { type: 'REMOVE_ITEM', itemId: 'i1' }).items).toEqual([])
  })

  it('añade y borra extras', () => {
    const withExtra = billReducer(makeBill(), {
      type: 'ADD_EXTRA',
      label: 'Propina',
      amount: 1000,
    })
    const extraId = withExtra.extras[0]?.id ?? ''

    expect(withExtra.extras[0]?.amount).toBe(1000)
    expect(billReducer(withExtra, { type: 'REMOVE_EXTRA', extraId }).extras).toEqual([])
  })

  it('fija y quita el pagador', () => {
    const bill = makeBill({ diners: [makeDiner('ana', 0)] })
    const withPayer = billReducer(bill, { type: 'SET_PAYER', dinerId: 'ana' })

    expect(withPayer.payerId).toBe('ana')
    expect(billReducer(withPayer, { type: 'SET_PAYER', dinerId: null }).payerId).toBeNull()
  })

  it('no muta la cuenta original', () => {
    const bill = makeBill()
    billReducer(bill, { type: 'ADD_DINER', name: 'Ana' })

    expect(bill.diners).toEqual([])
  })
})
