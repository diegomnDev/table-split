import { beforeEach, describe, expect, it } from 'vitest'
import { makeBill, makeDiner, makeItem } from '@/core/test-factories'
import {
  LEGACY_STORAGE_KEY,
  loadBills,
  SCHEMA_VERSION,
  STORAGE_KEY,
  saveBills,
} from '@/storage/bill-store'

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

  it('lee las cuentas guardadas bajo el nombre anterior del proyecto', () => {
    const bill = makeBill({ title: 'Casa Paco' })
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, bills: [bill] }),
    )

    expect(loadBills().bills).toEqual([bill])
  })

  it('al guardar retira la clave antigua', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, bills: [] }),
    )

    saveBills([makeBill()])

    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('la clave nueva gana sobre la antigua', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, bills: [makeBill({ title: 'Vieja' })] }),
    )
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, bills: [makeBill({ title: 'Nueva' })] }),
    )

    expect(loadBills().bills[0]?.title).toBe('Nueva')
  })

  it('arranca limpio y avisa si el JSON está corrupto', () => {
    localStorage.setItem(STORAGE_KEY, '{no es json')

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('arranca limpio y avisa si la forma no valida', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2, bills: [{ id: 'x', title: 42 }] }),
    )

    expect(loadBills()).toEqual({ bills: [], recovered: true })
  })

  it('migra una cuenta guardada en el esquema 1 sin perder ítems', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        bills: [
          {
            id: 'b1',
            title: 'Casa Paco',
            createdAt: 123,
            diners: [{ id: 'ana', name: 'Ana', order: 0 }],
            items: [
              {
                id: 'i1',
                name: 'Pulpo',
                unitPrice: 1980,
                quantity: 1,
                assignment: { mode: 'equal', dinerIds: ['ana'] },
              },
            ],
            extras: [],
            payerId: 'ana',
          },
        ],
      }),
    )

    const loaded = loadBills()

    expect(loaded.recovered).toBe(false)
    expect(loaded.migratedFrom).toBe(1)
    expect(loaded.bills[0]?.title).toBe('Casa Paco')
    expect(loaded.bills[0]?.items[0]?.unitPrice).toBe(1980)
    expect(loaded.bills[0]?.payments).toEqual([])
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
