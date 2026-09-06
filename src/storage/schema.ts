import { z } from 'zod'
import { billSchema } from '@/core/schema'

export const storedPayloadSchema = z.object({
  schemaVersion: z.number().int(),
  bills: z.array(billSchema),
})

export type StoredPayload = z.infer<typeof storedPayloadSchema>
