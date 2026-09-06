import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { encodeBill } from '@/core/bill-code'
import { billSummary } from '@/core/summary'
import type { Bill, SplitResult } from '@/core/types'

type ShareBarProps = {
  bill: Bill
  result: SplitResult
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard access is denied outside a secure context and in some
    // in-app browsers. Failing silently would look like the button is broken.
    return false
  }
}

export function ShareBar({ bill, result }: ShareBarProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [fallback, setFallback] = useState<string | null>(null)

  const share = async (label: string, text: string) => {
    if (await copy(text)) {
      setCopied(label)
      setFallback(null)
      return
    }
    setCopied(null)
    setFallback(text)
  }

  // The code goes in the fragment, never the path. A path is sent to the
  // server on every request and lands in its access logs; a fragment never
  // leaves the browser. The whole bill travels inside this code.
  const link = `${window.location.origin}/i#${encodeBill(bill)}`

  return (
    <section className="border-t-2 border-dashed border-ink-faint py-4">
      <h2 className="text-ticket-xs uppercase tracking-ticket text-ink-soft">Compartir</h2>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="ghost" onClick={() => share('resumen', billSummary(bill, result))}>
          Copiar resumen
        </Button>
        <Button variant="ghost" onClick={() => share('enlace', link)}>
          Copiar enlace
        </Button>
      </div>

      {copied && (
        <p role="status" className="pt-2 text-ticket-sm text-ink-soft">
          Copiado el {copied}.
        </p>
      )}

      {fallback && (
        <div className="pt-2">
          <p role="alert" className="text-ticket-sm text-accent">
            No se pudo copiar. Selecciona el texto y cópialo a mano.
          </p>
          <textarea
            readOnly
            aria-label="Texto para copiar"
            value={fallback}
            rows={6}
            className="mt-1 w-full border border-rule bg-transparent p-2 text-ticket-sm"
          />
        </div>
      )}

      <p className="pt-2 text-ticket-xs text-ink-soft">
        El enlace lleva la cuenta entera dentro: quien lo tenga la ve, y una cuenta larga hace un
        enlace largo.
      </p>
    </section>
  )
}
