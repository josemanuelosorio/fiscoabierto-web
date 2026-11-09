# tools

## Correr todo

Desde la raíz del repo, una vez:

    npm install
    npx playwright install chromium

GitHub Actions los corre solos en cada push; para correrlos en local antes de
subir:

    npm test                    # chequeos que solo necesitan node
    npm run test:navegador      # html-validate, calculadora, idioma en el DOM y láminas
    npm run test:todo           # todos

`correr.js` corre todos los chequeos del grupo aunque alguno falle, muestra la
salida solo de los que fallaron y sale con código 1 si falló al menos uno. El
workflow `.github/workflows/pruebas.yml` corre los grupos en cada push.

`laminas.js` fallaba de forma intermitente en «p1 arranca sola al entrar», y
después del refactor del 1 de noviembre en todas las corridas. La causa estaba
en la prueba, no en el sitio: detalle en la sección de `laminas.js`. Con el
arreglo, 0 fallas en 12 corridas alternadas sobre el código anterior y el nuevo.

## unitarias.js

Pruebas de la lógica que no necesita navegador, con el ejecutor que trae node
(`node:test`): las fechas límite de `js/plazos.js` (día 17 y 30 de abril,
corridas al siguiente día hábil según el art. 12 CFF) y el recibo de
`js/retencion.js` (con y sin RFC, y el umbral del 113-B), los hilos de
`js/hilos.js` (un hilo por cada 1,000 pesos, lo dibujado suma lo que cobra la
plataforma y los haces no se enciman) y la evaluación de
`js/evaluacion.js`: los umbrales de exposición en su borde exacto, el pago
definitivo del 113-B, el orden de los pasos y que toda clave que devuelve exista
en ES y en EN y se alcance con alguna respuesta. Las cifras esperadas
se calcularon aparte, desde el texto de la ley, no con el código que se prueba.
Quitar un día inhábil de la lista hace fallar la prueba de plazos. Con el hilo
en 900 pesos fallan dos pruebas de hilos, y con 3 pixeles entre hilos falla la
de haces encimados (9 nov 2026).

    node tools/unitarias.js

## pagina.js

No es un chequeo: es la pieza que los demás usan para leer una página. Arma el
HTML como lo ve el navegador, con cada hoja de estilo local y cada
`<script src>` sustituidos por su contenido en su lugar, y para cada línea
sabe de qué archivo y línea viene. Así `cifras.js`, `i18n.js` y `css-muerto.js`
leen la página entera aunque el CSS viva en `css/` y el JS en `js/`, y sus
reportes señalan `js/calculadora.js:17` en vez de una línea del HTML.

## smoke.js

Corre los scripts de una página contra un DOM de mentiras y reporta si el
camino de arranque revienta.

Existe porque `node --check` valida sintaxis y nada más. Un identificador que
quedó libre, por ejemplo una función que se borró por accidente, es JavaScript
perfectamente válido: solo truena al ejecutarse. Ese error se publicó una vez
(commit 676d161) y dejó el diagrama de la sección de confianza en opacidad cero
en escritorio, porque el script moría después de haber puesto la clase que
apaga el respaldo de "si no hay JS, muestra todo".

Uso, desde la raíz del repo:

    node tools/smoke.js

Sin argumentos recorre los scripts de `index.html` (en línea o en `js/`) en el
orden de carga y en un mismo contexto global, como el navegador: un script ve
lo que declararon los anteriores, y si uno truena los siguientes corren igual.
Cada uno se reporta con el rotulo `<!-- ... -->` que lo antecede, y un bloque
vacio cuenta como FALLA
(antes se extraia cada script con `sed` por rotulo, y un rotulo mal escrito
daba 0 lineas y un OK vacio). Con un `.js` como argumento corre ese script
suelto; con un `.html`, hace el recorrido sobre ese archivo.

Sobre `aprende/index.html` corre sus cuatro scripts (idioma, nav, escalera y láminas). Los scripts se hablan por `window.faIdioma`.

El stub es deliberadamente tonto: si un script empieza a usar una API del DOM
que no está simulada, se agrega al stub (así entró `style.setProperty`, que usa
el lienzo de hilos del recibo). Un fallo por API faltante se distingue
de uno real por el mensaje (TypeError sobre un método del stub contra
ReferenceError sobre una función del propio script). `requestAnimationFrame`
corre el primer frame en el acto y deja de encolar después de cuatro, para que
un loop de dibujo no se coma la pila.

## cifras.js

