/**
 * table-split scan proxy, as a Vercel Function.
 *
 * Exists for one reason: the Gemini API key cannot live in the browser. This
 * function holds the key, accepts an image, and returns structured ticket
 * lines. It never returns the key, the upstream error body, or the raw model
 * output.
 *
 * It is served from the app's own origin, so there is no CORS to configure and
 * no allowed-origin list to keep in sync.
 */

/**
 * Tried in order, all verified against the live API on 2026-09-06.
 *
 * The newest Flash model is deliberately not first: gemini-3.8-flash answered
 * 503 "high demand" on every attempt, and so did gemini-flash-latest. 3.7 is
 * itself intermittent — it answered 200 and 503 minutes apart — which is the
 * whole reason for a chain rather than one model.
 *
 * gemini-2.5-flash is NOT here on purpose: it still appears in ListModels but
 * returns 404 "no longer available to new users". Listed does not mean usable.
 */
const MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash']

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

const PROMPT = [
  'Eres un extractor de líneas de tickets de restaurante.',
  'Devuelve SOLO los conceptos consumidos con su cantidad y su precio unitario.',
  'El precio unitario va en céntimos enteros: 19,80 € son 1980.',
  'Si el ticket muestra el importe total de una línea con cantidad mayor que uno,',
  'divide entre la cantidad para obtener el precio unitario.',
  'No incluyas subtotales, totales, IVA, propinas ni descuentos.',
  'Si una línea es ilegible, omítela en vez de inventarla.',
].join(' ')

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'INTEGER' },
          unitPriceCents: { type: 'INTEGER' },
        },
        required: ['name', 'quantity', 'unitPriceCents'],
      },
    },
  },
  required: ['items'],
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

/** Chunked so a multi-megabyte image does not blow the argument limit. */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK))
  }
  return btoa(binary)
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido.' }, 405)
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return json({ error: 'El escaneo no está configurado en este despliegue.' }, 503)
    }

    let image: File
    try {
      const form = await request.formData()
      const field = form.get('image')
      if (!(field instanceof File)) {
        return json({ error: 'Falta la imagen.' }, 400)
      }
      image = field
    } catch {
      return json({ error: 'No se pudo leer la imagen.' }, 400)
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return json({ error: 'Ese formato de imagen no vale.' }, 415)
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return json({ error: 'La foto pesa demasiado. Máximo 5 MB.' }, 413)
    }

    const configured = process.env.GEMINI_MODEL
    const models = configured
      ? [configured, ...MODELS.filter((model) => model !== configured)]
      : MODELS

    const bytes = new Uint8Array(await image.arrayBuffer())
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: image.type, data: toBase64(bytes) } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    })

    let upstream: Response | null = null
    let lastStatus = 0

    for (const model of models) {
      let attempt: Response
      try {
        attempt = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body,
          },
        )
      } catch {
        return json({ error: 'No se pudo contactar con el servicio de lectura.' }, 502)
      }

      if (attempt.ok) {
        upstream = attempt
        break
      }

      // The upstream body can carry quota details and echoes of the request.
      // Log it for the operator; never hand it to the browser.
      lastStatus = attempt.status
      const detail = await attempt.text().catch(() => '<cuerpo ilegible>')
      console.error('gemini upstream error', model, attempt.status, detail)

      // Only a busy or rate-limited model is worth retrying somewhere else.
      if (lastStatus !== 503 && lastStatus !== 429) break
    }

    if (!upstream) {
      let message = 'El servicio de lectura ha fallado. Mete los ítems a mano.'
      if (lastStatus === 429) {
        message = 'Se ha agotado la cuota gratuita por ahora. Mete los ítems a mano.'
      } else if (lastStatus === 503) {
        message = 'El servicio de lectura está saturado. Prueba otra vez en un momento.'
      }
      return json({ error: message }, 502)
    }

    let text: string
    try {
      const payload = (await upstream.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } catch {
      return json({ error: 'Respuesta ilegible del servicio de lectura.' }, 502)
    }

    try {
      return json(JSON.parse(text) as unknown, 200)
    } catch {
      return json({ error: 'El ticket no se ha podido interpretar.' }, 502)
    }
  },
}
