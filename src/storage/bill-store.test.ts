import { beforeEach, describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import { loadBills, SCHEMA_VERSION, STORAGE_KEY, saveBills } from '@/storage/bill-store'

describe('bill-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('devuelve vacío cuando no hay nada guardado', () => {
    expect(loadBills()).toEqual({ bills: [], recovered: false })
  })

  it('guarda y recupera una cuenta completa', () => {
    const bill = makeBill({
      diners: [makeDiner('ana', 0, 'Ana')],
      items: [makeItem('i1', 1250, { mode: 'equal', dinerIds: ['ana'] })],
    })

    saveBills([bill])

    expect(loadBills()).toEqual({ bills: [bill], recovered: false })
  })

  it('escribe la versión de esquema', () => {
    saveBills([makeBill()])
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')

    expect(raw.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('arranca limpio y avisa si el JSON está corrupto', () => {
    localStorage.setItem(STORAGE_KEY, '{no es json')

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('arranca limpio y avisa si la forma no valida', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, bills: [{ id: 'x', title: 42 }] }),
    )

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('arranca limpio ante una versión de esquema futura', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, bills: [] }))

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('no revienta si localStorage lanza al escribir', () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage

    expect(() => saveBills([makeBill()], failing)).not.toThrow()
  })
})