Enumera cada cifra que el sitio publica junto con la fuente legal que la
respalda: la banda de cifras, las constantes de la calculadora, las 32 tasas
del mapa de hospedaje, toda línea con cita legal y toda cifra que aparece sin
cita en su misma línea. Al final compara el texto ES del HTML (respaldo sin
JS) contra `translations.es` y reporta divergencias: el mismo texto vive dos
veces en el archivo y ya divergió una vez (el pie de la calculadora perdió la
cita del 113-C en la copia HTML).

Arranca con la fecha de verificación de cada bloque (`data-verificado` en
banda, calculadora y mapa; el sitio la muestra como "Verificado contra la ley
el ...") y marca VENCIDO el que pase de 90 días: ese es el selector de la
rutina de mantenimiento, no la memoria de nadie.

La comparación toma el contenido de cada elemento hasta su propio cierre, contando las etiquetas anidadas del mismo nombre; antes se cortaba en el primer cierre de cualquier etiqueta, y un `<a>` dentro de un `<p>` daba divergencias falsas. Con `node tools/cifras.js aprende/index.html` hace lo mismo sobre la página Aprende.

No valida contra la ley: enumera. Es la lista de trabajo cuando cambia una
norma (Paquete Económico, LIF, RMF) y el contrato de lo que un monitor tiene
que vigilar.

Uso, desde la raíz del repo:

    node tools/cifras.js > cifras-vigentes.md

Correrlo después de cualquier cambio de contenido y antes de cada pasada de
verificación. Divergencias distintas de 0 se corrigen antes del push. Al
terminar una pasada de verificación, actualizar el `data-verificado` del
bloque revisado: la fecha vive solo ahí.

## i18n.js

Reporta lo que se quedaría en español al cambiar a EN. El sistema de idioma
tiene cuatro piezas y el chequeo revisa una por una: el diccionario
`translations` (toda clave ES tiene su EN), el marcado (todo texto visible del
HTML cuelga de un `data-i18n`, o de un `data-i18n-js` si lo pinta el JS), los
datos del mapa (cada `nota` tiene `nota_en`) y, con `--dom`, el DOM real en EN
con Playwright: recorre los 32 estados y un diagnóstico completo buscando
marcas de español.

Existe porque el bug de septiembre de 2026 vivía en la cuarta pieza: el panel
del mapa inyectaba `f` y `nota` en español en los 32 estados, y ningún chequeo
lo veía porque el diccionario estaba completo.

Uso, desde la raíz del repo:

    node tools/i18n.js          # piezas 1 a 3, solo node
    node tools/i18n.js --dom    # además la 4; pide playwright instalado

Con `node tools/i18n.js aprende/index.html --dom` revisa la página Aprende: el paso 3 no aplica (no tiene mapa) y el 4 abre en EN la página y cada una de sus seis láminas, que tienen su propio diccionario.

Sale con código 1 si hay hallazgos. Los nombres de las leyes estatales (`f`)
se citan en español en los dos idiomas por contrato: son el documento que el
lector va a buscar.

## calc-goldens.js

Mueve la barra de la calculadora y cambia de actividad en la página real
(Playwright) y compara cada cifra pintada (ISR 2025/2026 o con/sin RFC, IVA
retenido con y sin RFC, totales y umbral) contra una cuenta hecha aparte, con
las tasas escritas a mano en el propio script. 30 casos: 3 actividades, con y
sin RFC, por 5 montos; tres quedan debajo del umbral de $300,000 anuales y dos
arriba.

Uso, desde la raíz del repo:

    node tools/calc-goldens.js

En cada caso cuenta además los hilos del recibo: cuántos hilos completos trae
el trazo de cada haz (ISR, IVA y depósito) y si hay hilo delgado, contra el
monto esperado entre 1,000. Antes sumaba los anchos de la barra de colores,
que ya no existe.

Sale con código 1 si una cifra no coincide. Probado contra una copia con
IVA_RET cambiado a 0.40: fallaron los 15 casos que había entonces (10 sep 2026,
antes de separar con y sin RFC). Probado contra una copia con el hilo en 900
pesos: 27 de 30 casos fallan (9 nov 2026). Correrlo antes de cualquier
push que toque la calculadora, sus constantes o los hilos.

## css-muerto.js

Selectores del CSS de la página (en `<style>` o en `css/`) cuyas clases o ids
no aparecen ni en el HTML ni en ninguna cadena del JS que la página carga: no
pueden aplicar nunca. Estático,
sin navegador. Las clases que el JS arma pegando cadenas (`b1` a `b5` del
mapa, `risk-alto` y compañía) van en la lista COMPUESTAS con su razón.

Uso, desde la raíz del repo:

    node tools/css-muerto.js

Sale con código 1 si hay selectores muertos. Primera corrida (10 sep 2026):
5 muertos, todos `.newsletter-form`, podados. El 42% de "CSS sin usar" que
reporta Lighthouse es otra cosa: reglas que no aplican al cargar, pero sí en
otros estados (idioma, diagnóstico, mapa, móvil).

## html-validate

No es nuestro: viene en las dependencias de desarrollo (`npm install`). Desde
la raíz del repo:

    npx html-validate index.html

La configuración vive en `.htmlvalidate.json` y no declara excepciones: la
única que hubo, `style="width:..."` en la barra de la calculadora, salió con
la barra el 9 de noviembre de 2026. Primera corrida (10 sep 2026): 53
errores (38 botones sin `type`, 11 estilos en línea, iframe sin `title` y con
atributos obsoletos); ahora 0.

También `html-validate aprende/index.html`. Primera corrida (30 sep 2026):
6 errores, el nivel de la escalera en `style="--nivel: N"`; pasó a
`data-nivel` y ahora da 0.

## usted.js

Busca tuteo en el texto en español. Desde el 30 de septiembre de 2026 Fisco
Abierto habla de usted (decisión editorial): "su", "le", "lo" e imperativos como
"Consulte". El chequeo lee lo que el lector ve o lo que se indexa: nodos de
texto, los atributos `title`, `alt`, `aria-label`, `content` y `placeholder`, y
los literales de cadena de los `<script>`. Marca pronombres y posesivos (tú, tu,
tus, te, ti, contigo, tuyo) y una lista de verbos en segunda persona que el
sitio usó. El inglés no dispara nada.

Uso, desde la raíz del repo:

    node tools/usted.js                        # index.html, js/, aprende/index.html, láminas y const.js
    node tools/usted.js otro-archivo.md      # cualquier .html, .md o .js

Acepta `.html`, `.md` y `.js`. Sale con código 1 si encuentra algo. Primera
corrida sobre el sitio convertido (30 sep 2026): sin tuteo. Una clase o una
variable que se llame como una marca (`.tu`, `tuyo`) también dispara; se
renombra, porque el chequeo no distingue código de texto dentro de un literal.
El medidor de estilo de la newsletter, que vive fuera de este repo, usa la misma lista.

## laminas.js

Prueba los controles de las láminas en vivo de `/aprende` en Chromium con
Playwright: que cada lámina arranque sola al entrar en pantalla, se pause al
salir y siga al volver, termine en Repetir, respete la pausa hecha con el
botón y el cambio de idioma, y que con movimiento reducido quede en el
diagrama completo con Reproducir.

Existe por un bug que llegó a producción. La página daba una lámina por vista en cuanto
pedía reproducirla, aunque el iframe, que tiene carga diferida, todavía no
pudiera recibir la orden; al llegar, la lámina saltaba al final. Chromium pide
esos iframes mucho antes de que entren en pantalla y lo escondía. Safari los
pide al entrar, y en iPhone y en Safari de Mac salían todas terminadas. Por
eso la prueba sirve cada lámina cuando su marco ya está en pantalla, 400 ms
después, como WebKit. Sobre el código anterior al arreglo da 10 FALLAS.

Uso, desde la raíz del repo (necesita Playwright):

    node tools/laminas.js            # carga estilo WebKit
    node tools/laminas.js --rapido   # carga normal de Chromium

Levanta su propio servidor sobre la raíz del repo. Tarda unos tres minutos y sale con
código 1 si algo falla. Correrlo antes de cualquier push que toque el script
LÁMINAS EN VIVO de `aprende/index.html` o el modo en vivo de `laminas/motor.js`.

En modo WebKit la prueba espera `domcontentloaded`, no `load`. El evento `load`
espera los iframes que Chromium ya pidió, y la ruta que simula a WebKit retiene
hasta 20 s los que no están en pantalla: cuando Chromium los pedía antes de
`load`, la carga tardaba unos 22 s y p1, que está en pantalla desde el inicio,
se reproducía completa antes de revisarla («p1 arranca sola al entrar» con
Repetir y 100%). Medido el 1 de noviembre de 2026: con `load`, la carga duraba
~21.8 s en cada corrida que fallaba y ~0.1 s en las que pasaban; con
`domcontentloaded`, 0 fallas en 6 corridas sobre el código anterior al refactor
y 6 sobre el nuevo, alternadas.

Con `--rapido`, «p2 pausada queda pausada en inglés» falla siempre, desde antes
del refactor. Al cambiar de idioma la página recarga las láminas, y una lámina
que ya corrió (aunque esté en pausa a la mitad) vuelve en el diagrama completo
con Repetir, como dice el comentario del script. En modo WebKit la prueba pasa
solo porque revisa antes de que llegue la recarga de p2. Falta decidir cuál es
el comportamiento correcto; mientras, `npm run test:navegador` y el CI corren
el modo WebKit.
