import { Link, useNavigate, useParams } from 'react-router'
import { Amount } from '@/components/ui/amount'
import { Button } from '@/components/ui/button'
import { decodeBill } from '@/core/bill-code'
import { computeSplit } from '@/core/split'
import { useBills } from '@/state/use-bills'

export function ImportScreen() {
  const { code = '' } = useParams()
  const { importBill } = useBills()
  const navigate = useNavigate()

  const bill = decodeBill(code)

  if (!bill) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p role="alert" className="text-ticket-base text-accent">
          Ese enlace no es válido.
        </p>
        <Link to="/" className="text-ticket-sm underline">
          Ir a mis cuentas
        </Link>
      </main>
    )
  }

  const { billTotal } = computeSplit(bill)

  return (
    <main className="mx-auto max-w-md px-4 pb-8">
      <header className="border-b-2 border-dashed border-ink-faint py-4 text-center">
        <h1 className="text-ticket-lg uppercase tracking-ticket">Cuenta compartida</h1>
      </header>

      <div className="py-4">
        <p className="text-ticket-lg">{bill.title}</p>
        <p className="text-ticket-xs uppercase tracking-ticket text-ink-soft">
          {bill.diners.length} comensales · {bill.items.length} ítems
        </p>
        <p className="pt-2">
          <Amount cents={billTotal} className="text-ticket-xl" />
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            const saved = importBill(bill)
            navigate(`/b/${saved.id}`)
          }}
        >
          Guardar
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          Descartar
        </Button>
      </div>

      <p className="pt-3 text-ticket-xs text-ink-soft">
        Se guarda como una copia tuya. Editarla no cambia la de quien te pasó el enlace.
      </p>
    </main>
  )
}
