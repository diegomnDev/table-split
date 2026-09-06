import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScanSheet } from '@/components/bill/ScanSheet'

const endpoint = 'https://scan.example/'

function ticket() {
  return new File([new Uint8Array([1, 2, 3]) as BlobPart], 'ticket.jpg', { type: 'image/jpeg' })
}

function stubScan(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

function okResponse() {
  return new Response(
    JSON.stringify({
      items: [
        { name: 'Pulpo', quantity: 1, unitPriceCents: 1980 },
        { name: 'Caña', quantity: 3, unitPriceCents: 350 },
      ],
    }),
    { status: 200 },
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScanSheet', () => {
  it('nada entra en la cuenta sin pasar por la revisión', async () => {
    stubScan(okResponse())
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<ScanSheet endpoint={endpoint} onAdd={onAdd} />)

    await user.upload(screen.getByLabelText(/escanear ticket/i), ticket())

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('añade solo las líneas marcadas', async () => {
    stubScan(okResponse())
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<ScanSheet endpoint={endpoint} onAdd={onAdd} />)

    await user.upload(screen.getByLabelText(/escanear ticket/i), ticket())
    await screen.findByRole('dialog')

    await user.click(screen.getByLabelText(/añadir caña/i))
    await user.click(screen.getByRole('button', { name: /añadir seleccionados/i }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('Pulpo', 1980, 1)
  })

  it('permite corregir un precio mal leído antes de añadirlo', async () => {
    stubScan(okResponse())
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<ScanSheet endpoint={endpoint} onAdd={onAdd} />)

    await user.upload(screen.getByLabelText(/escanear ticket/i), ticket())
    await screen.findByRole('dialog')

    await user.click(screen.getByLabelText(/añadir caña/i))
    await user.clear(screen.getByLabelText(/precio de la línea 1/i))
    await user.type(screen.getByLabelText(/precio de la línea 1/i), '21,50')
    await user.click(screen.getByRole('button', { name: /añadir seleccionados/i }))

    expect(onAdd).toHaveBeenCalledWith('Pulpo', 2150, 1)
  })

  it('muestra el error del servicio sin romper la pantalla', async () => {
    stubScan(
      new Response(JSON.stringify({ error: 'Se ha agotado la cuota gratuita por ahora.' }), {
        status: 502,
      }),
    )
    const user = userEvent.setup()
    render(<ScanSheet endpoint={endpoint} onAdd={vi.fn()} />)

    await user.upload(screen.getByLabelText(/escanear ticket/i), ticket())

    expect(await screen.findByRole('alert')).toHaveTextContent(/cuota gratuita/i)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
