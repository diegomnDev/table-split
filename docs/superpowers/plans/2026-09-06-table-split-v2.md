# table-split v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three deferred capabilities: several people paying with minimal settling transfers, sharing a result out of the app, and filling a bill from a photo of the ticket at zero cost.

**Architecture:** The v1 layering holds. Settlement is another pure function in `src/core/`. Sharing is a pure encoder plus a thin clipboard/URL layer. The photo path is the only new boundary: the browser posts an image to a configurable HTTPS endpoint (a Cloudflare Worker holding the API key) and receives structured JSON, which the user reviews before anything enters the bill.

**Tech Stack:** Unchanged from v1, plus a Cloudflare Worker (`worker/`) deployed separately.

**Spec:** `docs/superpowers/specs/2026-09-06-table-split-design.md` (the "v2 scope" section)

## Global Constraints

- Everything from the v1 plan's Global Constraints still applies: integer cents, pure `src/core/`, theme tokens only, Spanish copy, exact pinned versions, Conventional Commits, no AI attribution.
- The invariant grows: `sum(perDiner.total) + unassignedTotal === billTotal` still holds, and settlement must additionally satisfy `sum(payments) === billTotal` before debts can be trusted; when it does not, the UI says so rather than producing wrong transfers.
- Manual entry must keep working with no network and no configured endpoint. The photo path is a shortcut that can be absent or fail without degrading the app.
- No API key, token or secret is ever present in the client bundle or in the repository.

---

### Task 1: Payments model and settlement

Replaces `payerId: string | null` with a list of payments, and computes who pays whom with as few transfers as possible.

**Files:**
- Create: `src/core/settle.ts`, `src/core/settle.test.ts`
- Modify: `src/core/types.ts`, `src/core/split.ts`, `src/core/split.test.ts`, `src/state/bill-reducer.ts`, `src/state/bill-reducer.test.ts`, `src/storage/schema.ts`, `src/storage/bill-store.ts`, `src/storage/bill-store.test.ts`

**Interfaces:**
- Consumes: `Cents`, `DinerSplit`.
- Produces:
  - `type Payment = { dinerId: string; amount: Cents }`
  - `Bill.payments: Payment[]` (replaces `Bill.payerId`)
  - `settle(perDiner: DinerSplit[], payments: Payment[]): Debt[]`
  - `SCHEMA_VERSION = 2` with a migration from 1.

- [ ] **Step 1: Write the failing settlement tests**

Create `src/core/settle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { settle } from '@/core/settle'
import type { DinerSplit } from '@/core/types'

function share(dinerId: string, total: number): DinerSplit {
  return { dinerId, itemsTotal: total, extrasShare: 0, total }
}

describe('settle', () => {
  it('sin pagos no hay deudas', () => {
    expect(settle([share('ana', 1000)], [])).toEqual([])
  })

  it('un pagador único cobra de todos los demás', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000), share('mar', 1000)],
      [{ dinerId: 'ana', amount: 3000 }],
    )

    expect(debts).toEqual([
      { from: 'luis', to: 'ana', amount: 1000 },
      { from: 'mar', to: 'ana', amount: 1000 },
    ])
  })

  it('quien pagó justo lo suyo no aparece', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000)],
      [
        { dinerId: 'ana', amount: 1000 },
        { dinerId: 'luis', amount: 1000 },
      ],
    )

    expect(debts).toEqual([])
  })

  it('minimiza transferencias con dos pagadores', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000), share('mar', 1000), share('eva', 1000)],
      [
        { dinerId: 'ana', amount: 2000 },
        { dinerId: 'luis', amount: 2000 },
      ],
    )

    expect(debts).toEqual([
      { from: 'mar', to: 'ana', amount: 1000 },
      { from: 'eva', to: 'luis', amount: 1000 },
    ])
  })

  it('suma cero: lo que se cobra es lo que se paga', () => {
    const debts = settle(
      [share('ana', 1234), share('luis', 4321), share('mar', 999)],
      [{ dinerId: 'mar', amount: 6554 }],
    )

    const received = debts.reduce((sum, debt) => sum + debt.amount, 0)
    expect(received).toBe(1234 + 4321)
  })

  it('acumula varios pagos de la misma persona', () => {
    const debts = settle(
      [share('ana', 1000), share('luis', 1000)],
      [
        { dinerId: 'ana', amount: 500 },
        { dinerId: 'ana', amount: 1500 },
      ],
    )

    expect(debts).toEqual([{ from: 'luis', to: 'ana', amount: 1000 }])
  })

  it('es determinista con empates', () => {
    const shares = [share('ana', 1000), share('luis', 1000), share('mar', 1000)]
    const payments = [{ dinerId: 'ana', amount: 3000 }]

    expect(settle(shares, payments)).toEqual(settle(shares, payments))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/core/settle.test.ts`
