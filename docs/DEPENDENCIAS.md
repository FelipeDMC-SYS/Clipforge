# Dependencias y herramientas

## Para ejecutar el editor

El sitio es HTML, CSS y JavaScript nativo. Todas sus bibliotecas de ejecución están incluidas en `dist/vendor/`; no hay descargas desde un CDN durante el uso del editor. No se requiere `npm install`, Python, FFmpeg, una base de datos ni claves de API.

Node.js solo se utiliza para el servidor local y las pruebas. En un alojamiento estático como GitHub Pages, el visitante solo necesita su navegador. La exportación usa las capacidades multimedia del dispositivo.

| Componente incluido | Versión | Uso y licencia |
| --- | --- | --- |
| Mediabunny | 1.61.6 | Lectura, escritura y conversión multimedia. MPL-2.0; texto en `dist/vendor/mediabunny.LICENSE`. |
| Tesseract.js | 6.0.1 | Controlador y worker OCR. Apache-2.0; texto en `dist/vendor/tesseract/LICENSE-tesseract.js.md`. |
| Tesseract.js-core | 6.1.2 | Motor WASM, con variantes SIMD/LSTM. Apache-2.0; texto en `dist/vendor/tesseract/LICENSE-core`. |
| Modelo `eng` de Tesseract | 1.0.0, `4.0.0_best_int` | Datos de reconocimiento incluidos en `lang/eng.traineddata.gz`. Procedencia en `dist/vendor/tesseract/NOTICE.md`. |

Se conservan también los avisos de las dependencias integradas en los paquetes minificados. Los archivos de esas bibliotecas no fueron modificados. Su código de origen está disponible en:

- [Mediabunny](https://github.com/Vanilagy/mediabunny), [paquete 1.61.6](https://www.npmjs.com/package/mediabunny/v/1.61.6).
- [Tesseract.js 6.0.1](https://github.com/naptha/tesseract.js/tree/v6.0.1).
- [Tesseract.js-core 6.1.2](https://www.npmjs.com/package/tesseract.js-core/v/6.1.2).
- [Datos de Tesseract](https://github.com/naptha/tessdata).

No se ha asignado una licencia nueva al código propio de ClipForge. Las licencias anteriores corresponden a sus respectivas bibliotecas.

## Pruebas sin dependencias adicionales

Desde la raíz del proyecto, con Node.js 22 o superior:

```sh
npm run check
npm run test:media
```

`check` comprueba sintaxis y ejecuta los 65 casos unitarios/regresiones existentes. `test:media` inspecciona la demo con Mediabunny real. Algunos casos simulan el codificador; no sustituyen una exportación real en el dispositivo del usuario.

## Pruebas de interfaz (opcional)

```sh
npm install --no-save jsdom@26.1.0
npm run test:dom
```

JSDOM es una herramienta de pruebas y no se incorpora al sitio publicado. El test cubre interacciones del editor y simula canvas, workers y códecs. La variable `JSDOM_PATH` permite reutilizar una instalación externa si lo necesitas.

## Pruebas de OCR (opcional)

Necesitas Python 3.11 o superior, las herramientas de Python indicadas más abajo y estas dependencias de pruebas de Node:

```sh
npm install --no-save jsdom@26.1.0 tesseract.js@6.0.1 bmp-js@0.1.0
python scripts/create-ocr-fixtures.py
npm run test:ocr
```

En macOS/Linux puede ser necesario usar `python3` en lugar de `python`. El generador guarda 11 imágenes sintéticas y su manifiesto en `scratch/ocr-fixtures/`. Las fuentes disponibles en cada sistema pueden cambiar ligeramente su apariencia. La prueba no mide la precisión sobre una partida real.

El test utiliza Tesseract instalado para Node y el modelo de idioma incluido en la web; su motor depende de la instalación de npm. Los motores para el navegador permanecen fijados en `dist/vendor/`. `OCR_QA_PATH` permite cambiar la carpeta de dependencias y `OCR_FIXTURES` la de las imágenes.

## Regenerar recursos (opcional)

Los iconos y la demo ya están incluidos. Estas herramientas solo son necesarias si quieres volver a generarlos. Instala las versiones de Python utilizadas en esta entrega:

```sh
python -m pip install -r requirements-tools.txt
```

| Orden | Resultado |
| --- | --- |
| `python scripts/create-icons.py` | Regenera los iconos de ClipForge y el favicon dentro de `dist/`. |
| `python scripts/create-demo.py` | Regenera `dist/demo.mp4`, una escena sintética de 50 segundos. Requiere además [FFmpeg](https://ffmpeg.org/) disponible como `ffmpeg`. |
| `python scripts/create-ocr-fixtures.py` | Genera los casos de prueba OCR en `scratch/ocr-fixtures/`. |

Pillow y NumPy se fijan en `requirements-tools.txt`. Las fuentes se buscan en Windows, macOS y Linux. No necesitas regenerar nada para abrir, editar o publicar el proyecto. La regeneración sobrescribe el recurso correspondiente.

`node_modules/`, los entornos de Python y las imágenes temporales de las pruebas se excluyen de Git mediante `.gitignore`.
