import { describe, expect, it } from 'vitest'
import { decodeBill, encodeBill } from '@/core/bill-code'
import { makeBill, makeDiner, makeExtra, makeItem } from '@/core/test-factories'

describe('bill-code', () => {
  it('ida y vuelta conserva la cuenta', () => {
    const bill = makeBill({
      title: 'Casa Paco',
      diners: [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')],
      items: [
        makeItem('i1', 1980, { mode: 'equal', dinerIds: ['ana'] }),
        makeItem('i2', 350, { mode: 'units', units: { ana: 2, luis: 1 } }, 3),
      ],
      extras: [makeExtra('e1', 1000, 'Propina')],
      payments: [{ dinerId: 'ana', amount: 3030 }],
    })

    expect(decodeBill(encodeBill(bill))).toEqual(bill)
  })

  it('sobrevive a acentos y eñes', () => {
    const bill = makeBill({ title: 'Señor Ñam', diners: [makeDiner('a', 0, 'Begoña')] })

    expect(decodeBill(encodeBill(bill))?.diners[0]?.name).toBe('Begoña')
    expect(decodeBill(encodeBill(bill))?.title).toBe('Señor Ñam')
  })

  it('el código es seguro en una URL', () => {
    const code = encodeBill(makeBill({ title: 'Señor Ñam & Cía' }))

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('devuelve null ante un código corrupto', () => {
    expect(decodeBill('no-es-un-codigo')).toBeNull()
    expect(decodeBill('')).toBeNull()
    expect(decodeBill('!!!!')).toBeNull()
  })

  it('devuelve null si el JSON decodifica pero no es una cuenta', () => {
    const notABill = encodeBill({ nope: true } as never)

    expect(decodeBill(notABill)).toBeNull()
  })
})
