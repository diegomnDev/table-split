import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { OWNER, ownerIsConfigured, PLACEHOLDER } from '@/legal/owner'
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

  it('identifica al responsable y da un contacto', () => {
    renderLegal()
    expect(screen.getByText(new RegExp(OWNER.name, 'i'))).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(OWNER.email, 'i')).length).toBeGreaterThan(0)
  })

  it('no muestra el aviso de configuración pendiente', () => {
    renderLegal()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('nunca muestra el marcador de relleno como si fuera un dato real', () => {
    renderLegal()
    expect(screen.queryByText(new RegExp(PLACEHOLDER, 'i'))).not.toBeInTheDocument()
  })
})

describe('LegalScreen sin escaneo', () => {
  it('no declara a Google como encargado si el escaneo está apagado', () => {
    renderLegal()

    expect(screen.getByText(/escaneo de tickets está desactivado/i)).toBeInTheDocument()
    expect(screen.queryByText(/Google presta el servicio/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /inteligencia artificial/i }),
    ).not.toBeInTheDocument()
  })
})

describe('ownerIsConfigured', () => {
  it('es falso mientras quede un marcador', () => {
    expect(ownerIsConfigured({ name: 'Ana', email: PLACEHOLDER })).toBe(false)
  })

  it('es cierto con nombre y correo puestos', () => {
    expect(ownerIsConfigured({ name: 'Ana', email: 'ana@ejemplo.es' })).toBe(true)
  })
})
