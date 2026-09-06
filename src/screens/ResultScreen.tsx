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

      <ul data-testid="per-diner" className="py-2">
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
