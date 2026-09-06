import { useState } from 'react'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { type Cents, parseAmount } from '@/core/money'
import type { Diner, Payment } from '@/core/types'

type PaymentsEditorProps = {
  diners: Diner[]
  payments: Payment[]
  billTotal: Cents
  paidTotal: Cents
  onSet: (dinerId: string, amount: Cents) => void
  onClear: () => void
}

export function PaymentsEditor({
  diners,
  payments,
  billTotal,
  paidTotal,
  onSet,
  onClear,
}: PaymentsEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [invalid, setInvalid] = useState<string | null>(null)

  const paidBy = (dinerId: string) =>
    payments.find((payment) => payment.dinerId === dinerId)?.amount ?? 0

  const register = (dinerId: string) => {
    const cents = parseAmount(drafts[dinerId] ?? '')
    if (cents === null) {
      setInvalid(dinerId)
      return
    }
    onSet(dinerId, cents)
    setDrafts((current) => ({ ...current, [dinerId]: '' }))
    setInvalid(null)
  }

  const payAll = (dinerId: string) => {
    onClear()
    onSet(dinerId, billTotal)
    setDrafts({})
    setInvalid(null)
  }

  const difference = billTotal - paidTotal

  return (
    <section className="py-4">
      <h2 className="text-ticket-xs uppercase tracking-ticket text-ink-soft">Quién puso dinero</h2>

      <ul>
        {diners.map((diner) => (
          <li key={diner.id} className="border-b border-rule py-2">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-ticket-base">{diner.name}</span>
              {paidBy(diner.id) !== 0 && (
                <Amount cents={paidBy(diner.id)} className="text-ticket-base" />
              )}
            </div>
            <div className="flex items-end gap-2 pt-1">
              <TextInput
                className="flex-1"
                aria-label={`Puso ${diner.name}`}
                value={drafts[diner.id] ?? ''}
                placeholder="0,00"
                inputMode="decimal"
                invalid={invalid === diner.id}
                onChange={(event) => {
                  setDrafts((current) => ({ ...current, [diner.id]: event.target.value }))
                  setInvalid(null)
                }}
                onKeyDown={(event) => event.key === 'Enter' && register(diner.id)}
              />
              <Button variant="ghost" onClick={() => register(diner.id)}>
                Registrar pago
              </Button>
              <Button variant="ghost" onClick={() => payAll(diner.id)}>
                {diner.name} pagó todo
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {payments.length > 0 && difference !== 0 && (
        <p role="alert" data-testid="payments-mismatch" className="pt-2 text-ticket-sm text-accent">
          {difference > 0 ? 'Faltan ' : 'Sobran '}
          <Amount cents={Math.abs(difference)} /> por registrar. Las transferencias de abajo no
          cuadran hasta que lo pagado sume el total.
        </p>
      )}

      {payments.length > 0 && (
        <Button variant="ghost" className="mt-2" onClick={onClear}>
          Borrar pagos
        </Button>
      )}
    </section>
  )
}
