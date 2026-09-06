import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeBill } from '@/core/test-factories'
import { BillScreen } from '@/screens/BillScreen'
import { BillsProvider } from '@/state/bills-context'
import { saveBills } from '@/storage/bill-store'

function renderBill() {
  saveBills([makeBill({ id: 'b1', title: 'Casa Paco' })])
  return render(
    <MemoryRouter initialEntries={['/b/b1']}>
      <BillsProvider>
        <Routes>
          <Route path="/b/:billId" element={<BillScreen />} />
        </Routes>
      </BillsProvider>
    </MemoryRouter>,
  )
}

describe('BillScreen', () => {
  beforeEach(() => localStorage.clear())

  it('añade comensales', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/añadir comensal/i), 'Ana{enter}')
    await user.type(screen.getByLabelText(/añadir comensal/i), 'Luis{enter}')

    expect(screen.getByRole('button', { name: /ana/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /luis/i })).toBeInTheDocument()
  })

  it('añade un ítem con precio y lo suma al total', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/concepto/i), 'Pulpo')
    await user.type(screen.getByLabelText(/precio/i), '19,80')
    await user.click(screen.getByRole('button', { name: /añadir/i }))

    expect(screen.getByText('Pulpo')).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByText('19,80 €')).toBeInTheDocument()
  })

  it('rechaza un precio inválido sin añadir nada', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/concepto/i), 'Pulpo')
    await user.type(screen.getByLabelText(/precio/i), 'abc')
    await user.click(screen.getByRole('button', { name: /añadir/i }))

    expect(screen.queryByText('Pulpo')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/precio/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('avisa de los ítems sin asignar', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/concepto/i), 'Pulpo')
    await user.type(screen.getByLabelText(/precio/i), '19,80')
    await user.click(screen.getByRole('button', { name: /añadir/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/1 ítem sin asignar/i)
  })
})
