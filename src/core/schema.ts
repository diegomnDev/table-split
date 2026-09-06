// Zod lives in core because validation is domain logic, not persistence
// detail: the same schema guards localStorage reads and decoded share links.
import { z } from 'zod'

const centsSchema = z.number().int()

const dinerSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
})

const assignmentSchema = z.union([
  z.object({ mode: z.literal('equal'), dinerIds: z.array(z.string()) }),
  z.object({ mode: z.literal('units'), units: z.record(z.string(), z.number().int()) }),
])

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unitPrice: centsSchema,
  quantity: z.number().int().min(0),
  assignment: assignmentSchema,
})

const extraSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: centsSchema,
})

const paymentSchema = z.object({
  dinerId: z.string(),
  amount: centsSchema,
})

export const billSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  diners: z.array(dinerSchema),
  items: z.array(itemSchema),
  extras: z.array(extraSchema),
  payments: z.array(paymentSchema),
})
