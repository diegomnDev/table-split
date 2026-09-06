import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import type { Bill } from '@/core/types'
import { ResultScreen } from '@/screens/ResultScreen'
import { BillsProvider } from '@/state/bills-context'
import { saveBills } from '@/storage/bill-store'

function rowFor(name: string) {
  return within(screen.getByTestId('per-diner')).getByText(name).closest('li')
}

function renderResult(bill: Bill = makeBill({ id: 'b1' })) {
  saveBills([bill])
  return render(
    <MemoryRouter initialEntries={['/b/b1/resultado']}>
      <BillsProvider>
        <Routes>
          <Route path="/b/:billId/resultado" element={<ResultScreen />} />
        </Routes>
      </BillsProvider>
    </MemoryRouter>,
  )
}

const bill = makeBill({
  id: 'b1',
  title: 'Casa Paco',
  diners: [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')],
  items: [
    makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana'] }),
    makeItem('i2', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] }),
  ],
})

describe('ResultScreen', () => {
  beforeEach(() => localStorage.clear())

  it('muestra lo que paga cada uno', () => {
    renderResult(bill)

    expect(rowFor('Ana')).toHaveTextContent('35,00 €')
    expect(rowFor('Luis')).toHaveTextContent('5,00 €')
  })

  it('muestra el total', () => {
    renderResult(bill)
    expect(screen.getByTestId('bill-total')).toHaveTextContent('40,00 €')
  })

  it('con pagador, muestra quién le debe cuánto', () => {
    renderResult({ ...bill, payments: [{ dinerId: 'ana', amount: 4000 }] })
    expect(screen.getByTestId('debts')).toHaveTextContent('Luis debe 5,00 € a Ana')
  })

  it('el atajo "pagó todo" registra el total y calcula la transferencia', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.click(screen.getByRole('button', { name: /ana pagó todo/i }))

    expect(screen.getByTestId('debts')).toHaveTextContent('Luis debe 5,00 € a Ana')
    expect(screen.queryByTestId('payments-mismatch')).not.toBeInTheDocument()
  })

  it('avisa cuando lo pagado no cuadra con el total', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.type(screen.getByLabelText(/puso ana/i), '30')
    await user.click(screen.getAllByRole('button', { name: /registrar pago/i })[0] as HTMLElement)

    expect(screen.getByTestId('payments-mismatch')).toHaveTextContent(/faltan/i)
    expect(screen.getByTestId('payments-mismatch')).toHaveTextContent('10,00 €')
  })

  it('rechaza un importe de pago inválido', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.type(screen.getByLabelText(/puso ana/i), 'abc')
    await user.click(screen.getAllByRole('button', { name: /registrar pago/i })[0] as HTMLElement)

    expect(screen.getByLabelText(/puso ana/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByTestId('debts')).not.toBeInTheDocument()
  })

  it('declara el dinero sin asignar', () => {
    renderResult({
      ...bill,
      items: [...bill.items, makeItem('i3', 600, { mode: 'equal', dinerIds: [] }, 1, 'Café')],
    })

    expect(screen.getByTestId('unassigned')).toHaveTextContent('6,00 €')
  })

  it('añade una propina y la reparte entre todos', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.type(screen.getByLabelText(/concepto del extra/i), 'Propina')
    await user.type(screen.getByLabelText(/importe del extra/i), '10')
    await user.click(screen.getByRole('button', { name: /añadir extra/i }))

    expect(rowFor('Ana')).toHaveTextContent('40,00 €')
    expect(rowFor('Luis')).toHaveTextContent('10,00 €')
  })
})
