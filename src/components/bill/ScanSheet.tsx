import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { TextInput } from '@/components/ui/text-input'
import { type Cents, formatAmount, parseAmount } from '@/core/money'
import { ScanError, type ScannedItem, scanTicket } from '@/scan/scan-client'

type ScanSheetProps = {
  endpoint: string
  onAdd: (name: string, unitPrice: Cents, quantity: number) => void
}

type Draft = ScannedItem & { id: number; selected: boolean; priceText: string }

function toDrafts(items: ScannedItem[]): Draft[] {
  return items.map((item, index) => ({
    ...item,
    id: index,
    selected: true,
    priceText: formatAmount(item.unitPrice).replace(' €', ''),
  }))
}

export function ScanSheet({ endpoint, onAdd }: ScanSheetProps) {
  const inputId = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[] | null>(null)

  const run = async (file: File) => {
    setPending(true)
    setError(null)
    try {
      setDrafts(toDrafts(await scanTicket(file, endpoint)))
    } catch (caught) {
      setError(caught instanceof ScanError ? caught.message : 'No se pudo leer el ticket.')
    } finally {
      setPending(false)
    }
  }

  const update = (id: number, patch: Partial<Draft>) => {
    setDrafts(
      (current) =>
        current?.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)) ?? null,
    )
  }

  const addSelected = () => {
    for (const draft of drafts ?? []) {
      if (!draft.selected) continue
      const price = parseAmount(draft.priceText)
      if (price === null) continue
      onAdd(draft.name, price, draft.quantity)
    }
    setDrafts(null)
  }

  return (
    <>
      <label
        htmlFor={inputId}
        className="mt-2 block border border-ink py-3 text-center text-ticket-sm uppercase tracking-ticket"
      >
        {pending ? 'Leyendo el ticket…' : 'Escanear ticket'}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void run(file)
        }}
      />

      {error && (
        <p role="alert" className="pt-2 text-ticket-sm text-accent">
          {error}
        </p>
      )}

      <Sheet open={drafts !== null} title="Revisa lo que ha leído" onClose={() => setDrafts(null)}>
        <p className="pb-2 text-ticket-xs text-ink-soft">
          Comprueba cada línea antes de añadirla. Una foto de un ticket arrugado se lee mal a
          menudo.
        </p>

        {drafts?.length === 0 && (
          <p className="py-4 text-ticket-sm text-ink-soft">No ha reconocido ninguna línea.</p>
        )}

        <ul>
          {drafts?.map((draft) => (
            <li key={draft.id} className="flex items-end gap-2 border-b border-rule py-2">
              <input
                type="checkbox"
                aria-label={`Añadir ${draft.name}`}
                checked={draft.selected}
                onChange={(event) => update(draft.id, { selected: event.target.checked })}
                className="size-5"
              />
              <TextInput
                className="flex-[3]"
                aria-label={`Concepto de la línea ${draft.id + 1}`}
                value={draft.name}
                onChange={(event) => update(draft.id, { name: event.target.value })}
              />
              <TextInput
                className="flex-1"
                aria-label={`Cantidad de la línea ${draft.id + 1}`}
                inputMode="numeric"
                value={String(draft.quantity)}
                onChange={(event) =>
                  update(draft.id, { quantity: Math.max(1, Number(event.target.value) || 1) })
                }
              />
              <TextInput
                className="flex-[2]"
                aria-label={`Precio de la línea ${draft.id + 1}`}
                inputMode="decimal"
                value={draft.priceText}
                invalid={parseAmount(draft.priceText) === null}
                onChange={(event) => update(draft.id, { priceText: event.target.value })}
              />
            </li>
          ))}
        </ul>

        <Button className="mt-4 w-full" onClick={addSelected}>
          Añadir seleccionados
        </Button>
      </Sheet>
    </>
  )
}