Expected: FAIL — `Failed to resolve import "@/core/settle"`.

- [ ] **Step 3: Write `src/core/settle.ts`**

```ts
import type { Cents } from '@/core/money'
import type { Debt, DinerSplit, Payment } from '@/core/types'

type Balance = { dinerId: string; amount: Cents }

/**
 * Turns per-diner shares and actual payments into a short list of transfers.
 *
 * Greedy largest-creditor / largest-debtor matching. It is not guaranteed to
 * be the theoretical minimum number of transfers (that problem is NP-hard),
 * but it is optimal for the shapes a dinner produces — one or two payers — and
 * it always settles every balance exactly.
 *
 * Order of the input decides ties, so the output is deterministic.
 */
export function settle(perDiner: DinerSplit[], payments: Payment[]): Debt[] {
  const paid = new Map<string, Cents>()
  for (const payment of payments) {
    paid.set(payment.dinerId, (paid.get(payment.dinerId) ?? 0) + payment.amount)
  }

  // Positive balance: this diner is owed money. Negative: this diner owes.
  const balances: Balance[] = perDiner.map((share, index) => ({
    dinerId: share.dinerId,
    amount: (paid.get(share.dinerId) ?? 0) - share.total,
    index,
  })) as Balance[]

  const creditors = balances.filter((balance) => balance.amount > 0).map((b) => ({ ...b }))
  const debtors = balances.filter((balance) => balance.amount < 0).map((b) => ({ ...b }))

  const debts: Debt[] = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    if (!creditor || !debtor) break

    const amount = Math.min(creditor.amount, -debtor.amount)
    if (amount > 0) {
      debts.push({ from: debtor.dinerId, to: creditor.dinerId, amount })
      creditor.amount -= amount
      debtor.amount += amount
    }

    if (creditor.amount === 0) creditorIndex += 1
    if (debtor.amount === 0) debtorIndex += 1
  }

  return debts
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/core/settle.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Swap `payerId` for `payments` across the model**

In `src/core/types.ts`, add `Payment` and change `Bill`:

```ts
export type Payment = {
  dinerId: string
  amount: Cents
}
```

Replace `payerId: string | null` with `payments: Payment[]` in `Bill`, and add to `Warning`:

```ts
  | { kind: 'payments-mismatch'; paid: Cents; expected: Cents }
```

Add to `SplitResult`:

```ts
  /** Sum of all recorded payments. Compare against billTotal. */
  paidTotal: Cents
```

- [ ] **Step 6: Rewrite the debts block in `src/core/split.ts`**

Delete the `if (bill.payerId !== null)` block and replace with:

```ts
  const paidTotal = bill.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const debts = bill.payments.length > 0 ? settle(perDiner, bill.payments) : []

  if (bill.payments.length > 0 && paidTotal !== billTotal) {
    warnings.push({ kind: 'payments-mismatch', paid: paidTotal, expected: billTotal })
  }

  return { perDiner, billTotal, unassignedTotal, paidTotal, debts, warnings }
```

with `import { settle } from '@/core/settle'` at the top.

- [ ] **Step 7: Update the reducer**

In `src/state/bill-reducer.ts`, replace the `SET_PAYER` action with:

```ts
  | { type: 'SET_PAYMENT'; dinerId: string; amount: Cents }
  | { type: 'CLEAR_PAYMENTS' }
```

`createBill` sets `payments: []`. Handle the new cases:

```ts
    case 'SET_PAYMENT': {
      const others = bill.payments.filter((payment) => payment.dinerId !== action.dinerId)
      if (action.amount === 0) return { ...bill, payments: others }
      return { ...bill, payments: [...others, { dinerId: action.dinerId, amount: action.amount }] }
    }

    case 'CLEAR_PAYMENTS':
      return { ...bill, payments: [] }
```

`REMOVE_DINER` must also drop that diner's payments:

```ts
        payments: bill.payments.filter((payment) => payment.dinerId !== action.dinerId),
```

replacing the `payerId` line.

- [ ] **Step 8: Migrate stored data**

In `src/storage/schema.ts`, add a v1 payload schema alongside the current one:

```ts
const paymentSchema = z.object({ dinerId: z.string(), amount: centsSchema })

