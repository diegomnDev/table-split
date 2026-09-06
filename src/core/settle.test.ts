import { describe, expect, it } from 'vitest'
import { settle } from '@/core/settle'
import type { DinerSplit } from '@/core/types'

function share(dinerId: string, total: number): DinerSplit {
  return { dinerId, itemsTotal: total, extrasShare: 0, total }
}

describe('settle', () => {
  it('sin pagos no hay deudas', () => {
    expect(settle([share('ana', 1000)], [])).toEqual([])
  })

  it('un pagador único cobra de todos los demás', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000), share('mar', 1000)],
      [{ dinerId: 'ana', amount: 3000 }],
    )

    expect(debts).toEqual([
      { from: 'luis', to: 'ana', amount: 1000 },
      { from: 'mar', to: 'ana', amount: 1000 },
    ])
  })

  it('quien pagó justo lo suyo no aparece', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000)],
      [
        { dinerId: 'ana', amount: 1000 },
        { dinerId: 'luis', amount: 1000 },
      ],
    )

    expect(debts).toEqual([])
  })

  it('minimiza transferencias con dos pagadores', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000), share('mar', 1000), share('eva', 1000)],
      [
        { dinerId: 'ana', amount: 2000 },
        { dinerId: 'luis', amount: 2000 },
      ],
    )

    expect(debts).toEqual([
      { from: 'mar', to: 'ana', amount: 1000 },
      { from: 'eva', to: 'luis', amount: 1000 },
    ])
  })

  it('suma cero: lo que se cobra es lo que se paga', () => {
    const debts = settle(
      [share('ana', 1234), share('luis', 4321), share('mar', 999)],
      [{ dinerId: 'mar', amount: 6554 }],
    )

    const received = debts.reduce((sum, debt) => sum + debt.amount, 0)
    expect(received).toBe(1234 + 4321)
  })

  it('acumula varios pagos de la misma persona', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000)],
      [
        { dinerId: 'ana', amount: 500 },
        { dinerId: 'ana', amount: 1500 },
      ],
    )

    expect(debts).toEqual([{ from: 'luis', to: 'ana', amount: 1000 }])
  })

  it('es determinista con empates', () => {
    const shares = [share('ana', 1000), share('luis', 1000), share('mar', 1000)]
    const payments = [{ dinerId: 'ana', amount: 3000 }]

    expect(settle(shares, payments)).toEqual(settle(shares, payments))
  })

  it('reparte entre varios acreedores cuando un deudor debe a más de uno', () => {
    const debts = settle(
      [share('ana', 0), share('luis', 0), share('mar', 3000)],
      [
        { dinerId: 'ana', amount: 1000 },
        { dinerId: 'luis', amount: 2000 },
      ],
    )

    expect(debts).toEqual([
      { from: 'mar', to: 'ana', amount: 1000 },
      { from: 'mar', to: 'luis', amount: 2000 },
    ])
  })
})
