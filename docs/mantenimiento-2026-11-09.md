# Revisión de mantenimiento del 9 de noviembre de 2026

Etiquetas: VERIFICADO = comprobado en la fuente oficial enlazada; ALTA_CONFIANZA = conclusión sólida sin confirmación final en la fuente; SIN_CONFIRMAR = no se pudo comprobar en esta pasada.

## Cambios publicados

- Ley de Ingresos 2027: el aviso bajo la calculadora decía que la ley seguía en comisiones del Senado al 24 de octubre. Se sustituye por un bloque con la ruta de la ley (iniciativa, Cámara de Diputados, Senado, Diario Oficial y entrada en vigor), cada paso con su fecha y su enlace a la fuente, y con la tasa de 2025, 2026 y 2027. El trazo continuo marca lo que ya ocurrió o ya es ley; el punteado, lo que falta. El estado es el del 9 de noviembre: aprobada por las dos cámaras y sin publicar. No se aplica una tasa de 2027 a la calculadora.
- Recibo de la calculadora: se pinta como un talonario. El cobro es un boleto: la parte grande es lo que la plataforma deposita y los dos talones del extremo son lo que corta para el SAT, uno de IVA y otro de ISR. El ancho de cada parte es la proporción que le toca de lo cobrado, así que los talones se ensanchan cuando sube la retención (por ejemplo, sin RFC). Una leyenda dice en una oración las tasas de los dos talones. Las cifras del recibo no cambian: salen de la misma función que antes.
- El mismo día se publicaron y se retiraron dos versiones previas del recibo: una con hilos de $1,000, que no se entendía, y una escena ilustrada que repetía la del video de la sección siguiente.
- Tasas por año del bloque de la Ley de Ingresos 2027: van en numerales grandes, en una tarjeta de borde continuo si ya fueron ley y de borde punteado si falta.

## Correcciones

Salieron de un barrido de las dos páginas, en español e inglés, a 320, 360, 390, 768, 1024 y 1440 pixeles de ancho.

- A 320 pixeles en inglés toda la página se desbordaba 23 pixeles hacia la derecha, en la principal y en Aprende. La causa era la línea de la marca en trámite del pie, que no podía partirse. Ahora se parte en teléfono.
- Blancos de toque de menos de 24 pixeles (WCAG 2.2, criterio 2.5.8): los enlaces de la navegación en las dos páginas, los enlaces de las respuestas del FAQ, el enlace al trámite del panel, los nombres de los pasos de la ruta de la ley, el enlace de descarga de las láminas y la barra de la calculadora, cuya caja medía 6 pixeles de alto y ahora mide 28 sin moverse de lugar.
- La barra de la calculadora no mostraba el foco del teclado. Ahora lo marca en su botón.
- El enlace al RFC del contexto de la calculadora ya no deja un renglón justificado con huecos.

Queda sin corregir: en teléfono los estados chicos del mapa miden menos de 24 pixeles (el más chico, 4 por 5). El mapa no ofrece otra forma de elegir estado.

## Fuentes de la ruta de la Ley de Ingresos 2027

