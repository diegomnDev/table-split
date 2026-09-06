# table-split — Design

**Date:** 2026-09-06
**Status:** Approved for implementation (v1); v2 scope defined, to be built after v1 ships.

## Problem

Splitting a restaurant bill among friends is done today with a calculator, a
notes app, or mental arithmetic. It is slow at the table, error-prone with
shared dishes, and nobody can check the result afterwards.

`table-split` is a mobile-first web app that takes a bill, a list of diners, and
who ate what, and produces an exact per-person amount. It works offline, stores
nothing on a server, and costs nothing to run.

## Goals

- Enter a bill by hand in under a minute at the table.
- Handle items eaten by one person, by a subset, or by everyone.
- Handle multi-unit items split by units (three beers: two mine, one yours).
- Produce amounts that always sum exactly to the bill total.
- Work with no network connection.
- Cost €0 to build, host and run — no credit card anywhere in the chain.

## Non-goals (v1)

- Accounts, login, or any server-side user data.
- Multiple payers or minimal-transfer debt settlement. v1 supports at most one
  payer who paid the whole bill.
- Currencies other than EUR.
- Photo/OCR capture of the ticket. Designed for, built in v2.
- Sharing a result by link or message. v2.

## Users and context

One person at a restaurant table, on a phone, possibly with no signal
(basements, rural areas), with other diners waiting. Speed and legibility beat
completeness. The app must never lose a bill in progress.

## Stack

Latest stable versions as of 2026-09-06, verified with `npm view`:

| Package | Version | Role |
|---|---|---|
| `react`, `react-dom` | 19.2.8 | UI |
| `vite` | 8.2.2 | Build and dev server |
| `@vitejs/plugin-react` | 6.1.1 | React support in Vite |
| `typescript` | 7.0.2 | Types (native Go compiler) |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | Styling |
| `shadcn` (CLI) | 4.21.0 | Component source generation |
| `@biomejs/biome` | 2.5.12 | Lint + format (replaces ESLint + Prettier) |
| `vitest` | 5.0.0 | Tests |
| `fast-check` | 4.9.0 | Property-based testing |
| `vite-plugin-pwa` | 1.3.0 | Service worker, offline, installable |
| `react-router` | 8.3.1 | Routing (`react-router-dom` is legacy) |
| `zod` | 4.5.4 | Validation at the storage boundary |
| `nanoid` | 6.0.1 | ID generation |

Notes:

- Tailwind 4 has no `tailwind.config.js` and no PostCSS step. It installs as a
  Vite plugin and the theme is declared in CSS with `@theme`.
- TypeScript 7 is the native compiler rewrite. If tooling misbehaves in an
  unexplained way, downgrading to 5.x is the first diagnostic step.
- shadcn copies component source into the repo; it is not a runtime dependency.

Hosting: Cloudflare Pages (free tier, static output).

## Architecture

```
src/
  core/                 # Pure TypeScript. No React, no DOM.
    money.ts            # Cents type, parse, format
    split.ts            # computeSplit(bill) -> SplitResult
    types.ts            # Bill, Item, Diner, Extra, Assignment
  storage/
    bill-store.ts       # localStorage, schema version, migrations, Zod validation
  state/
    bill-reducer.ts     # Pure reducer over Bill
    use-bills.ts        # React binding for the store
  components/
    ui/                 # shadcn-generated, edited freely
    bill/               # ItemRow, DinerChips, TotalBar, AssignSheet
  screens/
    BillsScreen.tsx     # saved bills
    BillScreen.tsx      # items and diners for one bill
    ResultScreen.tsx    # per-person amounts and debts
  styles/
    theme.css           # @theme — every visual token
  App.tsx
```

### Layering rules

1. `src/core/` imports nothing from React or the DOM. All money logic lives
   here and is testable without mounting a component.
2. No component contains a literal colour, radius, font size or spacing value.
   Only theme tokens (`bg-paper`, `text-ink`, `font-receipt`). Restyling means
   editing `theme.css` and nothing else. This is a hard rule, enforced in
   review: the visual identity is expected to change in v2 or v3.
3. Components in `components/bill/` receive data and emit events. They never
   compute money. The only place that computes money is `core/split.ts`.

### Routing

`react-router` 8, three routes:

- `/` — list of saved bills
- `/b/:id` — the bill: items, diners, assignment
- `/b/:id/resultado` — the result

Routing rather than local view state so the Android back button behaves
correctly inside the installed PWA.

## Data model

