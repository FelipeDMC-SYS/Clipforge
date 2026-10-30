# Procedencia del paquete

- Aplicación: ClipForge · by FelipeDMC, versión 1.8.0.
- Corresponde a la publicación 11, con edición y exportación del video completo.
- Commit de origen: `e5d856352128be4b2a96a4956f63f7a34a44903c`.
- Preparado el 30 de octubre de 2026.

Se copiaron los 57 archivos funcionales y de documentación del repositorio original. El manifiesto interno del alojamiento de Sites no es necesario para GitHub y no se incluye. Se conservó el README original en `docs/HISTORIAL_TECNICO.md`.

Adaptaciones de esta copia:

- `dist/manifest.webmanifest`: `start_url` y `scope` relativos (`./`), con identidad derivada de `start_url`, para admitir cualquier nombre de repositorio y la raíz de un dominio. Los iconos permanecen iguales.
- `package.json`: comandos para iniciar localmente y ejecutar las pruebas adicionales, sin dependencias necesarias para el funcionamiento de la web.
- Servidor de desarrollo con soporte de módulos JavaScript y peticiones parciales de video, iniciador para Windows, configuración de GitHub Pages y guías.
- Herramientas de generación con búsqueda de fuentes en Windows, macOS y Linux; las pruebas OCR admiten rutas predeterminadas dentro del proyecto.

El código de edición, detección, composición, calidad y exportación coincide con la publicación de origen. Los archivos vendorizados conservan sus licencias y contenido. No se exportan el historial de Git, tokens ni credenciales de publicación. Tampoco se incluyen las grabaciones o los proyectos guardados en el navegador del usuario.

## Verificación

Las pruebas del paquete se ejecutan antes de crear el ZIP. El archivo `VERIFICACION.txt` resume los resultados y `SHA256SUMS.txt` permite revisar la integridad de sus archivos. El flujo de GitHub Pages se entrega configurado; su ejecución depende del repositorio y la cuenta que lo reciban y no se ha publicado en una cuenta de GitHub desde esta conversación.

## Referencias de configuración

- [GitHub: workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- [GitHub: elegir la fuente de publicación](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- [MDN: start_url](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url).
- [MDN: scope](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope).
- [MDN: id](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id).
