import type { Bill } from '@/core/types'
import { storedPayloadSchema, storedPayloadV1Schema } from '@/storage/schema'

export const STORAGE_KEY = 'tablesplit:bills'

/** The key used before the project was renamed. Read once, then retired, so a
 * rename never costs anyone the bills already on their phone. */
export const LEGACY_STORAGE_KEY = 'tablespit:bills'
export const SCHEMA_VERSION = 2

export type LoadResult = {
  bills: Bill[]
  /** True when stored data existed but could not be used, so we started empty. */
  recovered: boolean
  /** Set when older data was upgraded on read, so the UI can say what changed. */
  migratedFrom?: 1
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
    raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY)
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

  const asV1 = storedPayloadV1Schema.safeParse(parsed)
  if (asV1.success) {
    // A v1 bill recorded who paid but never how much, and that amount cannot
    // be recovered. Bills, diners and items survive intact; the payment is
    // dropped and the UI asks again, which is honest. Guessing "the payer
    // paid the current total" would invent a fact and produce wrong debts.
    return {
      bills: asV1.data.bills.map((bill) => ({
        id: bill.id,
        title: bill.title,
        createdAt: bill.createdAt,
        diners: bill.diners,
        items: bill.items,
        extras: bill.extras,
        payments: [],
      })),
      recovered: false,
      migratedFrom: 1,
    }
  }

  const result = storedPayloadSchema.safeParse(parsed)
  if (!result.success) return { bills: [], recovered: true }

  if (result.data.schemaVersion > SCHEMA_VERSION) return { bills: [], recovered: true }

  return { bills: result.data.bills, recovered: false }
}

/** Writes bills. Never throws: a full disk must not take the app down. */
export function saveBills(bills: Bill[], storage: Storage | null = defaultStorage()): void {
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, bills }))
    storage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Quota exceeded or storage disabled. Losing a write is survivable;
    // crashing mid-dinner is not.
  }
}
