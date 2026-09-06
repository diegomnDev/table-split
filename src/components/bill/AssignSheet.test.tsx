import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssignSheet } from '@/components/bill/AssignSheet'
import { makeDiner, makeItem } from '@/core/test-factories'

const diners = [makeDiner('ana', 0, 'Ana'), makeDiner('luis', 1, 'Luis')]

describe('AssignSheet', () => {
  it('no renderiza nada sin ítem', () => {
    const { container } = render(
      <AssignSheet item={null} diners={diners} onClose={() => {}} onApply={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('marca comensales y aplica un reparto a partes iguales', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <AssignSheet
        item={makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })}
        diners={diners}
        onClose={() => {}}
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^ana$/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    expect(onApply).toHaveBeenCalledWith({ mode: 'equal', dinerIds: ['ana'] })
  })

  it('el atajo "todos" marca a todo el mundo', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <AssignSheet
        item={makeItem('i1', 1000, { mode: 'equal', dinerIds: [] })}
        diners={diners}
        onClose={() => {}}
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /todos/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    expect(onApply).toHaveBeenCalledWith({ mode: 'equal', dinerIds: ['ana', 'luis'] })
  })

  it('con cantidad mayor que uno reparte por unidades', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <AssignSheet
        item={makeItem('i1', 350, { mode: 'equal', dinerIds: [] }, 3)}
        diners={diners}
        onClose={() => {}}
        onApply={onApply}
      />,
    )

    await user.click(screen.getByRole('button', { name: /sumar unidad a ana/i }))
    await user.click(screen.getByRole('button', { name: /sumar unidad a ana/i }))
    await user.click(screen.getByRole('button', { name: /sumar unidad a luis/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    expect(onApply).toHaveBeenCalledWith({ mode: 'units', units: { ana: 2, luis: 1 } })
  })

  it('avisa cuando las unidades no cuadran con la cantidad', async () => {
    const user = userEvent.setup()
    render(
      <AssignSheet
        item={makeItem('i1', 350, { mode: 'units', units: { ana: 1 } }, 3)}
        diners={diners}
        onClose={() => {}}
        onApply={() => {}}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/faltan 2/i)
    await user.click(screen.getByRole('button', { name: /sumar unidad a luis/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/falta 1/i)
  })
})
