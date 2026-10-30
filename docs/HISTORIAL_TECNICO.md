# ClipForge · by FelipeDMC

Editor de clips de videojuegos, estático y sin claves. El archivo original permanece en el navegador. `dist/` es el sitio completo.

## Funciones

- Importa grabaciones sin un límite de peso o duración impuesto por el editor, sujeto al espacio disponible, al soporte del códec y a los recursos del equipo.
- Fortnite: lectura local de avisos de eliminación en español e inglés. Exige dos lecturas del mismo rival, evita duplicados y agrupa bajas consecutivas. Contexto ajustable (por defecto 12 s antes y 5 s después), derribos opcionales y marcadores en la línea de tiempo. Tu nombre exacto habilita el registro de bajas y exige que seas el atacante.
- El OCR descarta avisos reconocibles de muerte propia, asistencias y espectador. Esto no certifica perspectiva ni elimina todos los falsos positivos: la grabación debe ser desde tu jugador y con el HUD visible. No encontrar avisos produce cero propuestas, nunca clips de actividad como sustituto.
- Minecraft y modo Actividad general: audio RMS y diferencias de luminancia de fotogramas. Este modo mide actividad sin reconocer eventos del juego.
- Clips con su señal detectada y clasificados por puntuación. Al seleccionarlos, la página vuelve al monitor.
- Línea de tiempo editable con ratón, tacto y teclado: arrastrar el centro desplaza el clip; los extremos ajustan inicio/final. Incluye zoom, desplazamiento, encajar selección y deshacer/rehacer por clip.
- Estudio negro con verde brillante #53fc18, controles junto al monitor y paneles AutoClips, Editar y Calidad. La selección, los tiradores y las señales de audio usan el mismo verde.
- Identidad de instalación: rayo compartido entre la página y favicon SVG, ICO multirresolución, icono Apple, PNG 192/512 y variantes maskable. Manifiesto con identidad y rutas estables, pantalla de apertura negra y acceso con credenciales para el sitio privado. No incluye modo offline.
- Formatos 9:16, 16:9 y 1:1; encuadre completo con fondo desenfocado o recorte fijo desplazable.
- Brillo, contraste, saturación, nitidez, texto y reducción de volumen. Marca de agua opcional.
- Perfil «Fortnite nítido» inspirado en la referencia visual: brillo 102%, contraste 112%, saturación 122%, nitidez 42% y compresión de calidad máxima. Conserva encuadre, texto, audio y fps. Es un punto de partida ajustable; no una reproducción garantizada de un video visto en una captura.
- Edición del video completo sin crear clips: selección «Video completo», ajustes de imagen, formato, texto y audio, muestra de cuatro segundos y configuración guardada con el proyecto. Desde un clip, «Exportar video completo» aplica sus ajustes a toda la grabación sin modificar su recorte.
- Exportación de clips sin un máximo de duración impuesto por ClipForge usando WebCodecs y Mediabunny, en MP4 H.264/AAC o WebM VP9/Opus. El soporte se comprueba antes de convertir. No se descarta silenciosamente el audio.
- Exportaciones en segundo plano con cola de un codificador, panel minimizable, progreso individual, cancelación, reintentos y descarga automática opcional. Puedes editar, buscar clips o cargar otra partida mientras se preparan los archivos. Cada trabajo conserva el archivo, recorte y ajustes que tenía al añadirlo.
- Calidad: mejora equilibrada y perfil Fortnite; resoluciones 720/1080/1440/2160 y fps originales, 30, 60, 90, 120, 144, 165 o 240. La interfaz avisa cuando la salida amplía el original. Subir resolución no recupera detalles perdidos.
- Nitidez real sobre luminancia, con umbral para ruido mínimo y corrección limitada para reducir halos. Procesamiento WebGL con alternativa CPU del mismo filtro; se aplica después del encuadre/color y antes del texto y la marca de agua. Vista previa y exportación comparten el compositor. Los efectos predeterminados siguen desactivados en proyectos antiguos.
- Compresión «Máxima»: presupuesto de 32 Mbps a 1080p60, escalado por resolución y fps hasta 100 Mbps. La elección explícita de una resolución o fps incompatibles produce error; no se reduce silenciosamente. Tamaño de archivo estimado y avisos de ampliación en Calidad.
- Suavizado opcional hasta 240 fps por mezcla real de fotogramas vecinos, evitando mezclas en cortes de escena fuertes. No utiliza flujo óptico: puede dejar estelas en acción rápida. El monitor principal conserva el ritmo del original.
- «Máximo compatible» comprueba tasas de 240 a 30 fps con el códec, resolución y bitrate elegidos. Usa la mayor tasa declarada compatible por el navegador; no es una medición de velocidad de reproducción. Una tasa fija incompatible da error sin cambiarse silenciosamente.
- El bitrate escala con resolución/fps; cuando el original ya tiene suficientes fps, no se añaden mezclas. El modo original conserva la temporización del archivo.
- «Probar 4 segundos» genera una muestra real a la resolución y fps seleccionados, con comparación Original/Resultado y fps de salida informados, antes de exportar todo el clip. Cambiar únicamente el selector de fps duplica/descarta fotogramas sin interpolarlos.
- Guardado local de ajustes; proyectos JSON portables que requieren el original. Descargas de exportaciones válidas durante la sesión.

