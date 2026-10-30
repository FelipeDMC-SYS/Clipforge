# Subir ClipForge a GitHub

Este ZIP contiene el proyecto completo. Puedes guardar el código en GitHub y, si quieres, publicar el editor con GitHub Pages. Son dos pasos separados.

## 1. Preparar la carpeta

1. Extrae el ZIP completo en tu computadora.
2. Entra en `ClipForge`. Ahí deben estar `README.md`, `package.json`, `dist/`, `scripts/`, `tests/` y `.github/`.
3. Para probarlo antes de subirlo, instala [Node.js](https://nodejs.org/) 22 o superior, abre `INICIAR_CLIPFORGE.bat` en Windows y visita <http://localhost:8000/>. No hace falta instalar dependencias para abrirlo.
4. Instala [Git](https://git-scm.com/downloads) si aún no lo tienes.

La carpeta `.github` y los archivos `.gitignore` y `.gitattributes` empiezan con punto; conserva también esos elementos. No subas solamente el ZIP: GitHub necesita los archivos extraídos para mostrar el código y ejecutar la publicación.

## 2. Crear un repositorio vacío

En [GitHub](https://github.com/new), crea un repositorio llamado, por ejemplo, `clipforge`.

- Puedes elegir la visibilidad del código. Para GitHub Pages, la disponibilidad de repositorios privados depende del plan de tu cuenta; los públicos permiten usar Pages con GitHub Free.
- Deja sin seleccionar las opciones de añadir README, `.gitignore` o licencia: este paquete ya lleva los dos primeros y no se ha elegido una licencia para tu código.
- Copia la dirección HTTPS del repositorio. Tendrá una forma como `https://github.com/TU_USUARIO/clipforge.git`.

## 3. Subir todos los archivos

Abre una terminal **dentro de la carpeta `ClipForge`**, donde está `package.json`. Ejecuta:

```sh
git init -b main
git add .
git status
git commit -m "Publicar ClipForge 1.8.0"
git remote add origin https://github.com/TU_USUARIO/clipforge.git
git push -u origin main
```

Sustituye `TU_USUARIO` por tu usuario real y `clipforge` por el nombre que hayas elegido. Si GitHub solicita iniciar sesión, completa el acceso con tu cuenta.

Si el primer commit pide tu identidad, configúrala solo para este repositorio y repite el commit:

```sh
git config user.name "FelipeDMC"
git config user.email "TU_CORREO_DE_COMMITS"
git commit -m "Publicar ClipForge 1.8.0"
```

Reemplaza `TU_CORREO_DE_COMMITS` por el correo que uses en GitHub o por la dirección `noreply` que GitHub muestra en la configuración de tu cuenta. Después continúa con `git remote add origin` y `git push`, si todavía no los ejecutaste.

Estos comandos son para una carpeta recién extraída y un repositorio vacío. Si utilizas un repositorio que ya tiene archivos, integra los cambios con su contenido antes de subir; no necesitas forzar el push.

## 4. Publicar el editor con GitHub Pages (opcional)

El paquete incluye `.github/workflows/pages.yml`. Publica el contenido de `dist/` cuando envías cambios a la rama `main`.

1. En tu repositorio, abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Abre **Actions** y elige **Publicar ClipForge en GitHub Pages**.
4. Si el primer intento falló porque Pages todavía no estaba habilitado, usa **Run workflow** en la rama `main` o vuelve a ejecutar el flujo.
5. Cuando termine correctamente, abre la URL que aparece en **Settings → Pages**. Normalmente será `https://TU_USUARIO.github.io/clipforge/`.

No cambies la carpeta del artefacto: el flujo ya utiliza `dist`. No requiere `npm install`, compilación, claves de API ni secretos propios. El manifiesto y los recursos usan rutas relativas para admitir nombres de repositorio diferentes.

El flujo necesita permisos de Pages y puede depender de las políticas de tu cuenta u organización. Se entrega preparado; no se ha ejecutado en tu cuenta desde esta conversación. Si el plan no permite Pages con la visibilidad elegida, puedes conservar el repositorio y alojar `dist/` en otro servidor estático con HTTPS.

## 5. Actualizarlo después

Edita los archivos, comprueba el proyecto y sube los cambios:

```sh
npm run check
git add .
git commit -m "Actualizar ClipForge"
git push
```

La rama `main` volverá a activar la publicación. Las modificaciones de HTML, CSS o JavaScript dentro de `dist/` son cambios directos al código fuente.

## Problemas frecuentes

| Problema | Qué revisar |
| --- | --- |
| La página no carga al abrir `index.html` | Usa el servidor local o la URL HTTPS de Pages, no `file://`. |
| El servidor dice que el puerto está ocupado | Cierra la otra ventana de ClipForge o cambia `PORT`. |
| PowerShell bloquea `npm.ps1` | Usa el iniciador `.bat`, `npm.cmd start` o `node scripts/serve.mjs`. |
| Pages muestra 404 | Revisa que Actions termine correctamente, que la rama sea `main`, que el artefacto use `dist/` y que abras la URL indicada en Settings → Pages. |
| No aparecen `.github` o los recursos OCR | Asegúrate de haber subido la carpeta completa mediante `git add .`. |
| El navegador no admite el formato elegido | Prueba la muestra de cuatro segundos y un formato compatible; los códecs no dependen del alojamiento de GitHub. |
| No aparecen los proyectos del sitio anterior | Expórtalos como JSON desde el editor anterior y vuelve a abrirlos con el original. Los datos locales pertenecen a cada dominio. |

## Documentación oficial

- [Añadir código local a GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).
- [Configurar la fuente de publicación de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- [Usar workflows de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
