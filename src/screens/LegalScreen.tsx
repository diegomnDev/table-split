import { Link } from 'react-router'
import { OWNER, ownerIsConfigured } from '@/legal/owner'
import { scanEndpoint } from '@/scan/scan-client'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-4">
      <h2 className="pb-2 text-ticket-xs uppercase tracking-ticket text-ink-soft">{title}</h2>
      <div className="space-y-2 text-ticket-base leading-relaxed">{children}</div>
    </section>
  )
}

export function LegalScreen() {
  const scanEnabled = scanEndpoint() !== null
  const configured = ownerIsConfigured()

  return (
    <main className="mx-auto max-w-md px-4 pb-8">
      <header className="border-b-2 border-dashed border-ink-faint py-4 text-center">
        <Link to="/" className="float-left text-ticket-sm text-ink-soft">
          ←
        </Link>
        <h1 className="text-ticket-lg uppercase tracking-ticket">Legal</h1>
      </header>

      {!configured && (
        <p role="alert" className="mt-4 text-ticket-sm text-accent">
          Esta copia no está lista para publicarse: falta indicar quién es el responsable en{' '}
          <code>src/legal/owner.ts</code>.
        </p>
      )}

      <Section title="Quién responde de esta app">
        <p>
          {configured ? OWNER.name : '[responsable sin configurar]'}, contacto{' '}
          {configured ? OWNER.email : '[contacto sin configurar]'}.
        </p>
        <p>
          Es un proyecto personal y gratuito. No hay publicidad, ni patrocinios, ni compras, ni
          cuentas de usuario.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          <strong>Esta app no usa cookies</strong> y no lleva ninguna herramienta de analítica ni de
          terceros. Por eso no verás ninguna ventana pidiéndote permiso.
        </p>
        <p>
          Sí guarda tus cuentas en el almacenamiento local de tu navegador. Eso no necesita tu
          consentimiento porque es justo lo que has venido a hacer: sin ese guardado no habría app.
          Esos datos no salen de tu dispositivo, no los recibe nadie, y desaparecen si borras los
          datos del navegador.
        </p>
      </Section>

      <Section title="Qué datos se tratan">
        <p>
          Los nombres de comensales, los conceptos y los importes que escribes viven solo en tu
          navegador.
        </p>
        {scanEnabled ? (
          <p>
            Si usas <strong>escanear ticket</strong>, esa foto concreta sale de tu dispositivo: va a
            un servidor intermedio en Cloudflare y de ahí a la API de Gemini de Google, que devuelve
            las líneas detectadas. Ni el servidor intermedio ni esta app guardan la foto: se usa
            para esa lectura y se descarta. No fotografíes nada que no quieras enviar.
          </p>
        ) : (
          <p>
            En esta instalación el escaneo de tickets está desactivado, así que ninguna imagen sale
            de tu dispositivo.
          </p>
        )}
        <p>
          El alojamiento registra datos técnicos de cada visita, incluida tu dirección IP, para
          servir la página y protegerla de abusos. Es un registro propio del alojamiento, no un
          seguimiento de personas.
        </p>
      </Section>

      <Section title="Compartir una cuenta">
        <p>
          El enlace para compartir lleva la cuenta entera codificada dentro, después de la
          almohadilla. Esa parte de la dirección no se envía a ningún servidor: viaja solo entre
          quien lo manda y quien lo abre.
        </p>
        <p>
          Aun así, quien tenga el enlace ve la cuenta. Trátalo como tratarías una foto del ticket.
        </p>
      </Section>

      <Section title="Base legal y tus derechos">
        <p>
          Lo que se trata fuera de tu dispositivo se trata para poder prestarte el servicio que has
          pedido, y para mantener la página en pie y segura.
        </p>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
          portabilidad escribiendo a {configured ? OWNER.email : '[contacto sin configurar]'}.
          También puedes reclamar ante la Agencia Española de Protección de Datos (
          <a href="https://www.aepd.es" className="underline">
            aepd.es
          </a>
          ).
        </p>
        <p>
          Para borrar todo lo que hay en tu dispositivo: borra las cuentas desde la app, o borra los
          datos del sitio en tu navegador.
        </p>
      </Section>

      <Section title="Encargados y transferencias">
        <p>
          Cloudflare aloja la página y, si el escaneo está activo, el servidor intermedio. Google
          presta el servicio de lectura de la foto. Ambos actúan como encargados del tratamiento,
          con sus contratos y garantías para transferencias fuera del Espacio Económico Europeo.
        </p>
      </Section>

      <Section title="Inteligencia artificial">
        <p>
          La lectura del ticket la hace un modelo de inteligencia artificial. Puede equivocarse, y
          por eso la app te enseña siempre lo que ha leído para que lo revises antes de meterlo en
          la cuenta. Ninguna decisión se toma automáticamente sobre ti.
        </p>
      </Section>

      <Section title="Cambios">
        <p>
          Si esto cambia, cambiará este texto. No hay versiones anteriores que consultar: la app se
          publicó con este mismo aviso.
        </p>
      </Section>
    </main>
  )
}
