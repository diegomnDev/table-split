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
