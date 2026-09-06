import { initialsFor } from '@/components/bill/initials'
import { Amount } from '@/components/ui/amount'
import type { Diner, Item } from '@/core/types'

type ItemRowProps = {
  item: Item
  diners: Diner[]
  onOpenAssign: () => void
  onRemove: () => void
}

function assigneesOf(item: Item, diners: Diner[]): Diner[] {
  if (item.assignment.mode === 'equal') {
    const selected = new Set(item.assignment.dinerIds)
    return diners.filter((diner) => selected.has(diner.id))
  }
  const { units } = item.assignment
  return diners.filter((diner) => (units[diner.id] ?? 0) > 0)
}

export function ItemRow({ item, diners, onOpenAssign, onRemove }: ItemRowProps) {
  const assignees = assigneesOf(item, diners)

  return (
    <li className="flex items-center gap-2 border-b border-rule">
      <button type="button" onClick={onOpenAssign} className="min-h-11 flex-1 py-2 text-left">
        <span className="block text-ticket-base">
          {item.quantity > 1 ? `${item.quantity}× ` : ''}
          {item.name}
        </span>
        <span className="block text-ticket-xs uppercase tracking-ticket text-ink-soft">
          {assignees.length === 0
            ? 'Sin asignar'
            : assignees.map((diner) => initialsFor(diner.name)).join(' · ')}
        </span>
      </button>
      <Amount cents={item.unitPrice * item.quantity} className="text-ticket-base" />
      <button
        type="button"
        aria-label={`Borrar ${item.name}`}
        onClick={onRemove}
        className="min-h-11 px-2 text-accent"
      >
        ×
      </button>
    </li>
  )
}
