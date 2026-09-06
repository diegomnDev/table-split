# table-split v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a mobile-first, offline-capable web app that splits a restaurant bill among diners and produces per-person amounts that always reconcile exactly with the printed ticket.

**Architecture:** A pure TypeScript core (`src/core/`) owns every money calculation and knows nothing about React. A `localStorage` store validated with Zod owns persistence. React screens read from a pure reducer and render the core's output. All visual values live in a single Tailwind 4 `@theme` block so the identity can be replaced without touching components.

**Tech Stack:** Vite 8.2.2, React 19.2.8, TypeScript 7.0.2, Tailwind CSS 4.3.3, Biome 2.5.12, Vitest 5.0.0, fast-check 4.9.0, react-router 8.3.1, Zod 4.5.4, nanoid 6.0.1, vite-plugin-pwa 1.3.0.

**Spec:** `docs/superpowers/specs/2026-09-06-table-split-design.md`

## Global Constraints

- Every monetary value is an integer number of cents (`type Cents = number`). Floats never represent money, not even briefly.
- `src/core/**` must not import React, the DOM, or anything from `src/components/`, `src/screens/`, `src/state/` or `src/storage/`.
- No component may contain a literal colour, radius, font size or spacing value. Only theme tokens. `bg-[#f7f5ef]` is a review rejection; `bg-paper` is correct.
- Invariant, defended by property tests: `sum(perDiner.total) + unassignedTotal === billTotal` for every possible bill.
- Rounding uses the largest remainder method. Ties break by lowest `Diner.order`.
- Locale is Spanish (`es-ES`), currency EUR, decimal comma. All user-facing copy is in Spanish.
- Package versions are pinned exactly to the versions listed in Tech Stack.
- Commits follow Conventional Commits. No AI or assistant attribution in any commit message, branch name or documentation.

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `biome.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/theme.css`, `src/vite-env.d.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: working `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`. Path alias `@/` resolves to `src/`.

- [ ] **Step 1: Create the project and install exact versions**

```bash
cd /Users/diegomn/workspace/personal/table-split
npm init -y
npm pkg set name="table-split" private=true type="module" version="0.1.0"
npm i react@19.2.8 react-dom@19.2.8 react-router@8.3.1 zod@4.5.4 nanoid@6.0.1
npm i -D vite@8.2.2 @vitejs/plugin-react@6.1.1 typescript@7.0.2 \
  tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 \
  @biomejs/biome@2.5.12 vitest@5.0.0 fast-check@4.9.0 \
  vite-plugin-pwa@1.3.0 jsdom @types/react @types/react-dom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'table-split',
        short_name: 'table-split',
        description: 'Divide la cuenta del restaurante sin calculadora',
        lang: 'es-ES',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f5ef',
        theme_color: '#14110c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

`noUncheckedIndexedAccess` is deliberate: the rounding code indexes arrays by position and the compiler should force those reads to be checked.

- [ ] **Step 4: Write `index.html`, `src/main.tsx`, `src/test-setup.ts` and a placeholder `src/App.tsx`**

`index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>table-split</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/styles/theme.css'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

`src/App.tsx`:

```tsx
export default function App() {
  return <p className="p-4 font-receipt text-ink">table-split</p>
}
```

- [ ] **Step 5: Write `src/styles/theme.css` with every visual token**

Tailwind 4 has no `tailwind.config.js`. The theme is declared in CSS and every token below becomes a utility class (`bg-paper`, `text-ink`, `font-receipt`, `rounded-ticket`).

```css
@import "tailwindcss";

@theme {
  --color-paper: #f7f5ef;
  --color-paper-sunk: #efece3;
  --color-ink: #14110c;
  --color-ink-soft: #6b6559;
  --color-ink-faint: #b9b2a1;
  --color-rule: #cdc6b5;
  --color-accent: #b3402b;
  --color-credit: #2f6f4f;

  --font-receipt: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --radius-ticket: 0.125rem;

  --text-ticket-xs: 0.625rem;
  --text-ticket-sm: 0.75rem;
  --text-ticket-base: 0.8125rem;
  --text-ticket-lg: 0.9375rem;
  --text-ticket-xl: 1.25rem;

  --tracking-ticket: 0.08em;
}

@layer base {
  html {
    background-color: var(--color-paper);
    color-scheme: light;
  }

  body {
    margin: 0;
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-receipt);
    -webkit-tap-highlight-color: transparent;
  }

  /* Tabular figures keep price columns aligned. Non-negotiable in a money UI. */
  .tabular {
    font-variant-numeric: tabular-nums;
  }
}
```

- [ ] **Step 6: Initialise Biome and set the scripts**

```bash
npx @biomejs/biome init
npm pkg set scripts.dev="vite" scripts.build="vite build" scripts.preview="vite preview" \
  scripts.test="vitest run" scripts.test:watch="vitest" \
  scripts.lint="biome check ." scripts.lint:fix="biome check --write ." \
  scripts.typecheck="tsc --noEmit"
```

Then edit the generated `biome.json` so its `files.includes` excludes build output and generated component source:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.12/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!dist/**", "!dev-dist/**", "!coverage/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

- [ ] **Step 7: Verify the whole toolchain runs**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all three succeed. `npm run build` writes `dist/`.

If `tsc` from TypeScript 7 fails with an error that does not name your own code, downgrade to `typescript@5.9.3` and record it in the commit body — the native compiler is new and this is the first diagnostic step, per the spec.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + tailwind 4 + biome + vitest"
```

---

### Task 2: Money primitives

**Files:**
- Create: `src/core/money.ts`
- Test: `src/core/money.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Cents = number`
  - `parseAmount(input: string): Cents | null`
  - `formatAmount(cents: Cents): string`
  - `distribute(amount: Cents, weights: number[]): Cents[]`

`distribute` is the heart of the app: every split in the codebase goes through it, which is why it is one small pure function with exhaustive tests rather than logic scattered across call sites.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { distribute, formatAmount, parseAmount } from '@/core/money'

describe('parseAmount', () => {
  it('acepta coma decimal', () => {
    expect(parseAmount('12,50')).toBe(1250)
  })

  it('acepta punto decimal', () => {
    expect(parseAmount('12.50')).toBe(1250)
  })

  it('acepta enteros, espacios y el símbolo de euro', () => {
    expect(parseAmount(' 7 € ')).toBe(700)
  })

  it('acepta un solo decimal', () => {
    expect(parseAmount('3,5')).toBe(350)
  })

  it('acepta negativos para descuentos', () => {
    expect(parseAmount('-4,20')).toBe(-420)
  })

  it('rechaza basura en vez de convertirla en cero', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('12,345')).toBeNull()
    expect(parseAmount('1,2,3')).toBeNull()
  })

  it('no pierde céntimos por coma flotante', () => {
    expect(parseAmount('0,29')).toBe(29)
    expect(parseAmount('1,10')).toBe(110)
    expect(parseAmount('8,70')).toBe(870)
  })
})

describe('formatAmount', () => {
  it('formatea en es-ES con dos decimales', () => {
    expect(formatAmount(1250)).toBe('12,50 €')
  })

  it('rellena los céntimos a dos dígitos', () => {
    expect(formatAmount(1205)).toBe('12,05 €')
    expect(formatAmount(1200)).toBe('12,00 €')
  })

  it('formatea el cero y los negativos', () => {
    expect(formatAmount(0)).toBe('0,00 €')
    expect(formatAmount(-420)).toBe('-4,20 €')
  })

  it('agrupa los millares', () => {
    expect(formatAmount(123456)).toBe('1.234,56 €')
  })
})

