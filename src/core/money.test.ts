import { describe, expect, it } from 'vitest'
import { distribute, formatAmount, parseAmount } from '@/core/money'

describe('parseAmount', () => {
  it('acepta coma decimal', () => {
    expect(parseAmount('12,50')).toBe(1250)
  })

  it('acepta punto decimal', () => {
    expect(parseAmount('12.50')).toBe(1250)
  })

  it('acepta enteros, espacios y el símbolo de euro', () => {
    expect(parseAmount(' 7 € ')).toBe(700)
  })

  it('acepta un solo decimal', () => {
    expect(parseAmount('3,5')).toBe(350)
  })

  it('acepta negativos para descuentos', () => {
    expect(parseAmount('-4,20')).toBe(-420)
  })

  it('rechaza basura en vez de convertirla en cero', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('12,345')).toBeNull()
    expect(parseAmount('1,2,3')).toBeNull()
  })

  it('no pierde céntimos por coma flotante', () => {
    expect(parseAmount('0,29')).toBe(29)
    expect(parseAmount('1,10')).toBe(110)
    expect(parseAmount('8,70')).toBe(870)
  })
})

describe('formatAmount', () => {
  it('formatea en es-ES con dos decimales', () => {
    expect(formatAmount(1250)).toBe('12,50 €')
  })

  it('rellena los céntimos a dos dígitos', () => {
    expect(formatAmount(1205)).toBe('12,05 €')
    expect(formatAmount(1200)).toBe('12,00 €')
  })

  it('formatea el cero y los negativos', () => {
    expect(formatAmount(0)).toBe('0,00 €')
    expect(formatAmount(-420)).toBe('-4,20 €')
  })

  // Spanish uses minimumGroupingDigits 2: four-digit numbers stay ungrouped.
  it('no agrupa cuatro dígitos, agrupa cinco', () => {
    expect(formatAmount(123456)).toBe('1234,56 €')
    expect(formatAmount(1234567)).toBe('12.345,67 €')
  })
})

describe('distribute', () => {
  it('reparte exacto cuando divide sin resto', () => {
    expect(distribute(900, [1, 1, 1])).toEqual([300, 300, 300])
  })

  it('da el céntimo sobrante al de mayor resto, con desempate por posición', () => {
    expect(distribute(1000, [1, 1, 1])).toEqual([334, 333, 333])
  })

  it('reparte dos céntimos sobrantes a los dos primeros', () => {
    expect(distribute(1001, [1, 1, 1])).toEqual([334, 334, 333])
  })

  it('respeta los pesos', () => {
    expect(distribute(1050, [2, 1])).toEqual([700, 350])
  })

  it('conserva la suma con pesos desiguales y resto', () => {
    const parts = distribute(1000, [3, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('reparte negativos conservando la suma', () => {
    expect(distribute(-1000, [1, 1, 1])).toEqual([-334, -333, -333])
  })

  it('devuelve vacío sin destinatarios', () => {
    expect(distribute(1000, [])).toEqual([])
  })

  it('devuelve ceros si todos los pesos son cero', () => {
    expect(distribute(1000, [0, 0])).toEqual([0, 0])
  })

  it('ignora a los de peso cero al repartir', () => {
    expect(distribute(1000, [1, 0, 1])).toEqual([500, 0, 500])
  })
})
