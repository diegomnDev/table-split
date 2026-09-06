import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareBar } from '@/components/bill/ShareBar'
import { decodeBill } from '@/core/bill-code'
import { computeSplit } from '@/core/split'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'

const bill = makeBill({
  title: 'Casa Paco',
  diners: [makeDiner('ana', 0, 'Ana')],
  items: [makeItem('i1', 1980, { mode: 'equal', dinerIds: ['ana'] })],
})

// userEvent.setup() installs its own clipboard stub, so ours must be applied
// after it or it gets overwritten.
function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
}

function renderBar() {
  return render(<ShareBar bill={bill} result={computeSplit(bill)} />)
}

describe('ShareBar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copia el resumen en texto', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    renderBar()

    await user.click(screen.getByRole('button', { name: /copiar resumen/i }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Casa Paco — 19,80 €'))
    expect(screen.getByRole('status')).toHaveTextContent(/copiado el resumen/i)
  })

  it('copia un enlace que vuelve a decodificar la cuenta', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    renderBar()

    await user.click(screen.getByRole('button', { name: /copiar enlace/i }))

    const link = writeText.mock.calls[0]?.[0] as string
    const code = link.split('/i/')[1] ?? ''
    expect(decodeBill(code)?.title).toBe('Casa Paco')
  })

  it('si el portapapeles falla, ofrece el texto para copiar a mano', async () => {
    const user = userEvent.setup()
    stubClipboard(() => Promise.reject(new Error('denied')))
    renderBar()

    await user.click(screen.getByRole('button', { name: /copiar resumen/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo copiar/i)
    expect(screen.getByLabelText(/texto para copiar/i)).toHaveTextContent(/Casa Paco/)
  })
})