describe('distribute', () => {
  it('reparte exacto cuando divide sin resto', () => {
    expect(distribute(900, [1, 1, 1])).toEqual([300, 300, 300])
  })

  it('da el céntimo sobrante al de mayor resto, con desempate por posición', () => {
    expect(distribute(1000, [1, 1, 1])).toEqual([334, 333, 333])
  })

  it('reparte dos céntimos sobrantes a los dos primeros', () => {
    expect(distribute(1001, [1, 1, 1])).toEqual([334, 334, 333])
  })

  it('respeta los pesos', () => {
    expect(distribute(1050, [2, 1])).toEqual([700, 350])
  })

  it('conserva la suma con pesos desiguales y resto', () => {
    const parts = distribute(1000, [3, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('reparte negativos conservando la suma', () => {
    expect(distribute(-1000, [1, 1, 1])).toEqual([-334, -333, -333])
  })

  it('devuelve vacío sin destinatarios', () => {
    expect(distribute(1000, [])).toEqual([])
  })

  it('devuelve ceros si todos los pesos son cero', () => {
    expect(distribute(1000, [0, 0])).toEqual([0, 0])
  })

  it('ignora a los de peso cero al repartir', () => {
    expect(distribute(1000, [1, 0, 1])).toEqual([500, 0, 500])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/core/money.test.ts`
Expected: FAIL — `Failed to resolve import "@/core/money"`.

- [ ] **Step 3: Write the implementation**

```ts
/** An integer number of euro cents. Money is never a float in this codebase. */
export type Cents = number

const AMOUNT_PATTERN = /^-?\d+(?:[.,]\d{1,2})?$/

/**
 * Parses user input into cents. Accepts both `12,50` and `12.50`, tolerates
 * spaces and a euro sign, and returns null for anything else rather than
 * silently coercing bad input to zero.
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[\s€]/g, '')
  if (!AMOUNT_PATTERN.test(cleaned)) return null

  const negative = cleaned.startsWith('-')
  const digits = negative ? cleaned.slice(1) : cleaned
  const [whole = '0', fraction = ''] = digits.split(/[.,]/)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

  return negative ? -cents : cents
}

/**
 * Formats cents as Spanish currency. Built by string surgery on integers
 * rather than dividing by 100, so no float ever touches a displayed amount.
 */
export function formatAmount(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const whole = Math.trunc(absolute / 100).toLocaleString('es-ES')
  const fraction = String(absolute % 100).padStart(2, '0')

  return `${sign}${whole},${fraction} €`
}

/**
 * Splits `amount` proportionally to `weights` using the largest remainder
 * method, so the parts always sum back to `amount` exactly. Leftover cents go
 * to the largest fractional remainders; ties break by lowest index, and
 * callers pass diners in `order`, which makes the outcome deterministic.
 */
export function distribute(amount: Cents, weights: number[]): Cents[] {
  if (weights.length === 0) return []

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) return weights.map(() => 0)

  const sign = amount < 0 ? -1 : 1
  const absolute = Math.abs(amount)

  const exact = weights.map((weight) => (absolute * weight) / totalWeight)
  const parts = exact.map((value) => Math.floor(value))
  const distributed = parts.reduce((sum, part) => sum + part, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (let given = 0; given < absolute - distributed; given += 1) {
    const target = byRemainder[given]
    if (!target) break
    parts[target.index] = (parts[target.index] ?? 0) + 1
  }

  return parts.map((part) => part * sign)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/core/money.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/money.ts src/core/money.test.ts
git commit -m "feat(core): add integer-cent money primitives and largest-remainder distribution"
```

---

### Task 3: Domain types

**Files:**
- Create: `src/core/types.ts`

**Interfaces:**
- Consumes: `Cents` from `@/core/money`.
- Produces: `Diner`, `Assignment`, `Item`, `Extra`, `Bill`, `Warning`, `DinerSplit`, `Debt`, `SplitResult`.

This task has no tests: it declares types only, and the compiler is the test. It exists as its own task because every later task imports from it.

- [ ] **Step 1: Write the types**

```ts
import type { Cents } from '@/core/money'

export type Diner = {
  id: string
  name: string
  /** Creation order. Used as the deterministic tie-break when rounding. */
  order: number
}

export type Assignment =
  | { mode: 'equal'; dinerIds: string[] }
  | { mode: 'units'; units: Record<string, number> }

export type Item = {
  id: string
  name: string
  unitPrice: Cents
  quantity: number
  assignment: Assignment
}

/** Positive for a tip or cover charge, negative for a discount. */
export type Extra = {
  id: string
  label: string
  amount: Cents
}

export type Bill = {
  id: string
  title: string
  createdAt: number
  diners: Diner[]
  items: Item[]
  extras: Extra[]
  /** null means everyone pays their own share directly. */
  payerId: string | null
}

export type Warning =
  | { kind: 'unassigned-item'; itemId: string }
  | { kind: 'units-mismatch'; itemId: string; assigned: number; expected: number }
  | { kind: 'negative-share'; dinerId: string; amount: Cents }
  | { kind: 'no-diners' }

export type DinerSplit = {
  dinerId: string
  itemsTotal: Cents
  extrasShare: Cents
  total: Cents
}

export type Debt = {
  from: string
  to: string
  amount: Cents
}

export type SplitResult = {
  perDiner: DinerSplit[]
  /** Every item plus every extra: what the printed ticket says. */
  billTotal: Cents
  /** Money that belongs to no diner. Shown, never hidden or redistributed. */
  unassignedTotal: Cents
  debts: Debt[]
  warnings: Warning[]
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat(core): declare bill domain types"
```

---

### Task 4: The split calculation

**Files:**
- Create: `src/core/split.ts`
- Test: `src/core/split.test.ts`

**Interfaces:**
- Consumes: `distribute` from `@/core/money`; all types from `@/core/types`.
- Produces: `computeSplit(bill: Bill): SplitResult`, and the test helpers `makeBill`, `makeDiner`, `makeItem` exported from `src/core/test-factories.ts`.

- [ ] **Step 1: Write the test factories**

Create `src/core/test-factories.ts`. These are shared by this task's tests and Task 5's property tests, so they live in their own module rather than being copied.

```ts
import type { Assignment, Bill, Diner, Extra, Item } from '@/core/types'

export function makeDiner(id: string, order: number, name = id): Diner {
  return { id, name, order }
}

export function makeItem(
  id: string,
  unitPrice: number,
  assignment: Assignment,
  quantity = 1,
  name = id,
): Item {
  return { id, name, unitPrice, quantity, assignment }
}

export function makeExtra(id: string, amount: number, label = id): Extra {
  return { id, label, amount }
}

export function makeBill(partial: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    title: 'Cena',
    createdAt: 0,
    diners: [],
    items: [],
    extras: [],
    payerId: null,
    ...partial,
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/core/split.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeSplit } from '@/core/split'
import { makeBill, makeDiner, makeExtra, makeItem } from '@/core/test-factories'

const ana = makeDiner('ana', 0)
const luis = makeDiner('luis', 1)
const mar = makeDiner('mar', 2)

function totalOf(dinerId: string, result: ReturnType<typeof computeSplit>) {
  return result.perDiner.find((d) => d.dinerId === dinerId)?.total ?? 0
}

describe('computeSplit — ítems', () => {
  it('carga un ítem individual a su comensal', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 2450, { mode: 'equal', dinerIds: ['ana'] })],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(2450)
    expect(totalOf('luis', result)).toBe(0)
    expect(result.billTotal).toBe(2450)
    expect(result.unassignedTotal).toBe(0)
  })

  it('reparte a partes iguales entre los marcados', () => {
    const bill = makeBill({
      diners: [ana, luis, mar],
      items: [makeItem('i1', 1980, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(990)
    expect(totalOf('luis', result)).toBe(990)
    expect(totalOf('mar', result)).toBe(0)
  })

  it('multiplica por la cantidad', () => {
    const bill = makeBill({
      diners: [ana],
      items: [makeItem('i1', 350, { mode: 'equal', dinerIds: ['ana'] }, 3)],
    })

    expect(computeSplit(bill).billTotal).toBe(1050)
  })

  it('reparte por unidades', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 350, { mode: 'units', units: { ana: 2, luis: 1 } }, 3)],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(700)
    expect(totalOf('luis', result)).toBe(350)
  })

  it('ignora a comensales que ya no existen en la cuenta', () => {
    const bill = makeBill({
      diners: [ana],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'fantasma'] })],
    })

    expect(totalOf('ana', computeSplit(bill))).toBe(1000)
  })
})

describe('computeSplit — extras', () => {
  it('reparte la propina a partes iguales entre todos, coman o no', () => {
    const bill = makeBill({
      diners: [ana, luis, mar],
      items: [makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana'] })],
      extras: [makeExtra('e1', 1000, 'Propina')],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(3334)
    expect(totalOf('luis', result)).toBe(333)
    expect(totalOf('mar', result)).toBe(333)
    expect(result.billTotal).toBe(4000)
  })

  it('trata el descuento como un extra negativo', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 2000, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
      extras: [makeExtra('e1', -400, 'Cupón')],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(800)
    expect(totalOf('luis', result)).toBe(800)
    expect(result.billTotal).toBe(1600)
  })
})

describe('computeSplit — avisos', () => {
  it('no reparte un ítem sin asignar y lo declara', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [
        makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] }),
        makeItem('i2', 600, { mode: 'equal', dinerIds: [] }),
      ],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(1000)
    expect(totalOf('luis', result)).toBe(0)
    expect(result.unassignedTotal).toBe(600)
    expect(result.billTotal).toBe(1600)
    expect(result.warnings).toContainEqual({ kind: 'unassigned-item', itemId: 'i2' })
  })

  it('avisa cuando las unidades no suman la cantidad', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 500, { mode: 'units', units: { ana: 1 } }, 3)],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(1500)
    expect(result.warnings).toContainEqual({
      kind: 'units-mismatch',
      itemId: 'i1',
      assigned: 1,
      expected: 3,
    })
  })

  it('permite saldo negativo y lo avisa', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['luis'] })],
      extras: [makeExtra('e1', -1600, 'Cupón')],
    })
    const result = computeSplit(bill)

    expect(totalOf('ana', result)).toBe(-800)
    expect(result.warnings).toContainEqual({ kind: 'negative-share', dinerId: 'ana', amount: -800 })
  })

  it('sin comensales, todo queda sin asignar', () => {
    const bill = makeBill({
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })],
      extras: [makeExtra('e1', 200)],
    })
    const result = computeSplit(bill)

    expect(result.perDiner).toEqual([])
    expect(result.billTotal).toBe(1200)
    expect(result.unassignedTotal).toBe(1200)
    expect(result.warnings).toContainEqual({ kind: 'no-diners' })
  })
})

describe('computeSplit — deudas', () => {
  it('sin pagador no hay deudas', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] })],
    })

    expect(computeSplit(bill).debts).toEqual([])
  })

  it('con pagador, los demás le deben su parte', () => {
    const bill = makeBill({
      diners: [ana, luis, mar],
      items: [makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana', 'luis', 'mar'] })],
      payerId: 'ana',
    })

    expect(computeSplit(bill).debts).toEqual([
      { from: 'luis', to: 'ana', amount: 1000 },
      { from: 'mar', to: 'ana', amount: 1000 },
    ])
  })

  it('omite a quien no debe nada', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana'] })],
      payerId: 'ana',
    })

    expect(computeSplit(bill).debts).toEqual([])
  })

  it('un saldo negativo se convierte en deuda del pagador', () => {
    const bill = makeBill({
      diners: [ana, luis],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: ['luis'] })],
      extras: [makeExtra('e1', -1600, 'Cupón')],
      payerId: 'luis',
    })

    expect(computeSplit(bill).debts).toEqual([{ from: 'luis', to: 'ana', amount: 800 }])
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/core/split.test.ts`
Expected: FAIL — `Failed to resolve import "@/core/split"`.

- [ ] **Step 4: Write the implementation**

```ts
import { type Cents, distribute } from '@/core/money'
import type { Bill, Debt, DinerSplit, Item, SplitResult, Warning } from '@/core/types'

/** Weight per diner for one item, in the diner order of `bill.diners`. */
function weightsFor(item: Item, dinerIds: string[]): number[] {
  if (item.assignment.mode === 'equal') {
    const selected = new Set(item.assignment.dinerIds)
    return dinerIds.map((id) => (selected.has(id) ? 1 : 0))
  }

  const { units } = item.assignment
  return dinerIds.map((id) => Math.max(0, units[id] ?? 0))
}

function assignedUnits(item: Item): number {
  if (item.assignment.mode !== 'units') return item.quantity
  return Object.values(item.assignment.units).reduce((sum, units) => sum + Math.max(0, units), 0)
}

