import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from './index'

const env: Env = {
  GEMINI_API_KEY: 'secreto-que-no-debe-salir',
  ALLOWED_ORIGIN: 'https://table-spit.example',
}

function imageRequest(type = 'image/jpeg', bytes = new Uint8Array([1, 2, 3])) {
  const form = new FormData()
  form.set('image', new File([bytes as BlobPart], 'ticket.jpg', { type }))
  return new Request('https://scan.example/', { method: 'POST', body: form })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('scan worker', () => {
  it('rechaza métodos que no sean POST', async () => {
    const response = await worker.fetch(new Request('https://scan.example/'), env)

    expect(response.status).toBe(405)
  })

  it('responde al preflight solo con el origen permitido', async () => {
    const response = await worker.fetch(
      new Request('https://scan.example/', { method: 'OPTIONS' }),
      env,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(env.ALLOWED_ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  })

  it('rechaza una petición sin imagen', async () => {
    const response = await worker.fetch(
      new Request('https://scan.example/', { method: 'POST', body: new FormData() }),
      env,
    )

    expect(response.status).toBe(400)
  })

  it('rechaza un tipo que no es imagen', async () => {
    const response = await worker.fetch(imageRequest('application/pdf'), env)

    expect(response.status).toBe(415)
  })

  it('rechaza una imagen de más de 5 MB', async () => {
    const response = await worker.fetch(
      imageRequest('image/jpeg', new Uint8Array(5 * 1024 * 1024 + 1)),
      env,
    )

    expect(response.status).toBe(413)
  })

  it('envía la clave en la cabecera, nunca en la URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"items":[]}' }] } }],
        }),
        { status: 200 },
      ),
    )

    await worker.fetch(imageRequest(), env)

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).not.toContain(env.GEMINI_API_KEY)
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(env.GEMINI_API_KEY)
  })

  it('devuelve los ítems detectados', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      items: [{ name: 'Pulpo', quantity: 1, unitPriceCents: 1980 }],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const response = await worker.fetch(imageRequest(), env)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      items: [{ name: 'Pulpo', quantity: 1, unitPriceCents: 1980 }],
    })
  })

  it('no filtra el cuerpo de error de arriba', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('API key secreto-que-no-debe-salir inválida, cuota agotada', { status: 400 }),
    )

    const response = await worker.fetch(imageRequest(), env)
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain(env.GEMINI_API_KEY)
    expect(body).not.toContain('cuota agotada')
  })

  it('traduce el 429 a un mensaje sobre la cuota gratuita', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 429 }))

    const response = await worker.fetch(imageRequest(), env)

    expect(response.status).toBe(502)
    expect(await response.text()).toMatch(/cuota gratuita/i)
  })
})
