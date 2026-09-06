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