/**
 * Turns a bill into per-diner amounts.
 *
 * Guarantees, for every possible input:
 *   sum(perDiner.total) + unassignedTotal === billTotal
 *
 * Money that belongs to nobody lands in `unassignedTotal` and raises a
 * warning. It is never quietly spread over the diners.
 */
export function computeSplit(bill: Bill): SplitResult {
  const diners = [...bill.diners].sort((a, b) => a.order - b.order)
  const dinerIds = diners.map((diner) => diner.id)
  const warnings: Warning[] = []

  const itemsTotals: Cents[] = dinerIds.map(() => 0)
  const extrasShares: Cents[] = dinerIds.map(() => 0)
  let billTotal = 0
  let unassignedTotal = 0

  if (diners.length === 0) warnings.push({ kind: 'no-diners' })

  for (const item of bill.items) {
    const amount = item.unitPrice * item.quantity
    billTotal += amount

    if (item.assignment.mode === 'units') {
      const assigned = assignedUnits(item)
      if (assigned !== item.quantity) {
        warnings.push({
          kind: 'units-mismatch',
          itemId: item.id,
          assigned,
          expected: item.quantity,
        })
      }
    }

    const weights = weightsFor(item, dinerIds)
    const hasOwner = weights.some((weight) => weight > 0)

    if (!hasOwner) {
      unassignedTotal += amount
      warnings.push({ kind: 'unassigned-item', itemId: item.id })
      continue
    }

    const parts = distribute(amount, weights)
    parts.forEach((part, index) => {
      itemsTotals[index] = (itemsTotals[index] ?? 0) + part
    })
  }

  // Each extra is split separately rather than as a lump sum, so a tip and a
  // discount each round on their own and stay individually explainable.
  const equalWeights = dinerIds.map(() => 1)
  for (const extra of bill.extras) {
    billTotal += extra.amount

    if (diners.length === 0) {
      unassignedTotal += extra.amount
      continue
    }

    const parts = distribute(extra.amount, equalWeights)
    parts.forEach((part, index) => {
      extrasShares[index] = (extrasShares[index] ?? 0) + part
    })
  }

  const perDiner: DinerSplit[] = diners.map((diner, index) => {
    const itemsTotal = itemsTotals[index] ?? 0
    const extrasShare = extrasShares[index] ?? 0
    return { dinerId: diner.id, itemsTotal, extrasShare, total: itemsTotal + extrasShare }
  })

  for (const share of perDiner) {
    if (share.total < 0) {
      warnings.push({ kind: 'negative-share', dinerId: share.dinerId, amount: share.total })
    }
  }

  const debts: Debt[] = []
  if (bill.payerId !== null) {
    const payerId = bill.payerId
    for (const share of perDiner) {
      if (share.dinerId === payerId || share.total === 0) continue
      debts.push(
        share.total > 0
          ? { from: share.dinerId, to: payerId, amount: share.total }
          : { from: payerId, to: share.dinerId, amount: -share.total },
      )
    }
  }

  return { perDiner, billTotal, unassignedTotal, debts, warnings }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/core/split.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 6: Commit**

```bash
git add src/core/split.ts src/core/split.test.ts src/core/test-factories.ts
git commit -m "feat(core): compute per-diner split with explicit unassigned bucket"
```

---

### Task 5: Property tests for the invariant

**Files:**
- Test: `src/core/split.properties.test.ts`

**Interfaces:**
- Consumes: `computeSplit`, all domain types, `fast-check`.
- Produces: nothing new. This task defends what Task 4 built.

Worked examples cover the cases you thought of. This task covers the ones you did not: fifteen diners, a discount larger than the bill, an item with quantity zero, units assigned to someone who left.

- [ ] **Step 1: Write the property tests**

```ts
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { computeSplit } from '@/core/split'
import type { Assignment, Bill, Diner, Extra, Item } from '@/core/types'

const dinersArb = fc
  .array(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 8 })
  .map((names): Diner[] =>
    names.map((name, index) => ({ id: `d${index}`, name, order: index })),
  )

function assignmentArb(dinerIds: string[]): fc.Arbitrary<Assignment> {
  const equal = fc
    .subarray(dinerIds)
    .map((ids): Assignment => ({ mode: 'equal', dinerIds: ids }))

  if (dinerIds.length === 0) return equal

  const units = fc
    .array(fc.integer({ min: 0, max: 4 }), {
      minLength: dinerIds.length,
      maxLength: dinerIds.length,
    })
    .map((counts): Assignment => {
      const map: Record<string, number> = {}
      dinerIds.forEach((id, index) => {
        map[id] = counts[index] ?? 0
      })
      return { mode: 'units', units: map }
    })

  return fc.oneof(equal, units)
}

function itemsArb(dinerIds: string[]): fc.Arbitrary<Item[]> {
  return fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 4 }),
      name: fc.string({ maxLength: 8 }),
      unitPrice: fc.integer({ min: -5_000, max: 20_000 }),
      quantity: fc.integer({ min: 0, max: 6 }),
      assignment: assignmentArb(dinerIds),
    }),
    { maxLength: 10 },
  )
}

const extrasArb: fc.Arbitrary<Extra[]> = fc.array(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 4 }),
    label: fc.string({ maxLength: 8 }),
    amount: fc.integer({ min: -10_000, max: 10_000 }),
  }),
  { maxLength: 4 },
)

const billArb: fc.Arbitrary<Bill> = dinersArb.chain((diners) => {
  const dinerIds = diners.map((diner) => diner.id)
  return fc.record({
    id: fc.constant('bill'),
    title: fc.constant('Cuenta'),
    createdAt: fc.constant(0),
    diners: fc.constant(diners),
    items: itemsArb(dinerIds),
    extras: extrasArb,
    payerId: dinerIds.length > 0 ? fc.constantFrom(null, ...dinerIds) : fc.constant(null),
  })
})

describe('computeSplit — invariantes', () => {
  it('el reparto más lo no asignado siempre suma el total', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        const distributed = result.perDiner.reduce((sum, share) => sum + share.total, 0)

        expect(distributed + result.unassignedTotal).toBe(result.billTotal)
      }),
      { numRuns: 2000 },
    )
  })

  it('el total coincide con la suma cruda de ítems y extras', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const raw =
          bill.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) +
          bill.extras.reduce((sum, extra) => sum + extra.amount, 0)

        expect(computeSplit(bill).billTotal).toBe(raw)
      }),
      { numRuns: 1000 },
    )
  })

  it('todas las cantidades son enteras', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        for (const share of result.perDiner) {
          expect(Number.isInteger(share.total)).toBe(true)
          expect(Number.isInteger(share.itemsTotal)).toBe(true)
          expect(Number.isInteger(share.extrasShare)).toBe(true)
        }
        expect(Number.isInteger(result.unassignedTotal)).toBe(true)
      }),
      { numRuns: 1000 },
    )
  })

  it('devuelve una entrada por comensal, en su orden', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        const result = computeSplit(bill)
        expect(result.perDiner.map((share) => share.dinerId)).toEqual(
          [...bill.diners].sort((a, b) => a.order - b.order).map((diner) => diner.id),
        )
      }),
      { numRuns: 500 },
    )
  })

  it('es determinista', () => {
    fc.assert(
      fc.property(billArb, (bill) => {
        expect(computeSplit(bill)).toEqual(computeSplit(bill))
      }),
      { numRuns: 500 },
    )
  })
})
```

- [ ] **Step 2: Run the property tests**

Run: `npx vitest run src/core/split.properties.test.ts`
Expected: PASS. If any property fails, fast-check prints a minimal counterexample — fix `split.ts`, add that counterexample as a named unit test in `split.test.ts`, and rerun. Do not weaken the property to make it pass.

- [ ] **Step 3: Commit**

```bash
git add src/core/split.properties.test.ts
git commit -m "test(core): assert the reconciliation invariant with property-based tests"
```

---

### Task 6: Persistence

**Files:**
- Create: `src/storage/schema.ts`, `src/storage/bill-store.ts`
- Test: `src/storage/bill-store.test.ts`

**Interfaces:**
- Consumes: types from `@/core/types`, `zod`.
- Produces:
  - `STORAGE_KEY = 'tablesplit:bills'`
  - `SCHEMA_VERSION = 1`
  - `loadBills(storage?: Storage): { bills: Bill[]; recovered: boolean }`
  - `saveBills(bills: Bill[], storage?: Storage): void`

`recovered: true` means the stored payload was unreadable and the app started from empty — the UI surfaces this rather than silently pretending nothing was there.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import { loadBills, saveBills, SCHEMA_VERSION, STORAGE_KEY } from '@/storage/bill-store'

describe('bill-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('devuelve vacío cuando no hay nada guardado', () => {
    expect(loadBills()).toEqual({ bills: [], recovered: false })
  })

  it('guarda y recupera una cuenta completa', () => {
    const bill = makeBill({
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 1250, { mode: 'equal', dinerIds: ['ana'] })],
    })

    saveBills([bill])

    expect(loadBills()).toEqual({ bills: [bill], recovered: false })
  })

  it('escribe la versión de esquema', () => {
    saveBills([makeBill()])
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')

    expect(raw.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('arranca limpio y avisa si el JSON está corrupto', () => {
    localStorage.setItem(STORAGE_KEY, '{no es json')

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('arranca limpio y avisa si la forma no valida', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, bills: [{ id: 'x', title: 42 }] }),
    )

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('arranca limpio ante una versión de esquema futura', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, bills: [] }))

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('no revienta si localStorage lanza al escribir', () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage

    expect(() => saveBills([makeBill()], failing)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/storage/bill-store.test.ts`
Expected: FAIL — `Failed to resolve import "@/storage/bill-store"`.

- [ ] **Step 3: Write `src/storage/schema.ts`**

```ts
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

export const billSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  diners: z.array(dinerSchema),
  items: z.array(itemSchema),
  extras: z.array(extraSchema),
  payerId: z.string().nullable(),
})

export const storedPayloadSchema = z.object({
  schemaVersion: z.number().int(),
  bills: z.array(billSchema),
})

export type StoredPayload = z.infer<typeof storedPayloadSchema>
```

- [ ] **Step 4: Write `src/storage/bill-store.ts`**

```ts
import type { Bill } from '@/core/types'
import { storedPayloadSchema } from '@/storage/schema'

export const STORAGE_KEY = 'tablesplit:bills'
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/storage/bill-store.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/storage
git commit -m "feat(storage): persist bills in localStorage with schema validation"
```

---

### Task 7: Bill reducer

**Files:**
- Create: `src/state/bill-reducer.ts`
- Test: `src/state/bill-reducer.test.ts`

**Interfaces:**
- Consumes: types from `@/core/types`, `nanoid`.
- Produces:
  - `type BillAction` (the union below)
  - `billReducer(bill: Bill, action: BillAction): Bill`
  - `createBill(title: string): Bill`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import { billReducer, createBill } from '@/state/bill-reducer'

describe('createBill', () => {
  it('crea una cuenta vacía con id y fecha', () => {
    const bill = createBill('Casa Paco')

    expect(bill.title).toBe('Casa Paco')
    expect(bill.id).not.toBe('')
    expect(bill.createdAt).toBeGreaterThan(0)
    expect(bill.diners).toEqual([])
    expect(bill.payerId).toBeNull()
  })
})

describe('billReducer', () => {
  it('añade un comensal con el siguiente orden', () => {
    const withOne = billReducer(makeBill(), { type: 'ADD_DINER', name: 'Ana' })
    const withTwo = billReducer(withOne, { type: 'ADD_DINER', name: 'Luis' })

    expect(withTwo.diners.map((d) => d.name)).toEqual(['Ana', 'Luis'])
    expect(withTwo.diners.map((d) => d.order)).toEqual([0, 1])
  })

  it('ignora un nombre vacío', () => {
    expect(billReducer(makeBill(), { type: 'ADD_DINER', name: '   ' }).diners).toEqual([])
  })

  it('renombra un comensal', () => {
    const bill = makeBill({ diners: [makeDiner('ana', 0, 'Ana')] })
    const next = billReducer(bill, { type: 'RENAME_DINER', dinerId: 'ana', name: 'Anita' })

    expect(next.diners[0]?.name).toBe('Anita')
  })

  it('al borrar un comensal lo quita de las asignaciones', () => {
    const bill = makeBill({
      diners: [makeDiner('ana', 0), makeDiner('luis', 1)],
      items: [
        makeItem('i1', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] }),
        makeItem('i2', 500, { mode: 'units', units: { ana: 1, luis: 2 } }, 3),
      ],
      payerId: 'ana',
    })
    const next = billReducer(bill, { type: 'REMOVE_DINER', dinerId: 'ana' })

    expect(next.diners.map((d) => d.id)).toEqual(['luis'])
    expect(next.items[0]?.assignment).toEqual({ mode: 'equal', dinerIds: ['luis'] })
    expect(next.items[1]?.assignment).toEqual({ mode: 'units', units: { luis: 2 } })
    expect(next.payerId).toBeNull()
  })

  it('añade un ítem sin asignar', () => {
    const next = billReducer(makeBill(), {
      type: 'ADD_ITEM',
      name: 'Pulpo',
      unitPrice: 1980,
      quantity: 1,
    })

    expect(next.items[0]?.name).toBe('Pulpo')
    expect(next.items[0]?.assignment).toEqual({ mode: 'equal', dinerIds: [] })
  })

  it('cambia la asignación de un ítem', () => {
    const bill = makeBill({
      diners: [makeDiner('ana', 0)],
      items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })],
    })
    const next = billReducer(bill, {
      type: 'SET_ASSIGNMENT',
      itemId: 'i1',
      assignment: { mode: 'equal', dinerIds: ['ana'] },
    })

    expect(next.items[0]?.assignment).toEqual({ mode: 'equal', dinerIds: ['ana'] })
  })

  it('borra un ítem', () => {
    const bill = makeBill({ items: [makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })] })

    expect(billReducer(bill, { type: 'REMOVE_ITEM', itemId: 'i1' }).items).toEqual([])
  })

  it('añade y borra extras', () => {
    const withExtra = billReducer(makeBill(), {
      type: 'ADD_EXTRA',
      label: 'Propina',
      amount: 1000,
    })
    const extraId = withExtra.extras[0]?.id ?? ''

    expect(withExtra.extras[0]?.amount).toBe(1000)
    expect(billReducer(withExtra, { type: 'REMOVE_EXTRA', extraId }).extras).toEqual([])
  })

  it('fija y quita el pagador', () => {
    const bill = makeBill({ diners: [makeDiner('ana', 0)] })
    const withPayer = billReducer(bill, { type: 'SET_PAYER', dinerId: 'ana' })

    expect(withPayer.payerId).toBe('ana')
    expect(billReducer(withPayer, { type: 'SET_PAYER', dinerId: null }).payerId).toBeNull()
  })

  it('no muta la cuenta original', () => {
    const bill = makeBill()
    billReducer(bill, { type: 'ADD_DINER', name: 'Ana' })

    expect(bill.diners).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/state/bill-reducer.test.ts`
Expected: FAIL — `Failed to resolve import "@/state/bill-reducer"`.

- [ ] **Step 3: Write the implementation**

```ts
import { nanoid } from 'nanoid'
import type { Cents } from '@/core/money'
import type { Assignment, Bill, Item } from '@/core/types'

export type BillAction =
  | { type: 'SET_TITLE'; title: string }
  | { type: 'ADD_DINER'; name: string }
  | { type: 'RENAME_DINER'; dinerId: string; name: string }
  | { type: 'REMOVE_DINER'; dinerId: string }
  | { type: 'ADD_ITEM'; name: string; unitPrice: Cents; quantity: number }
  | { type: 'UPDATE_ITEM'; itemId: string; name: string; unitPrice: Cents; quantity: number }
  | { type: 'SET_ASSIGNMENT'; itemId: string; assignment: Assignment }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'ADD_EXTRA'; label: string; amount: Cents }
  | { type: 'REMOVE_EXTRA'; extraId: string }
  | { type: 'SET_PAYER'; dinerId: string | null }

export function createBill(title: string): Bill {
  return {
    id: nanoid(),
    title,
    createdAt: Date.now(),
    diners: [],
    items: [],
    extras: [],
    payerId: null,
  }
}

/** Drops a departed diner from an item's assignment, whichever mode it uses. */
function withoutDiner(item: Item, dinerId: string): Item {
  if (item.assignment.mode === 'equal') {
    return {
      ...item,
      assignment: {
        mode: 'equal',
        dinerIds: item.assignment.dinerIds.filter((id) => id !== dinerId),
      },
    }
  }

  const units = { ...item.assignment.units }
  delete units[dinerId]
  return { ...item, assignment: { mode: 'units', units } }
}

export function billReducer(bill: Bill, action: BillAction): Bill {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...bill, title: action.title }

    case 'ADD_DINER': {
      const name = action.name.trim()
      if (name === '') return bill
      const order = bill.diners.reduce((max, diner) => Math.max(max, diner.order + 1), 0)
      return { ...bill, diners: [...bill.diners, { id: nanoid(), name, order }] }
    }

    case 'RENAME_DINER': {
      const name = action.name.trim()
      if (name === '') return bill
      return {
        ...bill,
        diners: bill.diners.map((diner) =>
          diner.id === action.dinerId ? { ...diner, name } : diner,
        ),
      }
    }

    case 'REMOVE_DINER':
      return {
        ...bill,
        diners: bill.diners.filter((diner) => diner.id !== action.dinerId),
        items: bill.items.map((item) => withoutDiner(item, action.dinerId)),
        payerId: bill.payerId === action.dinerId ? null : bill.payerId,
      }

    case 'ADD_ITEM': {
      const name = action.name.trim()
      if (name === '') return bill
      return {
        ...bill,
        items: [
          ...bill.items,
          {
            id: nanoid(),
            name,
            unitPrice: action.unitPrice,
            quantity: action.quantity,
            assignment: { mode: 'equal', dinerIds: [] },
          },
        ],
      }
    }

    case 'UPDATE_ITEM':
      return {
        ...bill,
        items: bill.items.map((item) =>
          item.id === action.itemId
            ? {
                ...item,
                name: action.name.trim() === '' ? item.name : action.name.trim(),
                unitPrice: action.unitPrice,
                quantity: action.quantity,
              }
            : item,
        ),
      }

    case 'SET_ASSIGNMENT':
      return {
        ...bill,
        items: bill.items.map((item) =>
          item.id === action.itemId ? { ...item, assignment: action.assignment } : item,
        ),
      }

    case 'REMOVE_ITEM':
      return { ...bill, items: bill.items.filter((item) => item.id !== action.itemId) }

    case 'ADD_EXTRA': {
      const label = action.label.trim()
      if (label === '') return bill
      return { ...bill, extras: [...bill.extras, { id: nanoid(), label, amount: action.amount }] }
    }

    case 'REMOVE_EXTRA':
      return { ...bill, extras: bill.extras.filter((extra) => extra.id !== action.extraId) }

    case 'SET_PAYER':
      return { ...bill, payerId: action.dinerId }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/state/bill-reducer.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/bill-reducer.ts src/state/bill-reducer.test.ts
git commit -m "feat(state): add pure bill reducer with assignment cleanup on diner removal"
```

---

### Task 8: Bills provider

**Files:**
- Create: `src/state/bills-context.tsx`, `src/state/use-bills.ts`
- Test: `src/state/bills-context.test.tsx`

**Interfaces:**
- Consumes: `billReducer`, `createBill`, `loadBills`, `saveBills`.
- Produces:
  - `<BillsProvider>` component
  - `useBills(): { bills: Bill[]; recovered: boolean; addBill(title): Bill; removeBill(id): void; dispatchTo(billId, action): void; getBill(id): Bill | undefined }`

Persistence is debounced ~300 ms here so typing an item name does not write to `localStorage` on every keystroke.

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BillsProvider } from '@/state/bills-context'
import { useBills } from '@/state/use-bills'
import { loadBills } from '@/storage/bill-store'

