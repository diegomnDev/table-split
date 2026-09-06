import type { Bill } from '@/core/types'
import { storedPayloadSchema } from '@/storage/schema'

export const STORAGE_KEY = 'tablespit:bills'
export const SCHEMA_VERSION = 1

export type LoadResult = {
  bills: Bill[]
  /** True when stored data existed but could not be used, so we started empty. */
  recovered: boolean
}

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    // Private modes and embedded webviews can throw on mere access.
    return null
  }
}

/**
 * Reads saved bills. The stored JSON was written by an older version of this
 * same app, which makes it exactly as untrustworthy as a third-party API — so
 * it is validated, and a bad payload starts the app empty instead of crashing
 * it to a blank screen.
 */
export function loadBills(storage: Storage | null = defaultStorage()): LoadResult {
  if (!storage) return { bills: [], recovered: false }

  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { bills: [], recovered: true }
  }

  if (raw === null) return { bills: [], recovered: false }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { bills: [], recovered: true }
  }

  const result = storedPayloadSchema.safeParse(parsed)
  if (!result.success) return { bills: [], recovered: true }

  if (result.data.schemaVersion > SCHEMA_VERSION) return { bills: [], recovered: true }

  // Migrations for older versions land here, one `if` per version bump.

  return { bills: result.data.bills, recovered: false }
}

/** Writes bills. Never throws: a full disk must not take the app down. */
export function saveBills(bills: Bill[], storage: Storage | null = defaultStorage()): void {
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, bills }))
  } catch {
    // Quota exceeded or storage disabled. Losing a write is survivable;
    // crashing mid-dinner is not.
  }
}
