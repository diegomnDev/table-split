import { type ReactNode, useEffect } from 'react'

type SheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet. Closes on Escape and on backdrop tap, like a native one. */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-h-[80vh] overflow-y-auto bg-paper border-t-2 border-dashed border-ink-faint p-4 pb-[env(safe-area-inset-bottom)]"
      >
        <h2 className="text-ticket-sm tracking-ticket uppercase text-ink-soft mb-3">{title}</h2>
        {children}
      </div>
    </div>
  )
}
