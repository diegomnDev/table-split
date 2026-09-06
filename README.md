# table-split

Divide la cuenta del restaurante entre comensales. Funciona sin conexión, no
necesita registro y no envía datos a ningún sitio: todo vive en el navegador.

## Desarrollo

```bash
npm install
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build, para probar la PWA |
| `npm run test` | Tests (Vitest) |
| `npm run lint` | Lint y formato (Biome) |
| `npm run typecheck` | Comprobación de tipos |

## Cómo está organizado

- `src/core/` — TypeScript puro. Todo el cálculo de dinero, sin React.
  `computeSplit` garantiza que el reparto más lo no asignado suma el total.
- `src/storage/` — persistencia en `localStorage`, validada con Zod.
- `src/state/` — reducer puro y proveedor de React.
- `src/screens/`, `src/components/` — interfaz.
- `src/styles/theme.css` — todos los tokens visuales. Reestilizar la app es
  editar este archivo.
- `api/scan.ts` — la función que guarda la clave de Gemini y lee la foto.
- `assets/icon.svg` — origen único del logo, los iconos y el favicon.

Los importes son siempre enteros de céntimos. Los floats no representan dinero.

## Qué hace

- Entrada manual de ítems, comensales y asignación individual, compartida o por unidades.
- Extras: propina, cubierto y descuentos, a partes iguales entre todos.
- Varios pagadores: registras quién puso cuánto y la app calcula las transferencias que saldan la cuenta.
- Compartir: copiar el resumen como texto pegable, o un enlace que lleva la cuenta entera dentro.
- Escanear el ticket con la cámara, si el despliegue tiene clave de Gemini.
- Funciona sin conexión salvo el escaneo, que necesita red por definición.

## Reglas de reparto

- Los ítems se reparten a partes iguales entre los comensales marcados. Si un
  ítem tiene cantidad mayor que uno, se puede repartir por unidades.
- Los extras (propina, cubierto, descuentos) se reparten a partes iguales entre
  todos los comensales, hayan consumido o no. Un descuento es un extra negativo.
- El redondeo usa el método del resto mayor: los céntimos sobrantes se asignan
  al de mayor resto, y los empates los decide el orden de creación. La suma de
  las partes coincide siempre con el total del ticket.
- Un ítem sin asignar no se reparte a escondidas: cuenta en el total, aparece
  como "sin asignar" y genera un aviso.
- Las transferencias se calculan con emparejamiento voraz entre quien tiene
  saldo a favor y quien lo tiene en contra. No garantiza el mínimo teórico de
  transferencias, que es NP-duro, pero sí es óptimo con uno o dos pagadores y
  salda todos los saldos exactamente.
- Si lo pagado no suma el total, la app lo dice y no te deja fiarte de las
  transferencias.

## Escanear el ticket

Opcional y a coste cero. La clave de la API no puede vivir en el navegador, así
que la guarda una función en `api/scan.ts`, que se despliega en el mismo dominio
que la app. Al ser mismo origen no hay CORS que configurar.

Sin `VITE_SCAN_ENDPOINT` el botón no aparece y la app funciona igual. Copia
`.env.example` a `.env` para activarlo en local.

## Legal

Sin cookies, sin analítica, sin cuentas: por eso no lleva banner de
consentimiento. El almacenamiento local entra en la excepción de "estrictamente
necesario" del art. 5.3 de ePrivacy, y el deber de informar se cumple en
`/legal`.

El responsable y el contacto salen de `src/legal/owner.ts`; la pantalla
`/legal` avisa en rojo si se quedan sin configurar. El análisis completo y la
lista de comprobación están en `docs/legal-despliegue.md`.

Añadir analítica de cualquier tipo invalida lo anterior y obliga a replantear el
consentimiento.

## Despliegue

Vercel. Los pasos completos, con variables de entorno y comprobaciones, están en
`docs/despliegue-vercel.md`.