function Harness() {
  const { bills, addBill, dispatchTo } = useBills()
  const first = bills[0]

  return (
    <div>
      <button type="button" onClick={() => addBill('Cena')}>
        nueva
      </button>
      <button
        type="button"
        onClick={() => first && dispatchTo(first.id, { type: 'ADD_DINER', name: 'Ana' })}
      >
        comensal
      </button>
      <output>{first ? `${first.title}:${first.diners.length}` : 'vacío'}</output>
    </div>
  )
}

describe('BillsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('crea cuentas y les despacha acciones', async () => {
    const user = userEvent.setup()
    render(
      <BillsProvider>
        <Harness />
      </BillsProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('vacío')

    await user.click(screen.getByRole('button', { name: 'nueva' }))
    expect(screen.getByRole('status')).toHaveTextContent('Cena:0')

    await user.click(screen.getByRole('button', { name: 'comensal' }))
    expect(screen.getByRole('status')).toHaveTextContent('Cena:1')
  })

  it('persiste en localStorage tras el debounce', async () => {
    const user = userEvent.setup()
    render(
      <BillsProvider>
        <Harness />
      </BillsProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'nueva' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))

    expect(loadBills().bills).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/state/bills-context.test.tsx`
Expected: FAIL — `Failed to resolve import "@/state/bills-context"`.

- [ ] **Step 3: Write `src/state/bills-context.tsx`**

```tsx
import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { Bill } from '@/core/types'
import { type BillAction, billReducer, createBill } from '@/state/bill-reducer'
import { loadBills, saveBills } from '@/storage/bill-store'

export type BillsContextValue = {
  bills: Bill[]
  recovered: boolean
  addBill: (title: string) => Bill
  removeBill: (billId: string) => void
  dispatchTo: (billId: string, action: BillAction) => void
  getBill: (billId: string) => Bill | undefined
}

export const BillsContext = createContext<BillsContextValue | null>(null)

const SAVE_DEBOUNCE_MS = 300

export function BillsProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadBills()).current
  const [bills, setBills] = useState<Bill[]>(initial.bills)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => saveBills(bills), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [bills])

  const addBill = useCallback((title: string) => {
    const bill = createBill(title)
    setBills((current) => [bill, ...current])
    return bill
  }, [])

  const removeBill = useCallback((billId: string) => {
    setBills((current) => current.filter((bill) => bill.id !== billId))
  }, [])

  const dispatchTo = useCallback((billId: string, action: BillAction) => {
    setBills((current) =>
      current.map((bill) => (bill.id === billId ? billReducer(bill, action) : bill)),
    )
  }, [])

  const getBill = useCallback(
    (billId: string) => bills.find((bill) => bill.id === billId),
    [bills],
  )

  return (
    <BillsContext.Provider
      value={{ bills, recovered: initial.recovered, addBill, removeBill, dispatchTo, getBill }}
    >
      {children}
    </BillsContext.Provider>
  )
}
```

- [ ] **Step 4: Write `src/state/use-bills.ts`**

```ts
import { useContext } from 'react'
import { BillsContext, type BillsContextValue } from '@/state/bills-context'