| Paso | Dato | Confianza | Fuente consultada |
|---|---|---|---|
| Iniciativa | 8 de septiembre de 2026. El artículo 25, fracción VI, fija 2.5% en sustitución de la tasa del art. 113-A, párrafo tercero, fracción III de la LISR (p. 239). El primer transitorio fija la entrada en vigor el 1 de enero de 2027 (p. 275) | VERIFICADO | [Gaceta Parlamentaria 7121, Anexo A](https://gaceta.diputados.gob.mx/PDF/66/2026/sep/20260908-A.pdf) |
| Dictamen de la Comisión de Hacienda | 13 de octubre de 2026. La fracción VI conserva el 2.5% (página 184 de 236 del dictamen) | VERIFICADO, leído en la imagen de la página: el PDF no trae capa de texto | [Gaceta Parlamentaria 7145-IV-2](https://gaceta.diputados.gob.mx/PDF/66/2026/oct/20261013-IV-2.pdf) |
| Cámara de Diputados | Aprobada el 15 de octubre de 2026, 331 votos contra 118 en lo general y 340 contra 109 en lo particular. El pleno aceptó una reserva sobre el artículo 21 transitorio | VERIFICADO | [Canal del Congreso, 15 de octubre](https://www.canaldelcongreso.gob.mx/noticias/10320) |
| Senado | Aprobada el 27 de octubre de 2026, 75 votos contra 34 en lo general y 73 contra 33 en lo particular. El pleno rechazó las propuestas de modificación y turnó el documento al Ejecutivo | VERIFICADO | [Senado, comunicado 0356](https://comunicacionsocial.senado.gob.mx/informacion/comunicados/16663-senado-aprueba-ley-de-ingresos-de-la-federacion-para-2027-remite-el-proyecto-al-ejecutivo-federal) y [Canal del Congreso, 28 de octubre](https://www.canaldelcongreso.gob.mx/noticias/10338) |
| Diario Oficial | Sin publicar al 9 de noviembre de 2026. Se revisaron los títulos de todas las notas de las ediciones matutina, vespertina y extraordinaria del 27 de octubre al 9 de noviembre | VERIFICADO a las 16:51 del 9 de noviembre, cuando solo existía la edición matutina del día; una edición posterior puede cambiarlo | [Diario Oficial de la Federación](https://sidof.segob.gob.mx/) |

La tasa de 2027 en el texto que aprobó el Congreso tiene ALTA_CONFIANZA, no más: el 2.5% está en la iniciativa y en el dictamen, la reserva aceptada en Diputados toca un transitorio y el Senado no modificó el texto, pero el decreto aprobado no se ha publicado y el boletín de la Cámara de Diputados que enumera los cambios respondió 403. Por eso el sitio afirma solo lo verificado: que la iniciativa y el dictamen conservan el 2.5% y que la tasa de 2027 será la del texto que se publique.

## Revisado sin cambios en el sitio

- Cuarta Resolución de Modificaciones a la RMF 2026 (DOF 30-oct-2026, nota 5802597) y sus anexos 1, 2, 7, 11, 14, 15 y 29 (DOF 06-nov-2026, nota 5803159). Se buscaron en el texto las plataformas tecnológicas y digitales, las reglas del Título 12, los artículos 113-A a 113-C de la LISR y 18-J a 18-M de la LIVA y la ficha 1/CFF. VERIFICADO: no cambia ninguna tasa ni ningún trámite que el sitio cite. La ficha 1/CFF aparece sin cambios en el índice del Anexo 2. Lo que sí toca a plataformas es ajeno a las cifras del sitio: un transitorio para que las plataformas extranjeras den de alta las actividades 2412 y 2413, la ficha 168/CFF del aviso de acceso en línea del art. 30-B del CFF, que obliga a las plataformas, y el criterio 59/ISR/IVA/N del Anexo 7, según el cual quien trabaja en plataformas sigue tributando en la Sección III del Capítulo II del Título IV de la LISR aunque la ley laboral lo reconozca como persona trabajadora.
- Decretos de reforma a la LISR, la LIVA o el CFF publicados del 27 de octubre al 9 de noviembre: ninguno entre los títulos de las notas del DOF. VERIFICADO con ese alcance: la búsqueda fue por título.

## Alcance y reservas

La fecha de verificación de la calculadora permanece en el 24 de octubre: esta pasada revisó el estado de la Ley de Ingresos 2027 y no volvió a leer los artículos de las tasas vigentes. El bloque de la ruta lleva su propia fecha de corte.

La reforma a la Ley del ISR para 2027 sigue en trámite: el Senado la aprobó con modificaciones el 27 de octubre ([comunicado del Senado](https://comunicacionsocial.senado.gob.mx/informacion/comunicados/16662-camara-de-senadores-aprueba-con-modificaciones-reformas-a-ley-del-impuesto-sobre-la-renta)) y no aparece publicada en el DOF al corte. Su contenido final queda SIN_CONFIRMAR, y el sitio no afirma nada sobre las tasas de transporte y hospedaje en 2027.

El 4 de noviembre de 2026 el DOF publicó en edición vespertina el decreto que expide la Ley de Economía Digital para Pagos Digitales y Electrónicos. No se revisó su contenido: queda fuera de lo que el sitio explica hoy.

Al publicarse la Ley de Ingresos 2027: el paso del Diario Oficial pasa a `data-estado="hecho"` con su fecha y su enlace a la nota, cambian el título y el texto del bloque, la fuente de la fila de 2027 y la fecha de corte, y se confirma el artículo 25, fracción VI, en el texto publicado. Las constantes de la calculadora cambian hasta que la tasa de 2027 esté en vigor.

## Medición

Chromium sin ventana, misma máquina, antes del cambio y con el talonario, en la misma corrida:

- Pintar el recibo al mover la barra: 0.07 milisegundos por movimiento antes y después (mediana de 5 corridas de 400 movimientos).
- Peso de `index.html`, `css/` y `js/` sin comprimir: de 353,863 a 369,058 bytes.
- Pruebas unitarias: de 10 a 11. Con la parte del IVA calculada sobre el ISR falla la nueva.
- Los 30 casos de la calculadora revisan ahora el ancho de cada parte del talonario y la tasa que dice su leyenda. Con el talón del ISR pintado con la parte del IVA fallan los 30; con la leyenda diciendo la tasa de la actividad aunque falte el RFC fallan los 15 casos sin RFC.
- Barrido: 62 hallazgos distintos antes de las correcciones; después quedan los estados chicos del mapa y un aviso que solo aparece al abrir la página como archivo local (el marco de Substack).

## Validación

VERIFICADO en esta ejecución: pruebas unitarias; arranque de scripts de las dos páginas; inventario con cero divergencias entre el HTML y el diccionario; diccionarios y marcado de idiomas; selectores CSS; tratamiento de usted; 30 casos de la calculadora sin fallas; DOM en inglés de la página principal y de Aprende; validación HTML de las dos páginas y las seis láminas, ya sin excepción para estilos en línea; controles de las láminas. Revisado en navegador a 1440, 390 y 320 pixeles de ancho, en español e inglés: sin errores de página ni desborde horizontal, y ningún texto se sale del talonario; con movimiento reducido el talonario no anima sus anchos y la ruta aparece completa; sin JavaScript el talonario muestra el ejemplo de $20,000.

La entrada de los tramos de la ruta usa animaciones ligadas al desplazamiento (`animation-timeline`). Se comprobó en Chromium; donde el navegador no las conoce el dibujo aparece terminado, que es también el estado con movimiento reducido. No se probó en Safari ni en Firefox.
