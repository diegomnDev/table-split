# Desplegar table-split en Vercel

Todo lo que queda por hacer, en orden. Nada de esto lo puedo ejecutar yo: hace
falta tu sesión de Vercel y tu cuenta de Google.

Al terminar tendrás la app en un dominio de Vercel, con el escaneo de tickets
funcionando y sin pagar nada.

## Antes de empezar

Necesitas:

- Una cuenta de Vercel. El plan **Hobby** es gratis y sirve: 1 millón de
  invocaciones de función al mes y 100 GB de transferencia. Está restringido a
  uso **personal y no comercial**, que es exactamente este caso. Si algún día
  metes publicidad o cobras, incumples y hay que pasar a Pro.
- Una clave de la API de Gemini, de [aistudio.google.com](https://aistudio.google.com).
  La capa gratuita no pide tarjeta.
- El repositorio en GitHub, o el CLI de Vercel instalado (`npm i -g vercel`).

## 1. Subir el repositorio

Si aún no está en GitHub:

```bash
gh repo create table-split --private --source=. --push
```

Puedes desplegar sin GitHub usando solo el CLI, pero entonces pierdes los
despliegues automáticos en cada push.

## 2. Crear el proyecto en Vercel

Desde el panel: **Add New → Project**, eliges el repositorio y Vercel detecta
Vite solo. Los valores que debe mostrar:

| Ajuste | Valor |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 22.x o superior |

Desde el CLI, el equivalente es:

```bash
vercel link
```

No hace falta tocar nada más: `vercel.json` ya trae las reescrituras de SPA, la
región y las cabeceras de seguridad.

## 3. Variables de entorno

En **Settings → Environment Variables**, para los tres entornos (Production,
Preview, Development):

| Nombre | Valor | Tipo |
|---|---|---|
| `GEMINI_API_KEY` | tu clave de AI Studio | **Sensitive** |
| `VITE_SCAN_ENDPOINT` | `/api/scan` | normal |

Dos cosas importantes:

- **`GEMINI_API_KEY` no lleva prefijo `VITE_`, y eso es deliberado.** Vite
  inyecta en el bundle del navegador cualquier variable que empiece por `VITE_`.
  Si la clave llevara ese prefijo, acabaría publicada en el JavaScript de la
  página y cualquiera podría gastarte la cuota. La función la lee del servidor
  con `process.env`.
- Márcala como **Sensitive** para que ni tú puedas volver a leerla desde el
  panel.
- Si dejas `VITE_SCAN_ENDPOINT` vacío, la app se despliega igual pero sin botón
  de escanear, y ninguna imagen sale nunca del dispositivo.

## 4. Desplegar

```bash
vercel --prod
```

O simplemente haz push a la rama principal si conectaste GitHub.

## 5. Comprobaciones después del primer despliegue

Hazlas en este orden. Si alguna falla, para y arréglala antes de seguir.

1. **La app carga.** Abre la URL de producción.
2. **Los enlaces profundos funcionan.** Ve a `https://TU-DOMINIO/legal` y
   recarga con F5. Si sale un 404, la reescritura de SPA no se aplicó: revisa
   que `vercel.json` esté en la raíz del repositorio.
3. **El aviso legal está completo.** En `/legal` no debe aparecer ningún aviso
   rojo. Si aparece, falta rellenar `src/legal/owner.ts`.
4. **El escaneo responde.** Crea una cuenta, pulsa *Escanear ticket* y sube una
   foto. Si devuelve "El escaneo no está configurado en este despliegue", falta
   `GEMINI_API_KEY` o no se ha redesplegado después de añadirla — las variables
   de entorno solo entran en despliegues nuevos.
5. **La cuota se ve.** Mira el uso en AI Studio después de un par de escaneos.
6. **Instálala en el móvil.** Abre la URL en el móvil, "Añadir a pantalla de
   inicio", y comprueba que el icono es el ticket partido y que la app abre a
   pantalla completa.
7. **Funciona sin cobertura.** Con la app instalada, pon el móvil en modo avión
   y ábrela. Debe cargar y dejarte meter ítems a mano. El escaneo no, que
   necesita red por definición.

## 6. Dominio propio (opcional)

**Settings → Domains**, añades el dominio y creas el registro DNS que te indique
Vercel. El certificado lo emite Vercel solo.

Si lo haces, no hay que tocar nada más: la función vive en el mismo origen que
la app, así que no hay ninguna lista de orígenes permitidos que actualizar.

## Cuánto cuesta

Cero, con las cuentas que ya tienes:

| Servicio | Plan | Límite relevante |
|---|---|---|
| Vercel | Hobby | 1 M invocaciones/mes, 100 GB transferencia |
| Gemini API | Capa gratuita | ~10 peticiones/minuto, ~1.500/día |

Un escaneo consume unos 1.800 tokens. Para dividir cuentas de cenas no vas a
acercarte a ningún límite.

Si te pasas de la cuota de Gemini, la función devuelve un mensaje explicando que
se agotó la cuota y la entrada manual sigue funcionando. La app nunca depende
del escaneo.

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| 404 al recargar en `/legal` o `/b/algo` | Falta la reescritura de SPA: `vercel.json` no está en la raíz |
| "El escaneo no está configurado" | `GEMINI_API_KEY` sin poner, o puesta después del último despliegue |
| El botón de escanear no aparece | `VITE_SCAN_ENDPOINT` vacío. Es el interruptor, y las variables `VITE_` solo se leen al construir |
| "El servicio de lectura está saturado" | Los modelos de Gemini están ocupados. Es transitorio; se reintenta con otro modelo automáticamente |
| Sigues viendo la versión antigua | El service worker sirve lo que tiene en caché. Recarga forzada, o cierra todas las pestañas de la app |

Los registros de la función están en **Vercel → Logs**. Ahí aparece el error real
de Google cuando algo falla arriba; al navegador nunca se le manda ese cuerpo,
porque puede llevar detalles de la cuota o trozos de la petición.

## Lo que queda fuera de esta guía

- Rellenar `src/legal/owner.ts` con una identidad real si el alias `DiegoMN` no
  te sirve. Está en `docs/legal-despliegue.md`.
- Probar el escaneo con un ticket térmico de verdad, arrugado. Todo lo que se ha
  probado hasta ahora usaba un ticket generado y limpio.