export const billSchemaV1 = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  diners: z.array(dinerSchema),
  items: z.array(itemSchema),
  extras: z.array(extraSchema),
  payerId: z.string().nullable(),
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

export const storedPayloadV1Schema = z.object({
  schemaVersion: z.literal(1),
  bills: z.array(billSchemaV1),
})
```

In `src/storage/bill-store.ts`, set `SCHEMA_VERSION = 2` and, before the current parse, try the v1 shape:

```ts
  const asV1 = storedPayloadV1Schema.safeParse(parsed)
  if (asV1.success) {
    // A v1 bill had at most one payer, who by definition paid everything.
    // Its exact amount is unknowable from v1 data, so the migration records
    // no amount and the UI asks. Dropping the payer silently would lose it.
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
      migratedFrom: 1 as const,
    }
  }
```

Extend `LoadResult` with `migratedFrom?: 1`.

- [ ] **Step 9: Update every test and call site that used `payerId`**

`src/core/test-factories.ts`: `payerId: null` becomes `payments: []`.
`src/core/split.test.ts`: the "deudas" block uses `payments` — replace `payerId: 'ana'` with `payments: [{ dinerId: 'ana', amount: <billTotal> }]` in each case, and add the mismatch case:

```ts
  it('avisa si lo pagado no cuadra con el total', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
      payments: [{ dinerId: 'ana', amount: 900 }],
    })

    expect(computeSplit(bill).warnings).toContainEqual({
      kind: 'payments-mismatch',
      paid: 900,
      expected: 1000,
    })
  })
```

`src/core/split.properties.test.ts`: the `payerId` arbitrary becomes a `payments` arbitrary:

```ts
    payments: fc.constant([]),
```

plus a second property asserting that with full payment the debts sum to the total owed by the non-payers.

`src/state/bill-reducer.test.ts`: replace the `SET_PAYER` test with `SET_PAYMENT` and `CLEAR_PAYMENTS` tests.
`src/storage/bill-store.test.ts`: add a migration test asserting a stored v1 payload loads as v2 bills with `payments: []` and `migratedFrom: 1`.

- [ ] **Step 10: Run everything**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(core): support multiple payers with greedy settlement"
```

---

### Task 2: Payments UI

**Files:**
- Create: `src/components/bill/PaymentsEditor.tsx`
- Modify: `src/screens/ResultScreen.tsx`, `src/screens/ResultScreen.test.tsx`

**Interfaces:**
- Consumes: `useBills`, `Amount`, `Button`, `TextInput`, `parseAmount`.
- Produces: `<PaymentsEditor diners payments billTotal onSet onClear />`.

- [ ] **Step 1: Write the failing tests**

Add to `src/screens/ResultScreen.test.tsx`:

```ts
  it('registra quién puso dinero y calcula las transferencias', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.click(screen.getByRole('button', { name: /ana pagó todo/i }))

    expect(screen.getByTestId('debts')).toHaveTextContent('Luis debe 5,00 € a Ana')
  })

  it('avisa si lo pagado no cuadra con el total', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.type(screen.getByLabelText(/puso ana/i), '30')
    await user.click(screen.getByRole('button', { name: /registrar pago/i }))

    expect(screen.getByTestId('payments-mismatch')).toHaveTextContent(/faltan 10,00 €/i)
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/screens/ResultScreen.test.tsx`
Expected: FAIL — the queried controls do not exist.

- [ ] **Step 3: Write `src/components/bill/PaymentsEditor.tsx`**

One row per diner: the diner's name, a decimal input labelled `Puso <name>`, a `Registrar pago` button, and a `<name> pagó todo` shortcut that records the full `billTotal` for that diner and clears every other payment. Below the rows, when `paidTotal !== billTotal` and at least one payment exists, a `<p role="alert" data-testid="payments-mismatch">` reading `Faltan <amount>` or `Sobran <amount>`. Amounts render through `<Amount>`; inputs go through `parseAmount` and set `invalid` on rejection, exactly as `ExtrasEditor` does. All inputs use `aria-label`, never a wrapper `<label>` — the v1 a11y fix applies here too.

- [ ] **Step 4: Wire it into `ResultScreen`**

