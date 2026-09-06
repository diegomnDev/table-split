import { useState } from 'react'
import { TextInput } from '@/components/ui/text-input'
import type { Diner } from '@/core/types'

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
