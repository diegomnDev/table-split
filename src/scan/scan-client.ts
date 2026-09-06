import { z } from 'zod'
import type { Cents } from '@/core/money'

export type ScannedItem = {
  name: string
  quantity: number
  unitPrice: Cents
}

/** An error whose message is safe to put in front of the user. */
export class ScanError extends Error {}

const responseSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPriceCents: z.number().int(),
    }),
  ),
})

/** The endpoint is build-time configuration; when unset, scanning is off. */
export function scanEndpoint(): string | null {
  const endpoint = import.meta.env.VITE_SCAN_ENDPOINT
  return typeof endpoint === 'string' && endpoint !== '' ? endpoint : null
}

/**
 * Sends a ticket photo to the proxy and returns the lines it detected.
 *
 * Every failure becomes a ScanError with a message in Spanish, because the
 * caller shows it directly. Nothing here trusts the response shape: a model
 * can return anything, and a wrong price silently entering a bill is worse
 * than no scan at all.
 */
export async function scanTicket(file: File, endpoint: string): Promise<ScannedItem[]> {
  const form = new FormData()
  form.set('image', file)

  let response: Response
  try {
    response = await fetch(endpoint, { method: 'POST', body: form })
  } catch {
    throw new ScanError('Sin conexión. Puedes meter los ítems a mano.')
  }

  if (!response.ok) {
    const message = await response
      .json()
      .then((body: unknown) =>
        typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error: unknown }).error)
          : null,
      )
      .catch(() => null)

    throw new ScanError(message ?? 'No se pudo leer el ticket.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ScanError('Respuesta ilegible del servicio de lectura.')
  }

  const parsed = responseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ScanError('El ticket no se ha podido interpretar.')
  }

  return parsed.data.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPriceCents,
  }))
}
