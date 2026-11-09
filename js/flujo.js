// ==================== FLUJO DEL RECIBO ====================
// Contrato: entra el recibo del mes (ISR retenido, IVA retenido y depósito);
// sale el dibujo: los hilos de js/hilos.js pintados a la izquierda de las
// filas del recibo, cada haz terminando en su fila. Cada fila toma el alto de
// su haz, así que el recibo se alarga cuando sube el monto. Sin este script el
// recibo queda como lista, con su marca de color en cada fila.
var faFlujo = (function () {
    const caja = document.getElementById('calcRecibo');
    const lienzo = document.getElementById('reciboFlujo');
    if (!caja || !lienzo) return { pintar: function () {} };
    const $ = function (id) { return document.getElementById(id); };

    // De arriba hacia abajo, en el orden de las filas: así los haces no se cruzan.
    const HACES = [
        { clave: 'isr', fila: $('filaIsr'), hilos: $('hilosIsr'), resto: $('restoIsr') },
        { clave: 'iva', fila: $('filaIva'), hilos: $('hilosIva'), resto: $('restoIva') },
        { clave: 'dep', fila: $('filaDep'), hilos: $('hilosDep'), resto: $('restoDep') }
    ];
    const HOLGURA = 16;       // aire entre un haz y el de la fila siguiente
    const TRAMO_RECTO = 0.16; // parte del ancho que el tronco corre recto antes de abrirse
    const COLA = 8;           // pixeles rectos con que cada hilo llega a su fila
    const DURACION = 260;     // milisegundos del cambio suave entre dos recibos
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');

    let dibujado = null; // montos que están en pantalla
    let firma = '';      // medidas con que se dibujó, para saber si cambió el espacio
    let cuadro = 0;      // cuadro de animación pendiente

    // Ancho del lienzo y posición de cada fila respecto de la primera.
    function medir() {
        const marco = caja.getBoundingClientRect();
        const primera = HACES[0].fila.getBoundingClientRect();
        const ultima = HACES[HACES.length - 1].fila.getBoundingClientRect();
        const centros = {};
        HACES.forEach(function (h) {
            const r = h.fila.getBoundingClientRect();
            centros[h.clave] = r.top - primera.top + r.height / 2;
        });
        return {
            ancho: lienzo.getBoundingClientRect().width,
            arriba: primera.top - marco.top - caja.clientTop,
            alto: ultima.bottom - primera.top,
            centros: centros
        };
    }
    function firmar(m) {
        return [m.ancho, m.arriba, m.alto, m.centros.isr, m.centros.iva, m.centros.dep].map(Math.round).join(' ');
    }

    function dibujar(montos) {
        // Primero cada fila recibe el alto de su haz (el CSS lo compara con
        // su alto mínimo); con las filas ya en su lugar se mide dónde quedó
        // el centro de cada una.
        HACES.forEach(function (h) {
            h.fila.style.setProperty('--alto-hilos', Math.ceil(hilosRecibo.alto(montos[h.clave]) + HOLGURA) + 'px');
        });
        const m = medir();
        lienzo.style.top = m.arriba + 'px';
        lienzo.style.height = m.alto + 'px';
        // Largo del hilo más largo, por arriba: el ancho más lo que puede
        // bajar o subir. El CSS lo usa para tender los hilos al entrar en
        // pantalla, de modo que el más largo llegue justo al final.
        lienzo.style.setProperty('--largo', String(Math.ceil(m.ancho + m.alto / 2) + 8));
        const haces = hilosRecibo.haces(
            HACES.map(function (h) { return { clave: h.clave, monto: montos[h.clave] }; }),
            { xInicio: 0, xCurva: Math.round(m.ancho * TRAMO_RECTO), xFila: Math.round(m.ancho - COLA), xFin: Math.round(m.ancho),
              centroTronco: m.alto / 2, centros: m.centros }
        );
        HACES.forEach(function (h) {
            h.hilos.setAttribute('d', haces[h.clave].d);
            h.resto.setAttribute('d', haces[h.clave].dResto);
            h.resto.style.strokeWidth = haces[h.clave].grosorResto + 'px';
        });
        dibujado = montos;
        firma = firmar(m);
    }

    // suave: el cambio de actividad o de RFC salta de un recibo a otro, y los
    // hilos lo recorren en DURACION. La barra no lo pide: quien la arrastra ya
    // ve cada paso. Con movimiento reducido no hay recorrido.
    function pintar(recibo, suave) {
        const meta = { isr: recibo.isr, iva: recibo.ivaR, dep: recibo.dep };
        cancelAnimationFrame(cuadro);
        if (!suave || !dibujado || reducido.matches) { dibujar(meta); return; }
        const desde = dibujado, inicio = performance.now();
        (function paso(ahora) {
            const k = Math.max(0, Math.min(1, (ahora - inicio) / DURACION));
            const avance = 1 - Math.pow(1 - k, 3); // sale rápido y frena al llegar
            dibujar({
                isr: desde.isr + (meta.isr - desde.isr) * avance,
                iva: desde.iva + (meta.iva - desde.iva) * avance,
                dep: desde.dep + (meta.dep - desde.dep) * avance
            });
            if (k < 1) cuadro = requestAnimationFrame(paso);
        })(inicio);
    }

    // Con esta clase las filas dejan libre la franja izquierda y aparece el lienzo.
    caja.classList.add('con-flujo');

    // Si cambia el ancho del recibo o una fila se parte en dos renglones, los
    // hilos se vuelven a tender. Se compara la firma para no redibujar por el
    // cambio de alto que provoca el propio dibujo.
    new ResizeObserver(function () {
        if (!dibujado) return;
        requestAnimationFrame(function () {
            if (firmar(medir()) !== firma) dibujar(dibujado);
        });
    }).observe(caja);

    return { pintar: pintar };
})();
