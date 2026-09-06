import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { type Cents, parseAmount } from '@/core/money'

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
