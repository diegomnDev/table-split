import { billSchema } from '@/core/schema'
import type { Bill } from '@/core/types'

/**
 * Encodes a bill into a URL-safe string.
 *
 * The bytes go through TextEncoder before base64: `btoa` throws on any
 * character above U+00FF, so "Begoña" would break a naive implementation.
 * Padding is stripped and `+/` swapped for `-_` so the code survives a URL
 * path without escaping.
 */
export function encodeBill(bill: Bill): string {
  const bytes = new TextEncoder().encode(JSON.stringify(bill))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decodes a share code back into a bill, or null if it is not a valid one. */
export function decodeBill(code: string): Bill | null {
  if (code === '') return null

  try {
    const base64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))

    const result = billSchema.safeParse(parsed)
    return result.success ? (result.data as Bill) : null
  } catch {
    // Malformed base64, malformed UTF-8 or malformed JSON all mean the same
    // thing to the user: this link is not a bill.
    return null
  }
}
