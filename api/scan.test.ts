// @vitest-environment node
// The function runs on Node, not in a browser. Under jsdom the File from the
// test and the File seen by request.formData() come from different realms, so
// `instanceof File` fails and every upload looks empty.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import scan from './scan'

const KEY = 'secreto-que-no-debe-salir'

function imageRequest(type = 'image/jpeg', content = 'imagen') {
  const form = new FormData()
  form.set('image', new File([content], 'ticket.jpg', { type }))
  return new Request('https://table-split.example/api/scan', { method: 'POST', body: form })
}

/** A Response body can only be read once, so every call gets a fresh one. */
function always(make: () => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(make()))
}

function okResponse(items: unknown = []) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] } }],
    }),
    { status: 200 },
  )
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = KEY
  delete process.env.GEMINI_MODEL
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api/scan', () => {
  it('rechaza métodos que no sean POST', async () => {
    const response = await scan.fetch(new Request('https://table-split.example/api/scan'))

    expect(response.status).toBe(405)
  })

  it('avisa si el despliegue no tiene clave configurada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.GEMINI_API_KEY = ''

    const response = await scan.fetch(imageRequest())

    expect(response.status).toBe(503)
    expect(await response.text()).toMatch(/no está configurado/i)
  })

  it('rechaza una petición sin imagen', async () => {
    const response = await scan.fetch(
      new Request('https://table-split.example/api/scan', {
        method: 'POST',
        body: new FormData(),
      }),
    )

    expect(response.status).toBe(400)
  })

  it('rechaza un tipo que no es imagen', async () => {
    expect((await scan.fetch(imageRequest('application/pdf'))).status).toBe(415)
  })

  it('rechaza una imagen de más de 5 MB', async () => {
    const big = imageRequest('image/jpeg', 'x'.repeat(5 * 1024 * 1024 + 1))

    expect((await scan.fetch(big)).status).toBe(413)
  })

  it('envía la clave en la cabecera, nunca en la URL', async () => {
    const fetchSpy = always(() => okResponse())

    await scan.fetch(imageRequest())

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).not.toContain(KEY)
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY)
  })

  it('devuelve los ítems detectados', async () => {
    always(() => okResponse([{ name: 'Pulpo', quantity: 1, unitPriceCents: 1980 }]))

    const response = await scan.fetch(imageRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      items: [{ name: 'Pulpo', quantity: 1, unitPriceCents: 1980 }],
    })
  })

  it('no filtra el cuerpo de error de arriba', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    always(() => new Response(`API key ${KEY} inválida, cuota agotada`, { status: 400 }))

    const response = await scan.fetch(imageRequest())
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain(KEY)
    expect(body).not.toContain('cuota agotada')
  })

  it('traduce el 429 a un mensaje sobre la cuota gratuita', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    always(() => new Response('rate limited', { status: 429 }))

    const response = await scan.fetch(imageRequest())

    expect(response.status).toBe(502)
    expect(await response.text()).toMatch(/cuota gratuita/i)
  })

  it('cae al modelo de reserva cuando el primero está saturado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('high demand', { status: 503 }))
      .mockResolvedValueOnce(okResponse([{ name: 'Pulpo', quantity: 1, unitPriceCents: 1980 }]))

    const response = await scan.fetch(imageRequest())

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('gemini-3.7-flash')
    expect(fetchSpy.mock.calls[1]?.[0]).toContain('gemini-3.6-flash')
  })

  it('si todos los modelos están saturados, lo dice sin culpar al usuario', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    always(() => new Response('high demand', { status: 503 }))

    const response = await scan.fetch(imageRequest())

    expect(response.status).toBe(502)
    expect(await response.text()).toMatch(/saturado/i)
  })

  it('un error que no es transitorio no prueba otro modelo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = always(() => new Response('bad request', { status: 400 }))

    await scan.fetch(imageRequest())

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('el modelo de la variable de entorno se prueba primero', async () => {
    const fetchSpy = always(() => okResponse())
    process.env.GEMINI_MODEL = 'gemini-3.8-flash'

    await scan.fetch(imageRequest())

    expect(fetchSpy.mock.calls[0]?.[0]).toContain('gemini-3.8-flash')
  })

  it('no permite cachear la respuesta', async () => {
    always(() => okResponse())

    const response = await scan.fetch(imageRequest())

    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
