import { nanoid } from 'nanoid'
import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { Bill } from '@/core/types'
import { type BillAction, billReducer, createBill } from '@/state/bill-reducer'
import { loadBills, saveBills } from '@/storage/bill-store'

export type BillsContextValue = {
  bills: Bill[]
  recovered: boolean
  addBill: (title: string) => Bill
  importBill: (bill: Bill) => Bill
  removeBill: (billId: string) => void
  dispatchTo: (billId: string, action: BillAction) => void
  getBill: (billId: string) => Bill | undefined
}

export const BillsContext = createContext<BillsContextValue | null>(null)

const SAVE_DEBOUNCE_MS = 300

export function BillsProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadBills()).current
  const [bills, setBills] = useState<Bill[]>(initial.bills)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => saveBills(bills), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [bills])

  const addBill = useCallback((title: string) => {
    const bill = createBill(title)
    setBills((current) => [bill, ...current])
    return bill
  }, [])

  // A shared bill is saved as this device's own copy: a fresh id keeps it
  // from colliding with an existing bill, and edits stay local.
  const importBill = useCallback((incoming: Bill) => {
    const bill: Bill = { ...incoming, id: nanoid(), createdAt: Date.now() }
    setBills((current) => [bill, ...current])
    return bill
  }, [])

  const removeBill = useCallback((billId: string) => {
    setBills((current) => current.filter((bill) => bill.id !== billId))
  }, [])

  const dispatchTo = useCallback((billId: string, action: BillAction) => {
    setBills((current) =>
      current.map((bill) => (bill.id === billId ? billReducer(bill, action) : bill)),
    )
  }, [])

  const getBill = useCallback((billId: string) => bills.find((bill) => bill.id === billId), [bills])

  return (
    <BillsContext.Provider
      value={{
        bills,
        recovered: initial.recovered,
        addBill,
        importBill,
        removeBill,
        dispatchTo,
        getBill,
      }}
    >
      {children}
    </BillsContext.Provider>
  )
}
