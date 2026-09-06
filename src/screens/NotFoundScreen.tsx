import { Link } from 'react-router'

/**
 * Catch-all route. Without it an unknown path renders nothing at all, which
 * looks like a crash — and an installed PWA serving a stale bundle hits exactly
 * that whenever a link points at a route the cached version does not know.
 */
export function NotFoundScreen() {
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-ticket-lg uppercase tracking-ticket">Aquí no hay nada</h1>
      <p className="py-3 text-ticket-base text-ink-soft">
        Esa dirección no existe. Si venías de un enlace compartido, puede que esté cortado.
      </p>
      <Link to="/" className="text-ticket-sm underline">
        Ir a mis cuentas
      </Link>
    </main>
  )
}