## Estructura

- `dist/app.js`: interfaz, estado, vista previa, persistencia y archivos.
- `dist/media-worker.js`: inspección, análisis y conversión, fuera del hilo de interfaz.
- `dist/export-queue.js`: trabajos de exportación independientes del análisis y las muestras, instantáneas por clip y gestión del worker/archivos.
- `dist/export-panel.js`, `dist/export-queue.css`: cola no modal, progreso, descargas y panel minimizable.
- `tests/export-queue.test.mjs`: orden de tareas, cancelación, recuperación de errores, conservación de ajustes y liberación de archivos.
- `dist/core.js`: puntuación, límites, composición compartida entre vista previa/exportación y validación.
- `dist/timeline-editor.js`: interacciones, zoom, posición y dibujo de la línea de tiempo.
- `dist/frame-mixer.js`: interpolación temporal por mezcla, manteniendo dos muestras de origen.
- `dist/frame-rate.js`: selección de fps, compatibilidad, bitrate y decisión de interpolación.
- `dist/image-quality.js`: perfiles de color, nitidez WebGL y alternativa CPU, procesamiento reutilizable de píxeles.
- `tests/image-quality.test.mjs`: invariantes de píxeles, bordes/ruido, alternativa CPU, migración de proyectos, 4K y orden del compositor.
- `tests/frame-rate.test.mjs`: compatibilidad, preservación de fps, migración de proyectos y mezcla 30→240 sin cambiar la duración.
- `dist/studio.css`: diseño responsive del estudio de edición.
- `dist/neon.css`: acabado de la paleta verde y negra y ajuste responsive del formulario Fortnite.
- `dist/manifest.webmanifest`, `dist/icons/`, `dist/favicon.*`: identidad de instalación.
- `scripts/create-icons.py`: reproduce SVG y formatos raster del rayo original (Python + Pillow).
- `dist/fortnite-vision.js`: lectura de regiones del HUD con Tesseract local.
- `dist/fortnite-events.js`: interpretación, confirmación, agrupación y persistencia de avisos.
- `tests/fortnite.test.mjs`, `tests/ocr-smoke.mjs`: lógica de bajas y OCR real con imágenes sintéticas.
- `scripts/create-demo.py`: genera una secuencia sintética propia para probar el editor; no es gameplay real.
- `tests/core.test.mjs`: pruebas de selección, silencios, límites y geometría.

`npm run check` no necesita instalar dependencias. Mediabunny 1.61.6 está incluido localmente bajo MPL-2.0, con su licencia en `dist/vendor/mediabunny.LICENSE`. Su código fuente está disponible en https://github.com/Vanilagy/mediabunny y https://www.npmjs.com/package/mediabunny/v/1.61.6 . No se han modificado sus archivos.

## Límites conocidos