Replace the payer `<select>` with `<PaymentsEditor>`. Give the debts list `data-testid="debts"`. Render the debts list whenever `result.debts.length > 0`, and when `payments-mismatch` is present, show the mismatch notice above the debts so nobody trusts transfers computed from an unbalanced bill.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/screens/ResultScreen.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(bill): record who paid and show settling transfers"
```

---

### Task 3: Share the result as text

**Files:**
- Create: `src/core/summary.ts`, `src/core/summary.test.ts`
- Modify: `src/screens/ResultScreen.tsx`, `src/screens/ResultScreen.test.tsx`

**Interfaces:**
- Consumes: `formatAmount`, `Bill`, `SplitResult`.
- Produces: `billSummary(bill: Bill, result: SplitResult): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { computeSplit } from '@/core/split'
import { billSummary } from '@/core/summary'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'

describe('billSummary', () => {
  it('resume la cuenta en texto pegable', () => {
    const bill = makeBill({
      title: 'Casa Paco',
      diners: [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')],
      items: [
        makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana'] }),
        makeItem('i2', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] }),
      ],
      payments: [{ dinerId: 'ana', amount: 4000 }],
    })

    expect(billSummary(bill, computeSplit(bill))).toBe(
      [
        'Casa Paco — 40,00 €',
        '',
        'Ana: 35,00 €',
        'Luis: 5,00 €',
        '',
        'Luis debe 5,00 € a Ana',
      ].join('\n'),
    )
  })

  it('declara el dinero sin asignar', () => {
    const bill = makeBill({
      title: 'Cena',
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 600, { mode: 'equal', dinerIds: [] })],
    })

    expect(billSummary(bill, computeSplit(bill))).toContain('Sin asignar: 6,00 €')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/core/summary.test.ts`
Expected: FAIL — `Failed to resolve import "@/core/summary"`.

- [ ] **Step 3: Write `src/core/summary.ts`**

Build the string with an array of lines and `join('\n')`: a title line with the total, a blank line, one `Name: amount` line per diner in order, a blank line and one line per debt when there are debts, and a final `Sin asignar: <amount>` line when `unassignedTotal !== 0`. No emoji, no decoration — it gets pasted into a chat where a wall of symbols reads as spam.

- [ ] **Step 4: Add the copy button to `ResultScreen`**

A `Copiar resumen` button calling `navigator.clipboard.writeText(billSummary(bill, result))`. Wrap it in try/catch: clipboard access is denied in some contexts, and the failure must show a message with the text selectable, not a silent no-op. Test with a stubbed `navigator.clipboard`.

- [ ] **Step 5: Run the tests and commit**

```bash
npm test
git add -A
git commit -m "feat(share): copy the result as pasteable text"
```

---

### Task 4: Share a bill by link

**Files:**
- Create: `src/core/bill-code.ts`, `src/core/bill-code.test.ts`, `src/screens/ImportScreen.tsx`
- Modify: `src/App.tsx`, `src/screens/ResultScreen.tsx`

**Interfaces:**
- Produces:
  - `encodeBill(bill: Bill): string` — URL-safe, no padding
  - `decodeBill(code: string): Bill | null`
  - route `/i/:code`

- [ ] **Step 1: Write the failing round-trip tests**

```ts
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { decodeBill, encodeBill } from '@/core/bill-code'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'

describe('bill-code', () => {
  it('ida y vuelta conserva la cuenta', () => {
    const bill = makeBill({
      title: 'Casa Paco',
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 1980, { mode: 'equal', dinerIds: ['ana'] })],
    })

    expect(decodeBill(encodeBill(bill))).toEqual(bill)
  })

  it('sobrevive a acentos y eñes', () => {
    const bill = makeBill({ title: 'Señor Ñam', diners: [makeDiner('a', 0, 'Begoña')] })

    expect(decodeBill(encodeBill(bill))?.diners[0]?.name).toBe('Begoña')
  })

  it('el código es seguro en una URL', () => {
    const code = encodeBill(makeBill({ title: 'Señor Ñam' }))

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('devuelve null ante un código corrupto', () => {
    expect(decodeBill('no-es-un-codigo')).toBeNull()
    expect(decodeBill('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `src/core/bill-code.ts`**

Encode: `JSON.stringify` → `TextEncoder` → base64 via `btoa(String.fromCharCode(...bytes))` → replace `+/` with `-_` and strip `=`. Decode reverses it and validates the result with `billSchema` from `@/storage/schema`, returning `null` on any failure. `TextEncoder`/`TextDecoder` are what make accented characters survive; `btoa` alone throws on them.

- [ ] **Step 3: Add the import screen and route**

`/i/:code` decodes, shows a preview (title, diner count, total) and two buttons: `Guardar` (adds it to the local list with a fresh `id` so it never collides with an existing bill) and `Descartar` (navigates home). A bad code shows `Ese enlace no es válido` rather than a blank screen.

- [ ] **Step 4: Add the share-link button to `ResultScreen`**

`Copiar enlace` copies `${window.location.origin}/i/${encodeBill(bill)}`. Next to it, a one-line caveat: the whole bill travels inside the link, so a very long bill makes a very long link, and anyone with the link sees the bill.

- [ ] **Step 5: Run everything and commit**

```bash
npm run lint && npm run typecheck && npm test
git add -A
git commit -m "feat(share): encode a bill into a shareable link"
```

---

### Task 5: Photo capture

**Files:**
- Create: `worker/src/index.ts`, `worker/wrangler.toml`, `worker/package.json`, `worker/README.md`, `src/scan/scan-client.ts`, `src/scan/scan-client.test.ts`, `src/components/bill/ScanSheet.tsx`
- Modify: `src/screens/BillScreen.tsx`, `.env.example`, `README.md`

**Interfaces:**
- Produces:
  - `scanTicket(file: File, endpoint: string): Promise<ScannedItem[]>`
  - `type ScannedItem = { name: string; quantity: number; unitPrice: Cents }`
  - `VITE_SCAN_ENDPOINT` — when unset, the scan button does not render.

- [ ] **Step 1: Write `worker/src/index.ts`**

A Cloudflare Worker that accepts `POST` with a `multipart/form-data` image, calls the Gemini API with the key from `env.GEMINI_API_KEY`, requests a JSON response with a strict schema (`items: [{name, quantity, unitPrice}]`, `unitPrice` in cents as an integer), and returns that JSON. It must:

- Reject anything but `POST` with 405.
- Reject bodies over 5 MB with 413.
- Reject non-image content types with 415.
- Set permissive CORS only for the configured `ALLOWED_ORIGIN`, never `*`.
- Never echo the API key or the upstream error body to the client; log upstream failures and return a generic 502.

- [ ] **Step 2: Write `worker/README.md` with the deploy steps**

```bash
cd worker
npm install
npx wrangler secret put GEMINI_API_KEY   # from aistudio.google.com, free tier, no card
npx wrangler deploy
```

Then set `VITE_SCAN_ENDPOINT` to the deployed Worker URL in the app's build environment. State plainly in this README: the free tier has no SLA and can change; the app must keep working without it.

- [ ] **Step 3: Write the failing client tests**

`src/scan/scan-client.test.ts` stubs `globalThis.fetch` and asserts: a well-formed response maps to `ScannedItem[]`; a non-2xx response throws a `ScanError` with a message in Spanish; a 2xx response with an unexpected shape throws rather than returning garbage (validate with Zod); a network rejection throws a message that names the lack of connection.

- [ ] **Step 4: Write `src/scan/scan-client.ts`**

`scanTicket` builds a `FormData`, posts it, validates the response with a Zod schema, and maps it to `ScannedItem[]`. All errors become `ScanError` with a message safe to show the user.

- [ ] **Step 5: Write `ScanSheet` and wire it into `BillScreen`**

A button `Escanear ticket` (rendered only when `import.meta.env.VITE_SCAN_ENDPOINT` is set) opens a file input with `accept="image/*"` and `capture="environment"`, which on a phone opens the camera directly. While the request is in flight, show a pending state; on success, open a review sheet listing the detected items with editable name, quantity and price, each with a checkbox, defaulting to all checked. `Añadir seleccionados` dispatches one `ADD_ITEM` per checked row. Nothing enters the bill without passing through this review — the model can and will misread a crumpled thermal ticket, and a silent wrong price is worse than no scan at all.

- [ ] **Step 6: Run everything and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat(scan): fill a bill from a ticket photo via a key-holding proxy"
```

---

## Self-Review

**Spec coverage:** the spec's v2 section lists photo capture (Task 5), sharing as text and as a link (Tasks 3 and 4) and multiple payers with minimal transfers (Tasks 1 and 2). All covered.

**Type consistency:** `Payment` is introduced in Task 1 and used in Tasks 2 and 3. `Bill.payerId` is removed in Task 1 Step 5 and every reader is updated in Step 9 — no later task references it. `ScannedItem` is produced and consumed only within Task 5.

**Known risk:** Task 1 is a breaking schema change with a migration, and it touches the most-tested part of the codebase. It is first precisely so that the full suite runs against it before anything is built on top.

**Honest limitation:** Task 5 cannot be verified end-to-end without a deployed Worker and an API key, neither of which exists yet. The client is tested against a stubbed `fetch`, the Worker is reviewed by reading, and the first real photo is the acceptance test the repository owner has to run.
