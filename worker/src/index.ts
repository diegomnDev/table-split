/**
 * table-spit scan proxy.
 *
 * Exists for one reason: the Gemini API key cannot live in the browser. This
 * Worker holds the key, accepts an image, and returns structured ticket lines.
 * It never returns the key, the upstream error body, or the raw model output.
 */

export type Env = {
  /** Set with: npx wrangler secret put GEMINI_API_KEY */
  GEMINI_API_KEY: string
  /** Exact origin allowed to call this Worker. Never "*". */
  ALLOWED_ORIGIN: string
  /** Optional override, e.g. when a cheaper or newer model appears. */
  GEMINI_MODEL?: string
}

const DEFAULT_MODEL = 'gemini-3.8-flash'
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

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
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
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido.' }, 405, env)
    }

    let image: File
    try {
      const form = await request.formData()
      const field = form.get('image')
      if (!(field instanceof File)) {
        return json({ error: 'Falta la imagen.' }, 400, env)
      }
      image = field
    } catch {
      return json({ error: 'No se pudo leer la imagen.' }, 400, env)
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return json({ error: 'Ese formato de imagen no vale.' }, 415, env)
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return json({ error: 'La foto pesa demasiado. Máximo 5 MB.' }, 413, env)
    }

    const model = env.GEMINI_MODEL ?? DEFAULT_MODEL
    const bytes = new Uint8Array(await image.arrayBuffer())

    let upstream: Response
    try {
      upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
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
          }),
        },
      )
    } catch {
      return json({ error: 'No se pudo contactar con el servicio de lectura.' }, 502, env)
    }

    if (!upstream.ok) {
      // The upstream body can contain quota details and request echoes. Log it
      // for the operator; never hand it to the browser.
      console.error('gemini upstream error', upstream.status, await upstream.text())
      const message =
        upstream.status === 429
          ? 'Se ha agotado la cuota gratuita por ahora. Mete los ítems a mano.'
          : 'El servicio de lectura ha fallado. Mete los ítems a mano.'
      return json({ error: message }, 502, env)
    }

    let text: string
    try {
      const payload = (await upstream.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } catch {
      return json({ error: 'Respuesta ilegible del servicio de lectura.' }, 502, env)
    }

    try {
      const parsed = JSON.parse(text) as unknown
      return json(parsed, 200, env)
    } catch {
      return json({ error: 'El ticket no se ha podido interpretar.' }, 502, env)
    }
  },
}
