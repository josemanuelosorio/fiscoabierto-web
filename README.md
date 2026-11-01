# fiscoabierto.org

Sitio de Fisco Abierto: herramienta fiscal gratuita de utilidad pública para quien genera ingresos en plataformas digitales en México (Mercado Libre, Uber, Airbnb, trabajo freelance y más). Informa; no asesora, no vende, no pide datos.

## Cómo se hace

El contenido fiscal es mío: qué dice la ley, cada cifra con su artículo y la fecha en que la verifiqué contra la fuente oficial. El código lo escribe un asistente de IA (Claude Code) bajo las pruebas de `tools/`; por eso muchos commits llevan su firma. Las ilustraciones de las láminas se generaron con Gemini.

## Stack

- HTML, CSS y JavaScript sin frameworks ni paso de build, en español e inglés: la página principal (`index.html`) y la página Aprende (`aprende/index.html`).
- Hosting: GitHub Pages desde la rama `main`.
- Dominio: fiscoabierto.org, apuntado con `CNAME`.

## Estructura

```
├── index.html              # Página principal: solo el marcado
├── css/sitio.css           # Sus estilos
├── js/                     # Sus scripts, uno por sección, en el orden en que los carga el HTML
│   └── datos/              # Diccionario ES/EN y tasas del mapa de hospedaje
├── aprende/
│   ├── index.html          # Aprende: seis pasos de principios fiscales, con láminas en vivo
│   ├── laminas/            # p1 a p6.html, motor.js, lamina.css, const.js, img/ y fuentes/
│   └── videos/             # Las mismas láminas en MP4 para descargar
├── videos/                 # Videos de la página principal, con sus portadas
├── docs/                   # Bitácoras de mantenimiento y verificación de fuentes
├── tools/                  # Chequeos que corren antes de cada push (detalle en tools/README.md)
├── .github/workflows/      # pruebas.yml: los chequeos en cada push
├── package.json            # Dependencias de las pruebas; el sitio no tiene build
├── .htmlvalidate.json      # Configuración de html-validate
├── CNAME                   # Dominio para GitHub Pages
├── favicon.svg, favicon-512.png
├── LICENSE                 # MIT, para el código
└── LICENSE-CONTENIDO.txt   # CC BY 4.0, para textos, láminas, ilustraciones y videos
```

Los MP4, sus portadas y `aprende/laminas/const.js` salen de un pipeline de render que no vive en este repo; aquí solo se publican.

## Herramientas

| Script | Qué revisa |
|---|---|
| `unitarias.js` | Plazos (art. 12 CFF) y recibo de la retención, en node, contra cifras calculadas aparte. |
| `smoke.js` | Corre cada `<script>` contra un DOM simulado y detecta arranques rotos. |
| `cifras.js` | Lista cada cifra con su fuente legal y su fecha de verificación, marca los bloques con más de 90 días y compara el HTML con `translations.es`. No valida contra la ley: esa revisión es manual. |
| `i18n.js` | Lo que se quedaría en español al cambiar a inglés. |
| `calc-goldens.js` | 30 casos de la calculadora (3 actividades, con y sin RFC, por 5 montos) contra una cuenta hecha aparte. Necesita Playwright. |
| `css-muerto.js` | Selectores sin clase ni id en el HTML o el JS. |
| `usted.js` | Tuteo en el texto en español: el sitio habla de usted. |
| `laminas.js` | Controles de las láminas en un navegador real. Necesita Playwright. |

## Antes de cada push

Cada push a `main` publica en GitHub Pages. Desde esta carpeta, `npm test` corre los chequeos que solo necesitan node y `npm run test:navegador` los que necesitan Chromium (instalación en `tools/README.md`); GitHub Actions corre los dos en cada push. Qué cubre cada uno:

- Si toca JS: `node tools/smoke.js` y `node tools/smoke.js aprende/index.html`.
- Si toca contenido: `node tools/cifras.js` y `node tools/cifras.js aprende/index.html` con divergencias en 0, y `node tools/i18n.js` sin hallazgos (con `aprende/index.html --dom` revisa también las seis láminas en inglés; necesita Playwright).
- Si toca la calculadora o sus constantes: `node tools/calc-goldens.js` con 0 fallas.
- Si toca HTML o CSS: `html-validate index.html aprende/index.html aprende/laminas/p*.html` limpio, y `node tools/css-muerto.js` en 0 en las dos páginas.
- Si toca texto en español: `node tools/usted.js` sin tuteo.
- Si toca el script de las láminas: `node tools/laminas.js`.

## Licencia

- Código (HTML, CSS, JavaScript y `tools/`): MIT, en `LICENSE`.
- Textos, explicaciones de las cifras, láminas, ilustraciones y videos: CC BY 4.0, en `LICENSE-CONTENIDO.txt`. Puede reutilizarlos citando a Fisco Abierto con un enlace a fiscoabierto.org.
- Las fuentes de `aprende/laminas/fuentes/` (Inter, JetBrains Mono y Source Serif 4) conservan su licencia SIL OFL 1.1, en `aprende/laminas/fuentes/OFL.txt`.
- El nombre, el logo y los favicons de Fisco Abierto no se licencian.
- Las ilustraciones se generaron con IA; se licencian en la medida en que existan derechos sobre ellas.
