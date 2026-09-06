# Cumplimiento legal antes de desplegar

Estado: investigado a 6 de septiembre de 2026. Aplica a una app publicada desde
España, gratuita, sin cuentas de usuario, sin publicidad y sin analítica.

Esto es un análisis técnico, no asesoramiento jurídico. Si la app deja de ser
gratuita, mete publicidad o añade analítica, todo lo de abajo cambia.

## Resumen

| Obligación | ¿Aplica? | Qué se ha hecho |
|---|---|---|
| Banner de cookies | **No** | Nada que instalar. Justificado abajo |
| Información sobre almacenamiento local | Sí | Sección en `/legal` |
| Política de privacidad (RGPD art. 13) | Sí | `/legal` |
| Identidad del responsable | Sí | `src/legal/owner.ts` — rellenado |
| Aviso legal LSSI-CE | Probablemente no | Se incluye igualmente lo esencial |
| Transparencia de IA (RIA art. 50) | Sí | Aviso antes de subir la foto |
| Accesibilidad (EAA) | Probablemente no | La app ya cumple lo básico |
| Encargados y transferencias | Sí | Sección en `/legal` |

## Por qué no hace falta banner de cookies

El artículo 5.3 de la Directiva ePrivacy no habla de cookies, sino de
**almacenar o acceder a información en el equipo del usuario**. Las
[directrices 2/2023 del CEPD](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf),
adoptadas en octubre de 2024, dejan claro que eso incluye `localStorage`, no
solo cookies. Así que la pregunta correcta no es "¿usamos cookies?" sino
"¿entra nuestro almacenamiento en alguna excepción?".

Entra. La excepción es el almacenamiento **estrictamente necesario para prestar
un servicio solicitado expresamente por el usuario**. Esta app guarda las
cuentas que el propio usuario acaba de crear, en su propio dispositivo, y sin
ese guardado la app no hace nada. Es el caso de manual.

Lo que sí sobrevive a la excepción es el **deber de informar**: la
[guía de cookies de la AEPD](https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-actualiza-guia-cookies-para-adaptarla-a-nuevas-directrices-cepd)
mantiene que hay que contarlo, por ejemplo en la política de privacidad. Está
en `/legal`.

**Esto se rompe en el momento en que añadas analítica**, incluida Vercel Web
Analytics o Speed Insights. Ahí ya hay que evaluar consentimiento. Hoy la app no
lleva ninguna, y ese es el motivo de que no haya banner.

El Reglamento ePrivacy que llevaba años en trámite fue **retirado por la
Comisión en febrero de 2025**, así que sigue mandando la Directiva de 2002
traspuesta en el artículo 22.2 de la LSSI.

## Por qué sí hace falta política de privacidad

Aunque los datos de la cuenta no salgan del dispositivo, hay dos tratamientos
reales en los que decides tú los fines y los medios, y por tanto eres
responsable del tratamiento:

1. **El alojamiento.** Vercel registra la IP de cada visita. Una IP es dato
   personal.
2. **El escaneo del ticket.** La foto sale del dispositivo, pasa por tu función
   en Vercel y llega a Google. Puede contener datos personales.

Sin esos dos, el caso sería mucho más flojo. Con ellos, la política es
obligatoria.

## Aviso legal (LSSI-CE)

El artículo 10 de la Ley 34/2002 obliga a identificarse a quien presta
servicios de la sociedad de la información **con actividad económica**. Una app
gratuita, sin publicidad ni patrocinios, no la tiene, así que la obligación
formal probablemente no aplica.

Da igual: el RGPD ya te obliga a identificarte como responsable, así que el
nombre y el contacto tienen que estar de todas formas. Por eso `/legal` los
incluye y por eso la pantalla avisa mientras estén sin rellenar.

## Reglamento de IA (RIA)

Las obligaciones de transparencia del **artículo 50 están en vigor desde el 2 de
agosto de 2026**. La lectura del ticket no es un chatbot, ni reconocimiento de
emociones, ni un *deepfake*, así que no cae en los supuestos más duros. Lo
razonable, y lo que se ha hecho, es decir claramente que quien lee la foto es un
modelo de IA y que puede equivocarse, antes de que el usuario suba nada.

