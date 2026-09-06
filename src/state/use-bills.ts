import { useContext } from 'react'
import { BillsContext, type BillsContextValue } from '@/state/bills-context'

export function useBills(): BillsContextValue {
  const context = useContext(BillsContext)
  if (!context) throw new Error('useBills debe usarse dentro de <BillsProvider>')
  return context
}