La detección por actividad puede confundir movimientos de cámara, música o menús con momentos interesantes. El modo Fortnite lee texto visible; puede omitir avisos breves, ocultos o ilegibles, y el OCR puede confundir caracteres. No identifica visualmente enemigos ni valida quién juega cuando no se reconoce el modo espectador. No reconoce victorias, logros ni voz, y no genera subtítulos. Se utiliza la pista principal de audio. No hay envío automático a redes, superresolución por IA ni almacenamiento remoto de partidas. Los archivos temporales listos permanecen disponibles hasta quitarlos de Exportaciones o cerrar/recargar la página. Descargarlos no los elimina de la cola: «Quitar terminadas» libera su espacio temporal. Los guardados directamente permanecen en la ubicación elegida. La cola funciona mientras ClipForge permanece abierto; no se reanuda tras cerrar o recargar. Archivos largos o resoluciones altas dependen de la memoria y códecs del navegador.

Preferir Chrome o Edge actualizado en computadora. La interfaz es adaptable a móvil, pero las capacidades multimedia dependen de cada navegador. Si MP4 no es compatible, se muestra el error y se ofrece elegir WebM, sin cambiar el formato automáticamente.

## Verificación inicial

En las primeras versiones se verificaron sintaxis, 43 casos de algoritmos y escenarios de interfaz en DOM (carga, sugerencias, recorte, formato, texto/audio, error de códec recuperable y persistencia; arrastre, tiradores táctiles, cancelación, teclado, zoom, deshacer/rehacer, selección que desplaza al monitor y ajustes de calidad persistentes; controles de altas tasas, exportación con fps resueltos y comparación de muestras). Estas pruebas de DOM simulan el procesamiento multimedia y no sustituyen una exportación real en navegador. `node tests/media-inspect.mjs` verificó con el motor real la lectura de la demo MP4. La demo también se verificó con ffprobe: 50 s, 640×360, 24 fps, H.264 y AAC. El OCR WASM real pasó 11 imágenes sintéticas EN/ES (bajas, derribos, asistencias, bajas ajenas y espectador); no mide precisión sobre partidas reales. En esa comprobación inicial no se dispuso de control de navegador. La verificación real de la cola de exportación se documenta en v1.6; la instalación y detección en gameplay real siguen dependiendo del dispositivo y del material del usuario.

## FPS y publicación

La mezcla produce transiciones intermedias, no movimiento reconstruido por IA ni captura nativa a alta frecuencia. Puede crear estelas. La pantalla, el reproductor y el navegador deben poder mostrar los fps elegidos. Las comprobaciones de WebCodecs son declarativas: una muestra real permite detectar problemas del dispositivo antes de crear todo el archivo.

