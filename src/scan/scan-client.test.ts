import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScanError, scanTicket } from '@/scan/scan-client'

const endpoint = 'https://scan.example/'

function ticket() {
  return new File([new Uint8Array([1, 2, 3]) as BlobPart], 'ticket.jpg', { type: 'image/jpeg' })
}

function stubFetch(response: Response | Promise<never>) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => (response instanceof Response ? Promise.resolve(response) : response))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('scanTicket', () => {
  it('mapea los céntimos a la forma del dominio', async () => {
    stubFetch(
      new Response(
        JSON.stringify({
          items: [
            { name: 'Pulpo', quantity: 1, unitPriceCents: 1980 },
            { name: 'Caña', quantity: 3, unitPriceCents: 350 },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(scanTicket(ticket(), endpoint)).resolves.toEqual([
      { name: 'Pulpo', quantity: 1, unitPrice: 1980 },
      { name: 'Caña', quantity: 3, unitPrice: 350 },
    ])
  })

  it('envía la imagen como multipart', async () => {
    const spy = stubFetch(new Response(JSON.stringify({ items: [] }), { status: 200 }))

    await scanTicket(ticket(), endpoint)

    const init = spy.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect((init.body as FormData).get('image')).toBeInstanceOf(File)
  })

  it('propaga el mensaje del proxy cuando responde con error', async () => {
    stubFetch(
      new Response(JSON.stringify({ error: 'Se ha agotado la cuota gratuita por ahora.' }), {
        status: 502,
      }),
    )

    await expect(scanTicket(ticket(), endpoint)).rejects.toThrow(/cuota gratuita/i)
  })

  it('rechaza una respuesta con forma inesperada en vez de devolver basura', async () => {
    stubFetch(new Response(JSON.stringify({ items: [{ name: 'Pulpo' }] }), { status: 200 }))

    await expect(scanTicket(ticket(), endpoint)).rejects.toBeInstanceOf(ScanError)
  })

  it('rechaza un precio que no es entero', async () => {
    stubFetch(
      new Response(
        JSON.stringify({ items: [{ name: 'Pulpo', quantity: 1, unitPriceCents: 19.8 }] }),
        { status: 200 },
      ),
    )

    await expect(scanTicket(ticket(), endpoint)).rejects.toBeInstanceOf(ScanError)
  })

  it('avisa de la falta de conexión', async () => {
    stubFetch(Promise.reject(new TypeError('Failed to fetch')) as Promise<never>)

    await expect(scanTicket(ticket(), endpoint)).rejects.toThrow(/sin conexión/i)
  })
})
