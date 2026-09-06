import { useState } from 'react'
import { Link } from 'react-router'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { computeSplit } from '@/core/split'
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
        <h1 className="text-ticket-lg tracking-ticket uppercase">table-spit</h1>
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
                    {new Date(bill.createdAt).toLocaleDateString('es-ES')} · {bill.diners.length}{' '}
                    comensales
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