export function useBills(): BillsContextValue {
  const context = useContext(BillsContext)
  if (!context) throw new Error('useBills debe usarse dentro de <BillsProvider>')
  return context
}
```

- [ ] **Step 5: Add the `<output>` role expectation**

`<output>` has the implicit ARIA role `status`, which is what the test queries. No extra attribute is needed.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/state/bills-context.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/state/bills-context.tsx src/state/use-bills.ts src/state/bills-context.test.tsx
git commit -m "feat(state): add bills provider with debounced persistence"
```

---

### Task 9: Shared UI primitives

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/text-input.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/amount.tsx`

**Interfaces:**
- Consumes: `formatAmount` from `@/core/money`.
- Produces: `<Button>`, `<TextInput>`, `<Sheet>`, `<Amount>`.

Generating these from the shadcn CLI is optional here: the ticket identity overrides nearly every default style, and four small primitives are less code than the generated versions plus their overrides. Reach for `npx shadcn@4.21.0 add <component>` when a genuinely intricate primitive is needed (a combobox, a date picker) — the value there is the accessibility behaviour, not the styling.

- [ ] **Step 1: Write `src/components/ui/button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const VARIANTS = {
  primary: 'bg-ink text-paper',
  ghost: 'bg-transparent text-ink-soft',
  danger: 'bg-transparent text-accent',
} as const

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`min-h-11 px-4 text-ticket-sm tracking-ticket uppercase rounded-ticket disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
```

`min-h-11` is 44px, the minimum comfortable tap target on a phone. Every interactive element in this app respects it.

- [ ] **Step 2: Write `src/components/ui/text-input.tsx`**

```tsx
import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function TextInput({ invalid = false, className = '', ...props }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`min-h-11 w-full bg-transparent px-2 text-ticket-base text-ink placeholder:text-ink-faint border-b border-rule outline-none focus:border-ink aria-[invalid]:border-accent ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Write `src/components/ui/sheet.tsx`**

```tsx
import { type ReactNode, useEffect } from 'react'

type SheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet. Closes on Escape and on backdrop tap, like a native one. */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-h-[80vh] overflow-y-auto bg-paper border-t-2 border-dashed border-ink-faint p-4 pb-[env(safe-area-inset-bottom)]"
      >
        <h2 className="text-ticket-sm tracking-ticket uppercase text-ink-soft mb-3">{title}</h2>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/ui/amount.tsx`**

```tsx
import { type Cents, formatAmount } from '@/core/money'

/** Renders money. Credits are visually distinct from charges, not just signed. */
export function Amount({ cents, className = '' }: { cents: Cents; className?: string }) {
  const tone = cents < 0 ? 'text-credit' : 'text-ink'
  return <span className={`tabular ${tone} ${className}`}>{formatAmount(cents)}</span>
}
```

- [ ] **Step 5: Verify types and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): add ticket-styled primitives with 44px tap targets"
```

---

### Task 10: Bills screen and routing

**Files:**
- Create: `src/screens/BillsScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/screens/BillsScreen.test.tsx`

**Interfaces:**
- Consumes: `useBills`, `computeSplit`, `Amount`, `Button`, `TextInput`.
- Produces: route `/` rendering `<BillsScreen>`; `<App>` wraps everything in `<BillsProvider>` and `<BrowserRouter>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { BillsScreen } from '@/screens/BillsScreen'
import { BillsProvider } from '@/state/bills-context'

function renderScreen() {
  return render(
    <MemoryRouter>
      <BillsProvider>
        <BillsScreen />
      </BillsProvider>
    </MemoryRouter>,
  )
}

