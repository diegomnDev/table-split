import { z } from 'zod'
import { billSchema } from '@/core/schema'

export const storedPayloadSchema = z.object({
  schemaVersion: z.number().int(),
  bills: z.array(billSchema),
})

/** Schema version 1: a single optional payer, no amounts. Kept so old saved
 * bills can be migrated instead of discarded. */
const dinerSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
})

const assignmentSchemaV1 = z.union([
  z.object({ mode: z.literal('equal'), dinerIds: z.array(z.string()) }),
  z.object({ mode: z.literal('units'), units: z.record(z.string(), z.number().int()) }),
])

const itemSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int().min(0),
  assignment: assignmentSchemaV1,
})

const extraSchemaV1 = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number().int(),
})

const billSchemaV1 = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  diners: z.array(dinerSchemaV1),
  items: z.array(itemSchemaV1),
  extras: z.array(extraSchemaV1),
  payerId: z.string().nullable(),
})

export const storedPayloadV1Schema = z.object({
  schemaVersion: z.literal(1),
  bills: z.array(billSchemaV1),
})

export type StoredPayload = z.infer<typeof storedPayloadSchema>
