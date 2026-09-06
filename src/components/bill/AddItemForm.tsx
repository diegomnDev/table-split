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
      <TextInput
        className="flex-[3]"
        aria-label="Concepto"
        value={name}
        placeholder="Concepto"
        onChange={(event) => setName(event.target.value)}
      />
      <TextInput
        className="flex-[1]"
        aria-label="Cantidad"
        value={quantity}
        inputMode="numeric"
        onChange={(event) => setQuantity(event.target.value)}
      />
      <TextInput
        className="flex-[2]"
        aria-label="Precio"
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
      <Button onClick={submit}>Añadir</Button>
    </div>
  )
}
