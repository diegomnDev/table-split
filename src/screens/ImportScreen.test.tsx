import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { encodeBill } from '@/core/bill-code'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import { BillScreen } from '@/screens/BillScreen'
import { ImportScreen } from '@/screens/ImportScreen'
import { BillsProvider } from '@/state/bills-context'
import { loadBills } from '@/storage/bill-store'

const shared = makeBill({
  id: 'origen',
  title: 'Casa Paco',
  diners: [makeDiner('ana', 0, 'Ana')],
  items: [makeItem('i1', 1980, { mode: 'equal', dinerIds: ['ana'] })],
})

function renderImport(code: string) {
  return render(
    <MemoryRouter initialEntries={[`/i/${code}`]}>
      <BillsProvider>
        <Routes>
          <Route path="/i/:code" element={<ImportScreen />} />
          <Route path="/b/:billId" element={<BillScreen />} />
          <Route path="/" element={<p>Mis cuentas</p>} />
        </Routes>
      </BillsProvider>
    </MemoryRouter>,
  )
}

describe('ImportScreen', () => {
  beforeEach(() => localStorage.clear())

  it('previsualiza la cuenta compartida', () => {
    renderImport(encodeBill(shared))

    expect(screen.getByText('Casa Paco')).toBeInTheDocument()
    expect(screen.getByText('19,80 €')).toBeInTheDocument()
  })

  it('guarda una copia con id propio', async () => {
    const user = userEvent.setup()
    renderImport(encodeBill(shared))

    await user.click(screen.getByRole('button', { name: /guardar/i }))
    // Persistence is debounced ~300 ms in BillsProvider.
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))

    const saved = loadBills().bills
    expect(saved).toHaveLength(1)
    expect(saved[0]?.title).toBe('Casa Paco')
    expect(saved[0]?.id).not.toBe('origen')
  })

  it('descartar no guarda nada', async () => {
    const user = userEvent.setup()
    renderImport(encodeBill(shared))

    await user.click(screen.getByRole('button', { name: /descartar/i }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))

    expect(screen.getByText('Mis cuentas')).toBeInTheDocument()
    expect(loadBills().bills).toEqual([])
  })

  it('avisa si el enlace no es válido', () => {
    renderImport('esto-no-vale')

    expect(screen.getByRole('alert')).toHaveTextContent(/no es válido/i)
  })
})
