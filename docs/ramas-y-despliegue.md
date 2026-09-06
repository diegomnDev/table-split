# Ramas y despliegue

## El reparto

| Rama | Para qué | Quién despliega de ella |
|---|---|---|
| `main` | Solo lo que va a producción | Vercel, entorno **Production** |
| `develop` | Integración. Rama **por defecto** en GitHub | Vercel, despliegues **Preview** |

Nada llega a `main` si no se va a desplegar. Todo lo demás —ramas de trabajo,
pull requests, actualizaciones automáticas— pasa por `develop`.

## Por qué `develop` es la rama por defecto

No es una preferencia: es la única forma de que funcione.

`target-branch` en `dependabot.yml` dirige las **actualizaciones de versión**, y
ahí se puede apuntar a `develop` sin más. Pero las **actualizaciones de
seguridad** de Dependabot van siempre contra la rama por defecto del
repositorio, y GitHub no ofrece ningún ajuste para cambiarlo.

Es decir: si `main` fuera la rama por defecto, cada aviso de vulnerabilidad
abriría un pull request directamente contra producción, que es justo lo que se
quiere evitar. Poniendo `develop` por defecto, las dos clases de actualización
acaban en el mismo sitio.

## La trampa de Vercel

Vercel toma como **Production Branch** la rama por defecto del repositorio. Al
hacer `develop` la rama por defecto, Vercel querrá desplegar `develop` a
producción, que es lo contrario de lo que quieres.

Hay que ponerlo a mano:

**Vercel → Settings → Git → Production Branch → `main`**

Compruébalo después de conectar el repositorio, y otra vez si alguna vez cambias
la rama por defecto. A partir de ahí, cada push a `develop` genera un despliegue
de Preview con su propia URL, que es un sitio cómodo para probar antes de tocar
producción.

## El ciclo

```bash
# trabajar
git switch develop
git switch -c fix/lo-que-sea
# ... commits ...
git push -u origin fix/lo-que-sea      # PR contra develop

# desplegar
git switch main
git merge --no-ff develop
git push                                # Vercel despliega a producción
```

CI se ejecuta en todas las ramas y en cada pull request, así que nada llega a
`main` sin haber pasado lint, tipos, tests y build.

## Al crear el repositorio

1. Subir ambas ramas.
2. **Settings → General → Default branch** → `develop`.
3. **Vercel → Settings → Git → Production Branch** → `main`.
4. Opcional, pero es lo que hace que `main` signifique algo: en **Settings →
   Rules** o en la protección de ramas, exigir que `main` solo se actualice por
   pull request y con CI en verde.