Las tasas superiores a 60 fps son para reproducción local compatible. [YouTube](https://support.google.com/youtube/answer/6124459?hl=es) indica que un video a 120 fps aparece como 1080p60. La [API de publicación de TikTok](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide) acepta entre 23 y 60 fps. Estas restricciones de entrega no equivalen a las opciones del editor.

## Actualización del icono instalado

Si una instalación antigua conserva la C, abrir el sitio actualizado en el navegador y volver a instalarlo puede ser necesario. Antes de quitar una instalación antigua, descargar los proyectos importantes desde la carpeta del editor y las exportaciones de esa sesión. No elegir borrar los datos del sitio: ahí se guardan los ajustes locales. No se cambian las claves de localStorage ni el origen del sitio.

Los archivos PNG están versionados en sus nombres. El manifiesto mantiene `id`, `start_url` y `scope` en `/`. `crossorigin="use-credentials"` permite obtener el manifiesto cuando la página requiere sesión. Los iconos adaptativos reservan margen alrededor del rayo para recortes circulares.

## Verificación de calidad de imagen (v1.5)

Además de las 43 pruebas unitarias, el flujo DOM verifica perfil, deshacer/rehacer, persistencia de nitidez, fps conservados y envío de 4K/calidad máxima a la muestra y a la exportación. Un lienzo nativo de 1280 × 720 con una escena sintética verifica el compositor real y la alternativa CPU, el refuerzo de bordes y el límite de corrección. Esto no valida WebGL ni WebCodecs en un navegador. En esa comprobación de v1.5 no se dispuso de control de navegador. «Probar 4 segundos» permite comprobar el procesamiento y los códecs del dispositivo del usuario; la prueba de exportación real de v1.6 se documenta más abajo.

Los ajustes de la referencia no contienen IA de superresolución, HDR real ni interpolación óptica. No se puede determinar fluidez o fps de un video a partir de una captura. El material de origen y la recompresión de la plataforma siguen condicionando el resultado. La vista previa usa 720p para mantenerla ligera; la muestra usa la resolución de salida elegida. 4K y tasas altas requieren mucha memoria; en v1.5, los buffers de video se conservaban localmente hasta quitar las exportaciones terminadas o cerrar la página; v1.7 incorpora guardado por partes en disco.

## Corrección de exportación (v1.5.1)

Se corrigió el error «quantizer 0 / Infinity bps» que impedía crear el archivo después de superar la comprobación de compatibilidad. En Mediabunny, `new Quality(numero)` expresa un nivel relativo de calidad, no un bitrate. El worker ahora usa `new Quality({bitrate})` y reutiliza la misma instancia aprobada tanto para comprobar el códec como para preparar la exportación. La comprobación de audio también utiliza la calidad final. No se rebajan la resolución, la calidad ni una selección fija de fps. «Máximo compatible» puede ajustar solo los fps a lo admitido por el dispositivo.

`tests/export-config.test.mjs` reproduce el fallo con el worker y Mediabunny reales, leyendo la demo MP4 y preparando `Conversion.init`. Cubre MP4/WebM a 2160 × 2160 y 240 fps, los tres niveles de calidad con fps originales, máximo compatible y rechazo de una tasa fija no soportada. Verifica bitrates finitos y que se conserven ambas pistas. Los límites del dispositivo, la prueba del primer fotograma y el lienzo están simulados; se detiene antes de codificar. Esta regresión no afirma compatibilidad 4K/240 en un equipo concreto ni sustituye una exportación completa en navegador.

## Exportaciones en segundo plano (v1.6)

«Exportar en segundo plano» cierra el diálogo de ajustes al añadir el clip. La cola muestra un control pequeño con el avance y se abre desde él o desde «Exportaciones». El panel se puede minimizar sin interrumpir el trabajo. No usa un diálogo modal ni bloquea la reproducción, los recortes, deshacer/rehacer o la carga de otro original. El análisis y la prueba de cuatro segundos mantienen su propio worker: cancelarlos no cancela una exportación.

Los trabajos se procesan en orden con un codificador de la cola a la vez. Cada uno guarda su original y una copia de recorte, título y ajustes; cambios posteriores del editor no alteran archivos pendientes. Un error conserva el trabajo para reintentarlo y permite continuar con el siguiente. Cancelar libera el worker de ese trabajo. Se mantiene el enlace de descarga para poder repetirla si el navegador bloquea las automáticas.

Mientras hay tareas pendientes, se avisa al cerrar/recargar y se solicita mantener la pantalla despierta cuando el navegador lo permite y la página está visible. Esto no ofrece ejecución con el equipo dormido, con la página cerrada ni recuperación de la cola tras recargar.

Verificación v1.6: `npm run check` pasa 58 pruebas. El flujo DOM prueba edición y reproducción disponibles, deshacer/rehacer, foco conservado durante el progreso, panel no modal y minimizable, cancelación independiente de muestras, orden de la cola, cambio de original, ajustes guardados por tarea, aviso al salir y descarga automática. Los workers de estos casos están simulados; no miden la velocidad de codificación del equipo.

Prueba real de v1.6 en el sitio publicado: dos trabajos WebM de la demo sintética a 1440p, 60 fps y calidad máxima. Se comprobó un trabajo activo y otro en espera, panel minimizado, reproducción, recorte y deshacer durante la exportación, paso automático al siguiente trabajo y descarga del primer archivo mientras el segundo seguía codificando. ffprobe confirmó VP9 2560×1440 a 60 fps, audio Opus 48 kHz y duración de 15.02 s. El navegador de pruebas no admite codificación de audio AAC; el error de MP4 se mostró correctamente y mantuvo disponible el editor. Esta comprobación no afirma compatibilidad MP4 ni 4K/240 en ese navegador.

## Archivos largos y guardado en disco (v1.7)

Se eliminan el rechazo de recortes mayores de 180 segundos y el límite de entrada de cuatro horas. No había un límite de 60 segundos ni de peso en el código. El diseño anterior reunía toda la salida en un `BufferTarget` y, en MP4, conservaba también los paquetes codificados para `fastStart: 'in-memory'`; esto elevaba el consumo de RAM con archivos grandes. Sin el mensaje exacto del dispositivo no se puede atribuir cualquier error a una única causa.

La cola ahora usa `StreamTarget` con escrituras posicionales por bloques de 1 MiB y contrapresión. El MP4 sigue siendo convencional, con los metadatos al final (`fastStart: false`), sin reducir resolución, bitrate ni fps. Las descargas se preparan en OPFS y el resultado se entrega como un `File` respaldado por disco; no se vuelve a leer completo en un ArrayBuffer. La prueba de cuatro segundos conserva su ruta corta en memoria. Cuando el navegador no permite OPFS, la interfaz avisa que la alternativa usa memoria.

«Guardar directamente en mi equipo», disponible con `showSaveFilePicker`, permite elegir un archivo al iniciar. El worker escribe en ese destino y solo confirma el guardado al terminar una conversión válida; ante un error aborta la escritura pendiente. No crea una segunda descarga automática, no borra el archivo elegido al limpiar la cola y no depende de la cuota temporal de OPFS. El selector del sistema controla las confirmaciones de reemplazo de archivos.

Cada exportación temporal usa un nombre nuevo, incluso al reintentar. Cancelar o quitar una tarea libera su temporal. Las sesiones sostienen Web Locks; al volver a abrir el editor se reclaman las carpetas abandonadas sin borrar las de otra pestaña que siga abierta. Se debe esperar a que termine una descarga antes de quitar su temporal. La cola no sobrevive a cerrar o recargar. Siguen existiendo límites físicos de espacio, memoria para procesar cada fotograma y compatibilidad del codificador; no se promete exportación ilimitada en cualquier dispositivo.

Verificación: 65 pruebas con `npm run check`. Un MP4 de 200 segundos se multiplexa con el motor real hacia un archivo, comprueba escrituras antes de finalizar, bloques acotados y reapertura/duración. Se cubren posiciones reescritas, escrituras parciales, cuota agotada, aborto sin confirmar el destino, limpieza aislada y protección de otras pestañas. El flujo DOM prueba recortes de 400 segundos, cancelación del selector, ajustes capturados antes del selector y un resultado directo mayor de 2 GiB sin generar una descarga duplicada. Estas pruebas no equivalen a transcodificar 4K/240 fps en un dispositivo real.

Referencias técnicas: [destinos y contrapresión de Mediabunny](https://mediabunny.dev/guide/writing-media-files), [opciones MP4](https://mediabunny.dev/guide/output-formats) y [lectura de archivos respaldados por disco](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/getFile).

## Video completo con todos los ajustes (v1.8)

Al cargar un original sin clips guardados, se habilita su edición completa. «Video completo», sobre el monitor, vuelve a esa configuración independiente. No crea una tarjeta ni permite recortar el original desde ese modo; para recortes se mantiene «Recorte manual».

La ventana de exportación permite elegir «Clip seleccionado» o «Video completo». La segunda opción usa exactamente la configuración del elemento activo (color, contraste, nitidez, formato/encuadre, texto, marca de agua, volumen y mezcla de movimiento), junto con resolución, compresión y fps elegidos. Su intervalo es siempre 0 → duración del original. «Exportar video completo» en Calidad abre esa opción directamente. Los clips existentes y los ajustes independientes del video completo se conservan. Cada trabajo captura el original y los ajustes antes de esperar al selector de archivo, y usa la cola y guardado en disco ya existentes.

Los campos opcionales `video` y `editingFullVideo` en el proyecto versión 1 conservan título y ajustes del original sin invalidar proyectos antiguos. La prueba DOM comprueba una fuente de 400 s sin clips, intervalo completo fijo, todos los ajustes enviados al worker, edición durante la exportación, conservación de instantáneas, restauración de ajustes y alternancia clip/video completo. El procesamiento multimedia de esta prueba está simulado.