La app no toma ninguna decisión automatizada sobre personas: el usuario revisa y
confirma cada línea. Eso también evita el artículo 22 del RGPD.

## Accesibilidad (EAA)

La Ley Europea de Accesibilidad se aplica desde el 28 de junio de 2025 a
productos y servicios ofrecidos **a consumidores en el mercado**, con exención
para microempresas que prestan servicios. Un proyecto personal y gratuito no
encaja en ese supuesto de actividad económica.

Aun así la app ya trae objetivos táctiles de 44 px, etiquetas accesibles en
todos los campos, avisos con `role="alert"` y contraste alto. No hay motivo para
empeorarlo.

## Google Gemini: qué papel juega

Los [términos de la API](https://ai.google.dev/gemini-api/terms) dicen, textual:

> "If you're in the European Economic Area, Switzerland, or the United Kingdom,
> the terms under 'How Google uses Your Data' in 'Paid Services' apply to all
> Services, including Google AI Studio and unpaid quota in the Gemini API, even
> though they are offered free of charge."

Y las condiciones de *Paid Services* remiten al *Data Processing Addendum for
Products Where Google is a Data Processor*. Desde España, por tanto, incluso en
la cuota gratuita: **Google actúa como encargado del tratamiento y no usa los
datos para entrenar**. Fuera del EEE eso no es cierto.

Esta es la razón por la que el proyecto puede usar la capa gratuita sin que sea
un problema de privacidad. Si algún día lo despliegas fuera del EEE, deja de
serlo.

## El enlace para compartir

La cuenta va codificada en el **fragmento** de la URL, después de la
almohadilla. El fragmento no se envía en la petición HTTP, así que no aparece en
los registros de acceso del alojamiento.

Estuvo en la ruta durante parte del desarrollo, y ahí sí habría acabado en los
registros de acceso de Vercel con nombres e importes dentro. Corregido antes de
desplegar.

## Checklist antes de publicar

- [ ] Revisar `src/legal/owner.ts`: ahora pone el alias `DiegoMN`. Si alguien
      ejerce sus derechos, la ley espera una identidad real, no un apodo.
- [ ] Abrir `/legal` en la app desplegada y comprobar que no sale el aviso rojo.
- [ ] Confirmar que no se ha añadido analítica de ningún tipo. Si se añade, hay
      que replantear el consentimiento.
- [ ] Comprobar que `vercel.json` mantiene `"regions": ["fra1"]`, para que la
      función procese la foto en Fráncfort y no fuera del EEE.
- [ ] Aceptar el DPA de Vercel en el panel de la cuenta.
- [ ] No activar Vercel Web Analytics ni Speed Insights.
- [ ] Comprobar que el escaneo enseña el aviso de IA antes de subir la foto.
- [ ] Decidir si el escaneo se despliega o no: sin `VITE_SCAN_ENDPOINT`, no sale
      ninguna imagen del dispositivo y la superficie legal se reduce a la IP del
      alojamiento.

## Dónde se procesa

`vercel.json` fija `"regions": ["fra1"]`, es decir Fráncfort. Sin eso, la
función podría ejecutarse en cualquier región y la foto saldría del EEE antes
incluso de llegar a Google. Es una línea de configuración con consecuencias
legales, no una preferencia de latencia.

## Fuentes

- [CEPD, Directrices 2/2023 sobre el alcance técnico del art. 5.3 ePrivacy](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)
- [AEPD, actualización de la guía de cookies](https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-actualiza-guia-cookies-para-adaptarla-a-nuevas-directrices-cepd)
- [Términos adicionales de la API de Gemini](https://ai.google.dev/gemini-api/terms)
- [RIA, artículo 50: obligaciones de transparencia](https://artificialintelligenceact.eu/article/50/)
- [Comisión Europea: normas de transparencia de IA desde el 2 de agosto de 2026](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations)
- [Exenciones de la Ley Europea de Accesibilidad](https://www.taylorwessing.com/en/interface/2025/accessibility/key-eu-accessibility-act-exemptions-and-the-challenges-they-pose)
