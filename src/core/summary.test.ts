import { describe, expect, it } from 'vitest'
import { computeSplit } from '@/core/split'
import { billSummary } from '@/core/summary'
import { makeBill, makeDiner, makeExtra, makeItem } from '@/core/test-factories'

describe('billSummary', () => {
  it('resume la cuenta en texto pegable', () => {
    const bill = makeBill({
      title: 'Casa Paco',
      diners: [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')],
      items: [
        makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana'] }),
        makeItem('i2', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] }),
      ],
      payments: [{ dinerId: 'ana', amount: 4000 }],
    })

    expect(billSummary(bill, computeSplit(bill))).toBe(
      [
        'Casa Paco — 40,00 €',
        '',
        'Ana: 35,00 €',
        'Luis: 5,00 €',
        '',
        'Luis debe 5,00 € a Ana',
      ].join('\n'),
    )
  })

  it('omite el bloque de deudas si nadie ha puesto dinero', () => {
    const bill = makeBill({
      title: 'Cena',
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] })],
    })

    expect(billSummary(bill, computeSplit(bill))).toBe(
      ['Cena — 10,00 €', '', 'Ana: 10,00 €'].join('\n'),
    )
  })

  it('declara el dinero sin asignar', () => {
    const bill = makeBill({
      title: 'Cena',
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 600, { mode: 'equal', dinerIds: [] })],
    })

    expect(billSummary(bill, computeSplit(bill))).toContain('Sin asignar: 6,00 €')
  })

  it('lista los extras cuando los hay', () => {
    const bill = makeBill({
      title: 'Cena',
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] })],
      extras: [makeExtra('e1', 200, 'Propina')],
    })

    expect(billSummary(bill, computeSplit(bill))).toContain('Propina: 2,00 €')
  })

  it('no lleva emoji ni adornos', () => {
    const bill = makeBill({
      title: 'Cena',
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] })],
    })

    expect(billSummary(bill, computeSplit(bill))).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })
})
