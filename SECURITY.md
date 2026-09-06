# Seguridad

## Cómo avisar de un fallo

Escribe a **chengokuu@gmail.com** con el asunto `table-split: seguridad`. No
abras una issue pública para un fallo explotable.

Es un proyecto personal, así que no hay compromiso de tiempo de respuesta ni
programa de recompensas. Se responde cuando se puede.

## Qué hay en juego

La app guarda las cuentas en el `localStorage` del navegador de cada persona. No
hay cuentas de usuario, ni base de datos, ni servidor que almacene nada. Un
fallo aquí no expone los datos de terceros: expone, como mucho, los del propio
navegador donde se explote.

Lo que sí merece un aviso privado:

- Cualquier forma de hacer que la clave de la API de Gemini salga de la función
  `api/scan.ts`, o de usarla desde fuera.
- Cualquier forma de que el contenido de una cuenta acabe en un servidor. El
  enlace para compartir va en el fragmento de la URL precisamente para que no
  llegue a los registros de acceso; si encuentras un camino por el que sí
  llegue, es un fallo.
- XSS, o cualquier forma de ejecutar código en el origen de la app.

## Lo que ya se sabe y no es un fallo

- **Quien tenga el enlace de una cuenta compartida, ve esa cuenta.** El enlace
  lleva la cuenta entera codificada dentro. Es el diseño, y está avisado en la
  interfaz y en `/legal`.
- **`api/scan.ts` no tiene autenticación ni límite de peticiones propio.** Quien
  descubra la URL puede gastar la cuota gratuita de Gemini. El daño máximo es
  quedarse sin escaneo hasta el día siguiente; la entrada manual no depende de
  ello.
- **Los datos se pierden al borrar los datos del navegador.** No hay copia en
  ningún sitio, a propósito.
