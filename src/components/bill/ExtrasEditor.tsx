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
        <TextInput
          className="flex-[2]"
          aria-label="Concepto del extra"
          value={label}
          placeholder="Propina"
          onChange={(event) => setLabel(event.target.value)}
        />
        <TextInput
          className="flex-1"
          aria-label="Importe del extra"
          value={amount}
          placeholder="0,00"
          inputMode="decimal"
          invalid={invalid}
          onChange={(event) => {
            setAmount(event.target.value)
            setInvalid(false)
          }}
        />
        <Button onClick={submit}>Añadir extra</Button>
      </div>
      <p className="pt-1 text-ticket-xs text-ink-soft">
        Usa un importe negativo para un descuento.
      </p>
    </section>
  )
}
