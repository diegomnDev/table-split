import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { BillsScreen } from '@/screens/BillsScreen'
import { BillsProvider } from '@/state/bills-context'

function renderScreen() {
  return render(
    <MemoryRouter>
      <BillsProvider>
        <BillsScreen />
      </BillsProvider>
    </MemoryRouter>,
  )
}

describe('BillsScreen', () => {
  beforeEach(() => localStorage.clear())

  it('muestra el vacío inicial', () => {
    renderScreen()
    expect(screen.getByText(/todavía no hay cuentas/i)).toBeInTheDocument()
  })

  it('crea una cuenta con el nombre escrito', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText(/nombre de la cuenta/i), 'Casa Paco')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(screen.getByText('Casa Paco')).toBeInTheDocument()
  })

  it('no crea una cuenta sin nombre', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(screen.getByText(/todavía no hay cuentas/i)).toBeInTheDocument()
  })
})