```ts
type Cents = number  // always an integer; never a float

type Diner = {
  id: string
  name: string
  order: number      // creation order; used as deterministic tie-break
}

type Assignment =
  | { mode: 'equal'; dinerIds: string[] }
  | { mode: 'units'; units: Record<string, number> }  // dinerId -> units

type Item = {
  id: string
  name: string
  unitPrice: Cents
  quantity: number
  assignment: Assignment
}

type Extra = {
  id: string
  label: string
  amount: Cents      // positive for tip/cover, negative for discount
}

type Bill = {
  id: string
  title: string
  createdAt: number
  diners: Diner[]
  items: Item[]
  extras: Extra[]
  payerId: string | null   // null = each diner pays their own share
}
```

### Why integer cents

`0.1 + 0.2 === 0.30000000000000004` in JavaScript. Over a 20-item bill that
error accumulates into a total that disagrees with the printed ticket by a cent
or two, which destroys trust in a money app. Every amount is an integer number
of cents. Formatting to `"12,34 €"` happens only at render time.

## Calculation

One pure function:

```ts
function computeSplit(bill: Bill): SplitResult

type SplitResult = {
  perDiner: {
    dinerId: string
    itemsTotal: Cents
    extrasShare: Cents
    total: Cents
  }[]
  billTotal: Cents        // every item + every extra, i.e. the printed ticket
  unassignedTotal: Cents  // money not attributable to any diner
  debts: { from: string; to: string; amount: Cents }[]
  warnings: Warning[]
}

type Warning =
  | { kind: 'unassigned-item'; itemId: string }
  | { kind: 'units-mismatch'; itemId: string; assigned: number; expected: number }
  | { kind: 'negative-share'; dinerId: string; amount: Cents }
  | { kind: 'no-diners' }
```

### Rules

1. **Items.** Each item distributes `unitPrice × quantity` among its assignees.
   `equal` splits evenly; `units` splits in proportion to each diner's units.
2. **Extras.** Every extra is split equally among *all* diners, whether or not
   they consumed anything. Discounts are negative extras and follow the same
   rule.
3. **Rounding — largest remainder method.** Integer-divide the amount, then
   hand the leftover cents out one at a time to the diners with the largest
   fractional remainder. Ties break by lowest `Diner.order`. This makes the
   rounding an explicit, visible decision rather than a lost cent.
4. **Invariant.** `sum(perDiner.total) + unassignedTotal === billTotal`,
   exactly, for every possible bill. This is the property the test suite exists
   to defend. When every item has at least one assignee and there is at least
   one diner, `unassignedTotal` is `0` and the invariant reduces to
   `sum(perDiner.total) === billTotal`.
5. **Unassigned items are never silently dropped and never silently
   redistributed.** An item with no assignee counts toward `billTotal`, is
   accumulated into `unassignedTotal`, and produces an `unassigned-item`
   warning shown in the UI. The result screen displays the unassigned amount
   explicitly, so a bill never appears to balance by hiding money and never
   charges someone for a dish nobody claimed.
6. **Units that do not add up** to `quantity` produce a `units-mismatch`
   warning. The assigned units still split the full item amount in proportion,
   so the invariant holds.
7. **Negative shares are allowed.** A discount larger than someone's
   consumption leaves them with a credit, shown as such, with a
   `negative-share` warning. Clamping to zero would break the invariant and
   force a redistribution the user did not ask for.
8. **Debts.** If `payerId` is set, every other diner owes their `total` to the
   payer, and the payer's own debt entry is omitted. If `payerId` is `null`,
   `debts` is empty. No transfer minimisation — v1 has at most one payer.
9. **No diners.** `perDiner` is empty, `billTotal` still reflects the items and
   extras, `unassignedTotal === billTotal`, and a `no-diners` warning is
   produced. Extras cannot be split with nobody to split them among, so they
   fall into `unassignedTotal` in this case only.

## Persistence

- Single `localStorage` key: `tablesplit:bills`. The pre-rename key
  `tablespit:bills` is still read as a fallback, and retired on the next save,
  so the rename costs nobody the bills already on their phone.
- Stored shape: `{ schemaVersion: number, bills: Bill[] }`.
- On read: parse, then validate with Zod. On validation failure, start empty and
  surface a non-blocking notice — never crash to a blank screen. The JSON was
  written by a previous version of this same app, which makes it exactly as
  untrustworthy as a third-party API.
- On schema version mismatch, run migrations in order.
- Writes are debounced ~300 ms, not per keystroke.
- Known limitation, stated in the UI: clearing browser data or using a private
  window loses saved bills. v1 has no other copy.

## UI flow (mobile-first)

**`/` — Bills.** List of saved bills, newest first, each showing title, date,
diner count and total. Primary action: "Nueva cuenta". Swipe or long-press to
delete, with undo.

**`/b/:id` — Bill.** Three stacked zones on one scrollable screen:

1. Diners as a horizontal chip row. Add by typing a name; tap a chip to rename
   or remove.
2. Item list. Each row: name, quantity, price, and the initials of whoever it is
   assigned to. Tapping a row opens the assignment sheet.
3. A sticky bottom bar with the running total and a button to the result.

Adding an item is a single always-visible input at the bottom of the list, so
adding several in a row needs no extra taps.

**Assignment sheet.** A bottom sheet. Diner chips with a toggle each — tap to
include. If `quantity > 1`, each selected diner also gets a stepper for units.
Two shortcuts: "Todos" and "Solo yo".

**`/b/:id/resultado` — Result.** One row per diner with the amount, expandable
to show which items produced it. If a payer is set, the row reads "debe X a
Ana". Warnings appear at the top, in plain language, never as silent failures.

### Visual identity

Direction "thermal ticket": monospaced type, warm paper background, dashed
rules, near-black ink. Chosen as a starting point, not a final identity — the
tokenised theme exists so this can be replaced cheaply in a later version.

## Error handling

- Corrupt or unreadable stored data: start empty, notify, do not crash.
- Price input accepts `12,50` and `12.50`; rejects anything else with inline
  feedback rather than silently coercing to `0`.
- Every state that hides money from the user (unassigned item, mismatched units,
  negative share) is a warning surfaced in the UI, not a console message.
- The app has no network calls in v1, so there are no network failure modes.

## Testing

- `core/` is tested with Vitest, aiming at full coverage of `split.ts` and
  `money.ts`. This is where bugs cost real money.
- Property-based tests with `fast-check` generate arbitrary bills (any number of
  diners, items, quantities, extras including negative ones) and assert the
  invariant `sum(perDiner.total) + unassignedTotal === billTotal` on every one.
  This is the main defence: it finds edge cases nobody would write by hand.
- Worked examples as unit tests: the three-way €10 tip (3,33 / 3,33 / 3,34), a
  discount exceeding the total, an item assigned to nobody, units that do not
  add up.
- `bill-reducer.ts` is tested as a pure function.
- Component tests only where logic is non-obvious (the assignment sheet). No
  snapshot tests — the visual identity is expected to change.

## Development workflow

- TDD on `core/`: the failing test comes first, always.
- Biome for lint and format, one `biome.json`, run in CI and before commit.
- `tsc --noEmit` (TypeScript 7) in CI.
- GitHub Actions: install, lint, typecheck, test, build on every push.
- Deploy: Cloudflare Pages, static output from `vite build`.
- Conventional Commits.

## v2 scope (defined now, built after v1)

**Photo capture of the ticket.** Verified as achievable at €0:

- Google's Gemini API free tier: no card required, ~10 requests/minute,
  ~1500/day. Because the user is in the EEA, Google's paid-service data terms
  apply to the free tier, so submitted content is not used to train models —
  the relevant clause is quoted in the research notes below.
- The API key cannot live in the browser. A Cloudflare Worker (free plan, no
  card, 100k requests/day) holds the key and proxies the call.
- The model returns structured JSON (items, quantities, prices) directly, which
  is why a vision model beats a raw OCR engine here: PaddleOCR or Tesseract
  return text and leave the receipt-line parser to be written and maintained
  per restaurant chain.
- Fallback if the free tier disappears: swap the upstream URL in the Worker for
  OpenRouter's free vision models. Manual entry must keep working regardless —
  the photo is a shortcut, never a dependency.

**Sharing.** Copy the result as WhatsApp-pasteable text; optionally encode a
bill in a URL.

**Multiple payers.** Record who paid what, and compute minimal transfers.

### Research notes (2026-09-06)

Google Gemini API terms, verbatim:

> "If you're in the European Economic Area, Switzerland, or the United Kingdom,
> the terms under 'How Google uses Your Data' in 'Paid Services' apply to all
> Services, including Google AI Studio and unpaid quota in the Gemini API, even
> though they are offered free of charge."

Options priced and rejected for v1: Mistral OCR ($1 per 1000 pages, no free
tier), Tabscanner (200 free credits/month), Mindee (14-day trial), Cloudflare
Workers AI (free but a weak vision catalogue sharing a 10k neuron/day budget).

## Open questions for review

These were decided by assumption so implementation could proceed, and are worth
revisiting:

1. Negative shares are allowed and shown as credit. Alternative: clamp to zero
   and redistribute.
2. Extras split equally among all diners. Alternative: proportional to
   consumption, which arguably fits tipping better.
3. Resolved: the project is `table-split`. It was created as `table-spit`, a
   typo; the code, the docs and the storage key were renamed on 2026-09-06.
