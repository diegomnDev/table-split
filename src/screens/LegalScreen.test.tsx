import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ownerIsConfigured, PLACEHOLDER } from '@/legal/owner'
import { LegalScreen } from '@/screens/LegalScreen'

function renderLegal() {
  return render(
    <MemoryRouter>
      <LegalScreen />
    </MemoryRouter>,
  )
}

describe('LegalScreen', () => {
  it('declara que no hay cookies', () => {
    renderLegal()
    expect(screen.getByText(/no usa cookies/i)).toBeInTheDocument()
  })

  it('explica el almacenamiento local y el derecho a borrarlo', () => {
    renderLegal()
    expect(screen.getByText(/almacenamiento local de tu navegador/i)).toBeInTheDocument()
    expect(screen.getByText(/borra los datos del sitio/i)).toBeInTheDocument()
  })

  it('nombra la autoridad de control', () => {
    renderLegal()
    expect(screen.getByRole('link', { name: /aepd/i })).toHaveAttribute(
      'href',
      'https://www.aepd.es',
    )
  })

  it('avisa mientras el responsable esté sin rellenar', () => {
    renderLegal()
    expect(screen.getByRole('alert')).toHaveTextContent(/falta indicar quién es el responsable/i)
  })

  it('nunca muestra el marcador de relleno como si fuera un dato real', () => {
    renderLegal()
    expect(screen.queryByText(new RegExp(PLACEHOLDER, 'i'))).not.toBeInTheDocument()
  })
})

describe('ownerIsConfigured', () => {
  it('es falso mientras quede un marcador', () => {
    expect(
      ownerIsConfigured({
        name: 'Ana',
        email: PLACEHOLDER,
        domain: 'ejemplo.es',
        commercial: false,
      }),
    ).toBe(false)
  })

  it('es cierto con los tres datos puestos', () => {
    expect(
      ownerIsConfigured({
        name: 'Ana',
        email: 'ana@ejemplo.es',
        domain: 'ejemplo.es',
        commercial: false,
      }),
    ).toBe(true)
  })
})
