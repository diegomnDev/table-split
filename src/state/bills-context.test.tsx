import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BillsProvider } from '@/state/bills-context'
import { useBills } from '@/state/use-bills'
import { loadBills } from '@/storage/bill-store'

function Harness() {
  const { bills, addBill, dispatchTo } = useBills()
  const first = bills[0]

  return (
    <div>
      <button type="button" onClick={() => addBill('Cena')}>
        nueva
      </button>
      <button
        type="button"
        onClick={() => first && dispatchTo(first.id, { type: 'ADD_DINER', name: 'Ana' })}
      >
        comensal
      </button>
      <output>{first ? `${first.title}:${first.diners.length}` : 'vacío'}</output>
    </div>
  )
}

describe('BillsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('crea cuentas y les despacha acciones', async () => {
    const user = userEvent.setup()
    render(
      <BillsProvider>
        <Harness />
      </BillsProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('vacío')

    await user.click(screen.getByRole('button', { name: 'nueva' }))
    expect(screen.getByRole('status')).toHaveTextContent('Cena:0')

    await user.click(screen.getByRole('button', { name: 'comensal' }))
    expect(screen.getByRole('status')).toHaveTextContent('Cena:1')
  })

  it('persiste en localStorage tras el debounce', async () => {
    const user = userEvent.setup()
    render(
      <BillsProvider>
        <Harness />
      </BillsProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'nueva' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))

    expect(loadBills().bills).toHaveLength(1)
  })
})
