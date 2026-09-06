import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NotFoundScreen } from '@/screens/NotFoundScreen'

describe('rutas desconocidas', () => {
  it('muestran una pantalla, nunca una página en blanco', () => {
    render(
      <MemoryRouter initialEntries={['/ruta/que/no/existe']}>
        <Routes>
          <Route path="/" element={<p>Mis cuentas</p>} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /aquí no hay nada/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir a mis cuentas/i })).toBeInTheDocument()
  })
})
