import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from './index'

const env: Env = {
  GEMINI_API_KEY: 'secreto-que-no-debe-salir',
  ALLOWED_ORIGIN: 'https://table-spit.example',
}

function imageRequest(type = 'image/jpeg', content = 'imagen') {
  const form = new FormData()
  form.set('image', new File([content], 'ticket.jpg', { type }))
  return new Request('https://scan.example/', { method: 'POST', body: form })
}

/** A Response body can only be read once, so every call gets a fresh one. */
function always(make: () => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(make()))
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
      imageRequest('image/jpeg', 'x'.repeat(5 * 1024 * 1024 + 1)),
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
    always(
      () =>
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
    always(() => new Response('rate limited', { status: 429 }))

    const response = await worker.fetch(imageRequest(), env)

    expect(response.status).toBe(502)
    expect(await response.text()).toMatch(/cuota gratuita/i)
  })

  it('cae al modelo de reserva cuando el primero está saturado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('high demand', { status: 503 }))
      .mockResolvedValueOnce(
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
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[0]?.[0]).toContain('gemini-3.7-flash')
    expect(fetchSpy.mock.calls[1]?.[0]).toContain('gemini-3.6-flash')
  })

  it('si todos los modelos están saturados, lo dice sin culpar al usuario', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    always(() => new Response('high demand', { status: 503 }))

    const response = await worker.fetch(imageRequest(), env)

    expect(response.status).toBe(502)
    expect(await response.text()).toMatch(/saturado/i)
  })

  it('un error que no es transitorio no prueba otro modelo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = always(() => new Response('bad request', { status: 400 }))

    await worker.fetch(imageRequest(), env)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('el modelo de la variable de entorno se prueba primero', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"items":[]}' }] } }] }),
        {
          status: 200,
        },
      ),
    )

    await worker.fetch(imageRequest(), { ...env, GEMINI_MODEL: 'gemini-3.8-flash' })

    expect(fetchSpy.mock.calls[0]?.[0]).toContain('gemini-3.8-flash')
  })
})