describe('BillsScreen', () => {
  beforeEach(() => localStorage.clear())

  it('muestra el vacío inicial', () => {
    renderScreen()
    expect(screen.getByText(/todavía no hay cuentas/i)).toBeInTheDocument()
  })

  it('crea una cuenta con el nombre escrito', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText(/nombre de la cuenta/i), 'Casa Paco')
    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(screen.getByText('Casa Paco')).toBeInTheDocument()
  })

  it('no crea una cuenta sin nombre', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /crear/i }))

    expect(screen.getByText(/todavía no hay cuentas/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/BillsScreen.test.tsx`
Expected: FAIL — `Failed to resolve import "@/screens/BillsScreen"`.

- [ ] **Step 3: Write `src/screens/BillsScreen.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { computeSplit } from '@/core/split'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { useBills } from '@/state/use-bills'

export function BillsScreen() {
  const { bills, recovered, addBill, removeBill } = useBills()
  const [title, setTitle] = useState('')

  const create = () => {
    if (title.trim() === '') return
    addBill(title.trim())
    setTitle('')
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-8">
      <header className="border-b-2 border-dashed border-ink-faint py-4 text-center">
        <h1 className="text-ticket-lg tracking-ticket uppercase">table-split</h1>
        <p className="text-ticket-xs tracking-ticket uppercase text-ink-soft">
          Divide la cuenta sin calculadora
        </p>
      </header>

      {recovered && (
        <p role="alert" className="mt-3 text-ticket-sm text-accent">
          No se pudieron leer las cuentas guardadas. Empezamos de cero.
        </p>
      )}

      <div className="flex items-end gap-2 py-4">
        <label className="flex-1">
          <span className="sr-only">Nombre de la cuenta</span>
          <TextInput
            value={title}
            placeholder="Casa Paco"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && create()}
          />
        </label>
        <Button onClick={create}>Crear</Button>
      </div>

      {bills.length === 0 ? (
        <p className="py-8 text-center text-ticket-sm text-ink-soft">
          Todavía no hay cuentas. Crea la primera.
        </p>
      ) : (
        <ul>
          {bills.map((bill) => {
            const { billTotal } = computeSplit(bill)
            return (
              <li key={bill.id} className="flex items-center gap-2 border-b border-rule py-3">
                <Link to={`/b/${bill.id}`} className="flex-1">
                  <span className="block text-ticket-base">{bill.title}</span>
                  <span className="block text-ticket-xs uppercase tracking-ticket text-ink-soft">
                    {new Date(bill.createdAt).toLocaleDateString('es-ES')} ·{' '}
                    {bill.diners.length} comensales
                  </span>
                </Link>
                <Amount cents={billTotal} className="text-ticket-base" />
                <Button
                  variant="danger"
                  aria-label={`Borrar ${bill.title}`}
                  onClick={() => removeBill(bill.id)}
                >
                  ×
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Rewrite `src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router'
import { BillsScreen } from '@/screens/BillsScreen'
import { BillsProvider } from '@/state/bills-context'

export default function App() {
  return (
    <BillsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BillsScreen />} />
        </Routes>
      </BrowserRouter>
    </BillsProvider>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/screens/BillsScreen.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/screens/BillsScreen.tsx src/screens/BillsScreen.test.tsx src/App.tsx
git commit -m "feat(screens): add bills list screen and app routing"
```

---

### Task 11: Bill screen — diners and items

**Files:**
- Create: `src/components/bill/DinerChips.tsx`, `src/components/bill/ItemRow.tsx`, `src/components/bill/AddItemForm.tsx`, `src/screens/BillScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/screens/BillScreen.test.tsx`

**Interfaces:**
- Consumes: `useBills`, `computeSplit`, `parseAmount`, all UI primitives.
- Produces: route `/b/:id`; component `initialsFor(name: string): string` exported from `src/components/bill/initials.ts`.

- [ ] **Step 1: Write `src/components/bill/initials.ts`**

```ts
/** First letter of each of the first two words, uppercased. "Ana Ruiz" -> "AR". */
export function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { BillScreen } from '@/screens/BillScreen'
import { BillsProvider } from '@/state/bills-context'
import { saveBills } from '@/storage/bill-store'
import { makeBill } from '@/core/test-factories'

function renderBill() {
  saveBills([makeBill({ id: 'b1', title: 'Casa Paco' })])
  return render(
    <MemoryRouter initialEntries={['/b/b1']}>
      <BillsProvider>
        <Routes>
          <Route path="/b/:billId" element={<BillScreen />} />
        </Routes>
      </BillsProvider>
    </MemoryRouter>,
  )
}

describe('BillScreen', () => {
  beforeEach(() => localStorage.clear())

  it('añade comensales', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/añadir comensal/i), 'Ana{enter}')
    await user.type(screen.getByLabelText(/añadir comensal/i), 'Luis{enter}')

    expect(screen.getByRole('button', { name: /ana/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /luis/i })).toBeInTheDocument()
  })

  it('añade un ítem con precio y lo suma al total', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/concepto/i), 'Pulpo')
    await user.type(screen.getByLabelText(/precio/i), '19,80')
    await user.click(screen.getByRole('button', { name: /añadir/i }))

    expect(screen.getByText('Pulpo')).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByText('19,80 €')).toBeInTheDocument()
  })

  it('rechaza un precio inválido sin añadir nada', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/concepto/i), 'Pulpo')
    await user.type(screen.getByLabelText(/precio/i), 'abc')
    await user.click(screen.getByRole('button', { name: /añadir/i }))

    expect(screen.queryByText('Pulpo')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/precio/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('avisa de los ítems sin asignar', async () => {
    const user = userEvent.setup()
    renderBill()

    await user.type(screen.getByLabelText(/concepto/i), 'Pulpo')
    await user.type(screen.getByLabelText(/precio/i), '19,80')
    await user.click(screen.getByRole('button', { name: /añadir/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/1 ítem sin asignar/i)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/screens/BillScreen.test.tsx`
Expected: FAIL — `Failed to resolve import "@/screens/BillScreen"`.

- [ ] **Step 4: Write `src/components/bill/DinerChips.tsx`**

```tsx
import { useState } from 'react'
import type { Diner } from '@/core/types'
import { TextInput } from '@/components/ui/text-input'

type DinerChipsProps = {
  diners: Diner[]
  onAdd: (name: string) => void
  onRemove: (dinerId: string) => void
}

export function DinerChips({ diners, onAdd, onRemove }: DinerChipsProps) {
  const [name, setName] = useState('')

  const submit = () => {
    if (name.trim() === '') return
    onAdd(name.trim())
    setName('')
  }

  return (
    <section className="py-3">
      <h2 className="text-ticket-xs uppercase tracking-ticket text-ink-soft">Comensales</h2>
      <ul className="flex flex-wrap gap-2 py-2">
        {diners.map((diner) => (
          <li key={diner.id}>
            <button
              type="button"
              aria-label={`Quitar a ${diner.name}`}
              onClick={() => onRemove(diner.id)}
              className="min-h-11 border border-ink px-3 text-ticket-sm rounded-ticket"
            >
              {diner.name} ×
            </button>
          </li>
        ))}
      </ul>
      <label>
        <span className="sr-only">Añadir comensal</span>
        <TextInput
          value={name}
          placeholder="Añadir comensal"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </label>
    </section>
  )
}
```

- [ ] **Step 5: Write `src/components/bill/ItemRow.tsx`**

```tsx
import { Amount } from '@/components/ui/amount'
import { initialsFor } from '@/components/bill/initials'
import type { Diner, Item } from '@/core/types'

type ItemRowProps = {
  item: Item
  diners: Diner[]
  onOpenAssign: () => void
  onRemove: () => void
}

function assigneesOf(item: Item, diners: Diner[]): Diner[] {
  if (item.assignment.mode === 'equal') {
    const selected = new Set(item.assignment.dinerIds)
    return diners.filter((diner) => selected.has(diner.id))
  }
  const { units } = item.assignment
  return diners.filter((diner) => (units[diner.id] ?? 0) > 0)
}

export function ItemRow({ item, diners, onOpenAssign, onRemove }: ItemRowProps) {
  const assignees = assigneesOf(item, diners)

  return (
    <li className="flex items-center gap-2 border-b border-rule">
      <button type="button" onClick={onOpenAssign} className="min-h-11 flex-1 py-2 text-left">
        <span className="block text-ticket-base">
          {item.quantity > 1 ? `${item.quantity}× ` : ''}
          {item.name}
        </span>
        <span className="block text-ticket-xs uppercase tracking-ticket text-ink-soft">
          {assignees.length === 0
            ? 'Sin asignar'
            : assignees.map((diner) => initialsFor(diner.name)).join(' · ')}
        </span>
      </button>
      <Amount cents={item.unitPrice * item.quantity} className="text-ticket-base" />
      <button
        type="button"
        aria-label={`Borrar ${item.name}`}
        onClick={onRemove}
        className="min-h-11 px-2 text-accent"
      >
        ×
      </button>
    </li>
  )
}
```

- [ ] **Step 6: Write `src/components/bill/AddItemForm.tsx`**

```tsx
import { useState } from 'react'
import { type Cents, parseAmount } from '@/core/money'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

type AddItemFormProps = {
  onAdd: (name: string, unitPrice: Cents, quantity: number) => void
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [priceInvalid, setPriceInvalid] = useState(false)

  const submit = () => {
    const cents = parseAmount(price)
    if (name.trim() === '' || cents === null) {
      setPriceInvalid(cents === null)
      return
    }

    const count = Number.parseInt(quantity, 10)
    onAdd(name.trim(), cents, Number.isNaN(count) || count < 1 ? 1 : count)
    setName('')
    setPrice('')
    setQuantity('1')
    setPriceInvalid(false)
  }

  return (
    <div className="flex items-end gap-2 border-t-2 border-dashed border-ink-faint pt-3">
      <label className="flex-[3]">
        <span className="sr-only">Concepto</span>
        <TextInput
          value={name}
          placeholder="Concepto"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="flex-[1]">
        <span className="sr-only">Cantidad</span>
        <TextInput
          value={quantity}
          inputMode="numeric"
          onChange={(event) => setQuantity(event.target.value)}
        />
      </label>
      <label className="flex-[2]">
        <span className="sr-only">Precio</span>
        <TextInput
          value={price}
          placeholder="0,00"
          inputMode="decimal"
          invalid={priceInvalid}
          onChange={(event) => {
            setPrice(event.target.value)
            setPriceInvalid(false)
          }}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </label>
      <Button onClick={submit}>Añadir</Button>
    </div>
  )
}
```

- [ ] **Step 7: Write `src/screens/BillScreen.tsx`**

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AddItemForm } from '@/components/bill/AddItemForm'
import { AssignSheet } from '@/components/bill/AssignSheet'
import { DinerChips } from '@/components/bill/DinerChips'
import { ItemRow } from '@/components/bill/ItemRow'
import { Amount } from '@/components/ui/amount'
import { computeSplit } from '@/core/split'
import { useBills } from '@/state/use-bills'

export function BillScreen() {
  const { billId = '' } = useParams()
  const { getBill, dispatchTo } = useBills()
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null)

  const bill = getBill(billId)
  if (!bill) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-ticket-base">Esa cuenta ya no existe.</p>
        <Link to="/" className="text-ticket-sm underline">
          Volver
        </Link>
      </main>
    )
  }

  const { billTotal, warnings } = computeSplit(bill)
  const unassignedCount = warnings.filter((warning) => warning.kind === 'unassigned-item').length
  const assigningItem = bill.items.find((item) => item.id === assigningItemId) ?? null

  return (
    <main className="mx-auto max-w-md px-4 pb-24">
      <header className="border-b-2 border-dashed border-ink-faint py-4 text-center">
        <Link to="/" className="float-left text-ticket-sm text-ink-soft">
          ←
        </Link>
        <h1 className="text-ticket-lg uppercase tracking-ticket">{bill.title}</h1>
      </header>

      <DinerChips
        diners={bill.diners}
        onAdd={(name) => dispatchTo(bill.id, { type: 'ADD_DINER', name })}
        onRemove={(dinerId) => dispatchTo(bill.id, { type: 'REMOVE_DINER', dinerId })}
      />

      {unassignedCount > 0 && (
        <p role="alert" className="py-2 text-ticket-sm text-accent">
          {unassignedCount} ítem{unassignedCount > 1 ? 's' : ''} sin asignar. Ese dinero no se
          reparte.
        </p>
      )}

      <ul>
        {bill.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            diners={bill.diners}
            onOpenAssign={() => setAssigningItemId(item.id)}
            onRemove={() => dispatchTo(bill.id, { type: 'REMOVE_ITEM', itemId: item.id })}
          />
        ))}
      </ul>

      <div className="py-3">
        <AddItemForm
          onAdd={(name, unitPrice, quantity) =>
            dispatchTo(bill.id, { type: 'ADD_ITEM', name, unitPrice, quantity })
          }
        />
      </div>

      <footer className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t-2 border-dashed border-ink-faint bg-paper px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="text-ticket-xs uppercase tracking-ticket text-ink-soft">Total</span>
          <Amount cents={billTotal} className="text-ticket-xl" />
        </div>
        <Link
          to={`/b/${bill.id}/resultado`}
          className="mt-2 block bg-ink py-3 text-center text-ticket-sm uppercase tracking-ticket text-paper"
        >
          Ver reparto
        </Link>
      </footer>

      <AssignSheet
        item={assigningItem}
        diners={bill.diners}
        onClose={() => setAssigningItemId(null)}
        onApply={(assignment) => {
          if (assigningItem) {
            dispatchTo(bill.id, { type: 'SET_ASSIGNMENT', itemId: assigningItem.id, assignment })
          }
          setAssigningItemId(null)
        }}
      />
    </main>
  )
}
```

- [ ] **Step 8: Add the route**

In `src/App.tsx`, add inside `<Routes>`:

```tsx
<Route path="/b/:billId" element={<BillScreen />} />
```

and the matching import:

```tsx
import { BillScreen } from '@/screens/BillScreen'
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/screens/BillScreen.test.tsx`
Expected: PASS, 4 tests. This depends on Task 12's `AssignSheet` existing — if executing tasks strictly in order, create `src/components/bill/AssignSheet.tsx` with the Task 12 implementation before running.

- [ ] **Step 10: Commit**

```bash
git add src/components/bill src/screens/BillScreen.tsx src/screens/BillScreen.test.tsx src/App.tsx
git commit -m "feat(screens): add bill screen with diners, items and running total"
```

---

### Task 12: Assignment sheet

**Files:**
- Create: `src/components/bill/AssignSheet.tsx`
- Test: `src/components/bill/AssignSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `Button`, types from `@/core/types`.
- Produces: `<AssignSheet item={Item | null} diners={Diner[]} onClose={() => void} onApply={(assignment: Assignment) => void} />`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssignSheet } from '@/components/bill/AssignSheet'
import { makeDiner, makeItem } from '@/core/test-factories'

const diners = [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')]

describe('AssignSheet', () => {
  it('no renderiza nada sin ítem', () => {
    const { container } = render(
      <AssignSheet item={null} diners={diners} onClose={() => {}} onApply={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('marca comensales y aplica un reparto a partes iguales', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <AssignSheet
        item={makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })}
        diners={diners}
        onClose={() => {}}
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^ana$/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    expect(onApply).toHaveBeenCalledWith({ mode: 'equal', dinerIds: ['ana'] })
  })

  it('el atajo "todos" marca a todo el mundo', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <AssignSheet
        item={makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })}
        diners={diners}
        onClose={() => {}}
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /todos/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    expect(onApply).toHaveBeenCalledWith({ mode: 'equal', dinerIds: ['ana', 'luis'] })
  })

  it('con cantidad mayor que uno reparte por unidades', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <AssignSheet
        item={makeItem('i1', 350, { mode: 'equal', dinerIds: [] }, 3)}
        diners={diners}
        onClose={() => {}}
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /sumar unidad a ana/i }))
    await user.click(screen.getByRole('button', { name: /sumar unidad a ana/i }))
    await user.click(screen.getByRole('button', { name: /sumar unidad a luis/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    expect(onApply).toHaveBeenCalledWith({ mode: 'units', units: { ana: 2, luis: 1 } })
  })

  it('avisa cuando las unidades no cuadran con la cantidad', async () => {
    const user = userEvent.setup()
    render(
      <AssignSheet
        item={makeItem('i1', 350, { mode: 'units', units: { ana: 1 } }, 3)}
        diners={diners}
        onClose={() => {}}
        onApply={() => {}}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/faltan 2/i)
    await user.click(screen.getByRole('button', { name: /sumar unidad a luis/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/falta 1/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/bill/AssignSheet.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/bill/AssignSheet"`.

- [ ] **Step 3: Write the implementation**

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import type { Assignment, Diner, Item } from '@/core/types'

type AssignSheetProps = {
  item: Item | null
  diners: Diner[]
  onClose: () => void
  onApply: (assignment: Assignment) => void
}

function initialUnits(item: Item | null, diners: Diner[]): Record<string, number> {
  const units: Record<string, number> = {}
  for (const diner of diners) {
    if (!item) {
      units[diner.id] = 0
      continue
    }
    units[diner.id] =
      item.assignment.mode === 'units'
        ? (item.assignment.units[diner.id] ?? 0)
        : item.assignment.dinerIds.includes(diner.id)
          ? 1
          : 0
  }
  return units
}

export function AssignSheet({ item, diners, onClose, onApply }: AssignSheetProps) {
  const byUnits = (item?.quantity ?? 1) > 1
  const [units, setUnits] = useState<Record<string, number>>(() => initialUnits(item, diners))

  // The sheet is reused across items, so its draft state resets per item.
  useEffect(() => {
    setUnits(initialUnits(item, diners))
  }, [item, diners])

  if (!item) return null

  const assigned = Object.values(units).reduce((sum, count) => sum + count, 0)
  const missing = item.quantity - assigned

  const bump = (dinerId: string, delta: number) => {
    setUnits((current) => ({
      ...current,
      [dinerId]: Math.max(0, (current[dinerId] ?? 0) + delta),
    }))
  }

  const toggle = (dinerId: string) => {
    setUnits((current) => ({ ...current, [dinerId]: (current[dinerId] ?? 0) > 0 ? 0 : 1 }))
  }

  const setAll = (value: number) => {
    const next: Record<string, number> = {}
    for (const diner of diners) next[diner.id] = value
    setUnits(next)
  }

  const apply = () => {
    if (byUnits) {
      const filtered: Record<string, number> = {}
      for (const [dinerId, count] of Object.entries(units)) {
        if (count > 0) filtered[dinerId] = count
      }
      onApply({ mode: 'units', units: filtered })
      return
    }

    onApply({
      mode: 'equal',
      dinerIds: diners.filter((diner) => (units[diner.id] ?? 0) > 0).map((diner) => diner.id),
    })
  }

  return (
    <Sheet open title={`Quién tomó ${item.name}`} onClose={onClose}>
      {byUnits && missing !== 0 && (
        <p role="alert" className="pb-2 text-ticket-sm text-accent">
          {missing > 0
            ? `${missing === 1 ? 'Falta 1' : `Faltan ${missing}`} de ${item.quantity} por asignar.`
            : `Hay ${-missing} de más sobre ${item.quantity}.`}
        </p>
      )}

      <div className="flex gap-2 pb-3">
        <Button variant="ghost" onClick={() => setAll(byUnits ? item.quantity : 1)}>
          Todos
        </Button>
        <Button variant="ghost" onClick={() => setAll(0)}>
          Ninguno
        </Button>
      </div>

      <ul>
        {diners.map((diner) => {
          const count = units[diner.id] ?? 0
          return (
            <li key={diner.id} className="flex items-center gap-2 border-b border-rule py-1">
              {byUnits ? (
                <>
                  <span className="flex-1 text-ticket-base">{diner.name}</span>
                  <button
                    type="button"
                    aria-label={`Restar unidad a ${diner.name}`}
                    onClick={() => bump(diner.id, -1)}
                    className="min-h-11 w-11 border border-rule"
                  >
                    −
                  </button>
                  <span className="tabular w-8 text-center text-ticket-base">{count}</span>
                  <button
                    type="button"
                    aria-label={`Sumar unidad a ${diner.name}`}
                    onClick={() => bump(diner.id, 1)}
                    className="min-h-11 w-11 border border-rule"
                  >
                    +
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  aria-pressed={count > 0}
                  onClick={() => toggle(diner.id)}
                  className={`min-h-11 flex-1 text-left text-ticket-base ${
                    count > 0 ? 'text-ink' : 'text-ink-faint'
                  }`}
                >
                  {diner.name}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <Button className="mt-4 w-full" onClick={apply}>
        Aplicar
      </Button>
    </Sheet>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/bill/AssignSheet.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/bill/AssignSheet.tsx src/components/bill/AssignSheet.test.tsx
git commit -m "feat(bill): add assignment sheet with equal and per-unit modes"
```

---

### Task 13: Result screen

**Files:**
- Create: `src/components/bill/ExtrasEditor.tsx`, `src/screens/ResultScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/screens/ResultScreen.test.tsx`

**Interfaces:**
- Consumes: `computeSplit`, `useBills`, `Amount`, `Button`, `TextInput`, `parseAmount`.
- Produces: route `/b/:billId/resultado`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import { ResultScreen } from '@/screens/ResultScreen'
import { BillsProvider } from '@/state/bills-context'
import { saveBills } from '@/storage/bill-store'

function renderResult(bill = makeBill({ id: 'b1' })) {
  saveBills([bill])
  return render(
    <MemoryRouter initialEntries={['/b/b1/resultado']}>
      <BillsProvider>
        <Routes>
          <Route path="/b/:billId/resultado" element={<ResultScreen />} />
        </Routes>
      </BillsProvider>
    </MemoryRouter>,
  )
}

const bill = makeBill({
  id: 'b1',
  title: 'Casa Paco',
  diners: [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')],
  items: [
    makeItem('i1', 3000, { mode: 'equal', dinerIds: ['ana'] }),
    makeItem('i2', 1000, { mode: 'equal', dinerIds: ['ana', 'luis'] }),
  ],
})

describe('ResultScreen', () => {
  beforeEach(() => localStorage.clear())

  it('muestra lo que paga cada uno', () => {
    renderResult(bill)

    expect(screen.getByText('Ana').closest('li')).toHaveTextContent('35,00 €')
    expect(screen.getByText('Luis').closest('li')).toHaveTextContent('5,00 €')
  })

  it('muestra el total', () => {
    renderResult(bill)
    expect(screen.getByTestId('bill-total')).toHaveTextContent('40,00 €')
  })

  it('con pagador, muestra quién le debe cuánto', () => {
    renderResult({ ...bill, payerId: 'ana' })
    expect(screen.getByText(/luis debe 5,00 € a ana/i)).toBeInTheDocument()
  })

  it('declara el dinero sin asignar', () => {
    renderResult({
      ...bill,
      items: [...bill.items, makeItem('i3', 600, { mode: 'equal', dinerIds: [] }, 1, 'Café')],
    })

    expect(screen.getByTestId('unassigned')).toHaveTextContent('6,00 €')
  })

  it('añade una propina y la reparte entre todos', async () => {
    const user = userEvent.setup()
    renderResult(bill)

    await user.type(screen.getByLabelText(/concepto del extra/i), 'Propina')
    await user.type(screen.getByLabelText(/importe del extra/i), '10')
    await user.click(screen.getByRole('button', { name: /añadir extra/i }))

    expect(screen.getByText('Ana').closest('li')).toHaveTextContent('40,00 €')
    expect(screen.getByText('Luis').closest('li')).toHaveTextContent('10,00 €')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/ResultScreen.test.tsx`
Expected: FAIL — `Failed to resolve import "@/screens/ResultScreen"`.

- [ ] **Step 3: Write `src/components/bill/ExtrasEditor.tsx`**

```tsx
import { useState } from 'react'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { type Cents, parseAmount } from '@/core/money'
import type { Extra } from '@/core/types'

type ExtrasEditorProps = {
  extras: Extra[]
  onAdd: (label: string, amount: Cents) => void
  onRemove: (extraId: string) => void
}

export function ExtrasEditor({ extras, onAdd, onRemove }: ExtrasEditorProps) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [invalid, setInvalid] = useState(false)

  const submit = () => {
    const cents = parseAmount(amount)
    if (label.trim() === '' || cents === null) {
      setInvalid(cents === null)
      return
    }
    onAdd(label.trim(), cents)
    setLabel('')
    setAmount('')
    setInvalid(false)
  }

  return (
    <section className="py-4">
      <h2 className="text-ticket-xs uppercase tracking-ticket text-ink-soft">
        Extras (a partes iguales)
      </h2>
      <ul>
        {extras.map((extra) => (
          <li key={extra.id} className="flex items-center gap-2 border-b border-rule py-2">
            <span className="flex-1 text-ticket-base">{extra.label}</span>
            <Amount cents={extra.amount} className="text-ticket-base" />
            <button
              type="button"
              aria-label={`Borrar ${extra.label}`}
              onClick={() => onRemove(extra.id)}
              className="min-h-11 px-2 text-accent"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-2 pt-2">
        <label className="flex-[2]">
          <span className="sr-only">Concepto del extra</span>
          <TextInput
            value={label}
            placeholder="Propina"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label className="flex-1">
          <span className="sr-only">Importe del extra</span>
          <TextInput
            value={amount}
            placeholder="0,00"
            inputMode="decimal"
            invalid={invalid}
            onChange={(event) => {
              setAmount(event.target.value)
              setInvalid(false)
            }}
          />
        </label>
        <Button onClick={submit}>Añadir extra</Button>
      </div>
      <p className="pt-1 text-ticket-xs text-ink-soft">
        Usa un importe negativo para un descuento.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Write `src/screens/ResultScreen.tsx`**

```tsx
import { Link, useParams } from 'react-router'
import { ExtrasEditor } from '@/components/bill/ExtrasEditor'
import { Amount } from '@/components/ui/amount'
import { computeSplit } from '@/core/split'
import { useBills } from '@/state/use-bills'

export function ResultScreen() {
  const { billId = '' } = useParams()
  const { getBill, dispatchTo } = useBills()
  const bill = getBill(billId)

  if (!bill) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-ticket-base">Esa cuenta ya no existe.</p>
        <Link to="/" className="text-ticket-sm underline">
          Volver
        </Link>
      </main>
    )
  }

  const result = computeSplit(bill)
  const nameOf = (dinerId: string) =>
    bill.diners.find((diner) => diner.id === dinerId)?.name ?? '¿?'

  return (
    <main className="mx-auto max-w-md px-4 pb-8">
      <header className="border-b-2 border-dashed border-ink-faint py-4 text-center">
        <Link to={`/b/${bill.id}`} className="float-left text-ticket-sm text-ink-soft">
          ←
        </Link>
        <h1 className="text-ticket-lg uppercase tracking-ticket">Reparto</h1>
      </header>

      <label className="flex items-center gap-2 border-b border-rule py-3">
        <span className="text-ticket-xs uppercase tracking-ticket text-ink-soft">Pagó todo</span>
        <select
          value={bill.payerId ?? ''}
          onChange={(event) =>
            dispatchTo(bill.id, {
              type: 'SET_PAYER',
              dinerId: event.target.value === '' ? null : event.target.value,
            })
          }
          className="min-h-11 flex-1 bg-transparent text-ticket-base"
        >
          <option value="">Nadie (cada uno lo suyo)</option>
          {bill.diners.map((diner) => (
            <option key={diner.id} value={diner.id}>
              {diner.name}
            </option>
          ))}
        </select>
      </label>

      <ul className="py-2">
        {result.perDiner.map((share) => (
          <li key={share.dinerId} className="flex items-baseline gap-2 border-b border-rule py-3">
            <span className="flex-1 text-ticket-base">{nameOf(share.dinerId)}</span>
            <span className="text-ticket-xs text-ink-soft">
              <Amount cents={share.itemsTotal} /> + <Amount cents={share.extrasShare} />
            </span>
            <Amount cents={share.total} className="text-ticket-lg" />
          </li>
        ))}
      </ul>

      {result.unassignedTotal !== 0 && (
        <p role="alert" data-testid="unassigned" className="py-2 text-ticket-sm text-accent">
          Sin asignar: <Amount cents={result.unassignedTotal} />. Ese dinero no lo paga nadie
          todavía.
        </p>
      )}

      {result.debts.length > 0 && (
        <ul className="border-t-2 border-dashed border-ink-faint py-3">
          {result.debts.map((debt) => (
            <li key={`${debt.from}-${debt.to}`} className="py-1 text-ticket-base">
              {nameOf(debt.from)} debe <Amount cents={debt.amount} /> a {nameOf(debt.to)}
            </li>
          ))}
        </ul>
      )}

      <ExtrasEditor
        extras={bill.extras}
        onAdd={(label, amount) => dispatchTo(bill.id, { type: 'ADD_EXTRA', label, amount })}
        onRemove={(extraId) => dispatchTo(bill.id, { type: 'REMOVE_EXTRA', extraId })}
      />

      <div className="flex items-baseline justify-between border-t-2 border-dashed border-ink-faint py-3">
        <span className="text-ticket-xs uppercase tracking-ticket text-ink-soft">Total</span>
        <span data-testid="bill-total">
          <Amount cents={result.billTotal} className="text-ticket-xl" />
        </span>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Add the route**

In `src/App.tsx`, add inside `<Routes>`:

```tsx
<Route path="/b/:billId/resultado" element={<ResultScreen />} />
```

with the import `import { ResultScreen } from '@/screens/ResultScreen'`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/screens/ResultScreen.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/bill/ExtrasEditor.tsx src/screens/ResultScreen.tsx src/screens/ResultScreen.test.tsx src/App.tsx
git commit -m "feat(screens): add result screen with extras, payer and unassigned disclosure"
```

---

### Task 14: PWA assets, offline check and CI

**Files:**
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/robots.txt`, `.github/workflows/ci.yml`, `README.md`
- Modify: `index.html`

**Interfaces:**
- Consumes: the completed app.
- Produces: a build that installs on a phone and runs offline; CI that gates every push.

- [ ] **Step 1: Generate the icons**

The manifest in Task 1 references two PNGs that do not exist yet, which makes the install prompt fail silently. Generate them from the ticket palette:

```bash
mkdir -p public
npx --yes sharp-cli@5.2.0 -i /dev/stdin -o public/icon-512.png resize 512 512 << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#14110c"/>
  <text x="256" y="300" font-family="monospace" font-size="180" font-weight="bold"
        fill="#f7f5ef" text-anchor="middle">T/S</text>
</svg>
SVG
npx --yes sharp-cli@5.2.0 -i public/icon-512.png -o public/icon-192.png resize 192 192
```

If `sharp-cli` is unavailable, any 512×512 and 192×192 PNG works — the requirement is that the files exist and the sizes match the manifest.

- [ ] **Step 2: Add the theme colour and description to `index.html`**

Inside `<head>`:

```html
<meta name="theme-color" content="#14110c" />
<meta name="description" content="Divide la cuenta del restaurante entre comensales, sin registro y sin conexión." />
<link rel="icon" href="/icon-192.png" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

- [ ] **Step 3: Add `public/robots.txt`**

```
User-agent: *
Disallow:
```

- [ ] **Step 4: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 5: Verify offline behaviour by hand**

```bash
npm run build && npm run preview
```

Then, in the browser: open the preview URL, confirm the app loads, open DevTools → Network → set to Offline, reload. The app must still render, and adding a bill must still work. This is the whole promise of the product in a restaurant basement, so it is verified manually rather than assumed.

- [ ] **Step 6: Write `README.md`**

```markdown
# table-split

Divide la cuenta del restaurante entre comensales. Funciona sin conexión, no
necesita registro y no envía datos a ningún sitio: todo vive en el navegador.

## Desarrollo

```bash
npm install
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build, para probar la PWA |
| `npm run test` | Tests (Vitest) |
| `npm run lint` | Lint y formato (Biome) |
| `npm run typecheck` | Comprobación de tipos |

## Cómo está organizado

- `src/core/` — TypeScript puro. Todo el cálculo de dinero, sin React.
  `computeSplit` garantiza que el reparto más lo no asignado suma el total.
- `src/storage/` — persistencia en `localStorage`, validada con Zod.
- `src/state/` — reducer puro y proveedor de React.
- `src/screens/`, `src/components/` — interfaz.
- `src/styles/theme.css` — todos los tokens visuales. Reestilizar la app es
  editar este archivo.

Los importes son siempre enteros de céntimos. Los floats no representan dinero.

## Despliegue

Salida estática. En Cloudflare Pages: build `npm run build`, directorio `dist`.
```

- [ ] **Step 7: Run the full suite**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add public .github README.md index.html
git commit -m "chore: add pwa icons, ci pipeline and readme"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Stack and versions | 1 |
| Integer cents, parsing, formatting | 2 |
| Largest remainder rounding, tie-break by order | 2 |
| Domain types | 3 |
| Item split (equal and units), extras, debts, warnings | 4 |
| Reconciliation invariant | 5 |
| Persistence, Zod validation, schema version, recovery | 6 |
| Reducer, assignment cleanup on diner removal | 7 |
| Debounced persistence | 8 |
| Theme tokens, 44px targets | 1, 9 |
| Bills screen | 10 |
| Bill screen, diners, items, running total | 11 |
| Assignment sheet with units | 12 |
| Result screen, payer, unassigned disclosure, extras | 13 |
| PWA, offline verification, CI, README | 14 |

**Known ordering note:** Task 11's test suite imports `AssignSheet`, delivered in Task 12. Task 11 Step 9 states this explicitly. The alternative — splitting the bill screen across two tasks — would leave neither independently testable.

**Type consistency:** `computeSplit`, `distribute`, `parseAmount`, `formatAmount`, `billReducer`, `createBill`, `loadBills`, `saveBills`, `initialsFor` are used in later tasks exactly as declared in their producing task's Interfaces block. `SplitResult` includes `unassignedTotal` in Task 3 and is consumed as such in Tasks 4, 5, 11 and 13.

**Deferred to v2, with its own plan:** photo capture via a Cloudflare Worker proxying Gemini, sharing a result as text or link, and multiple payers with minimal transfers.
