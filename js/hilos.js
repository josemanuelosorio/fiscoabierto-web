// ==================== HILOS DEL RECIBO ====================
// Contrato: entran los montos del recibo, en el orden en que se apilan, y la
// geometría del lienzo; sale, para cada monto, su haz de hilos con el trazo
// SVG que los lleva del tronco (lo que cobra la plataforma) a su fila.
// Un hilo completo vale UNIDAD pesos. Lo que no alcanza para un hilo completo
// se dibuja como un último hilo más delgado, en proporción a lo que sobra.
// No toca el DOM: js/flujo.js lo pinta y tools/unitarias.js lo prueba.
var hilosRecibo = (function () {
    const UNIDAD = 1000; // pesos por hilo completo
    const PASO = 2;      // pixeles entre el centro de un hilo y el del siguiente
    const GROSOR = 1.1;  // grosor de un hilo completo, en pixeles
    const GROSOR_MINIMO = 0.6;  // más delgado que esto, un hilo se pierde en una pantalla de densidad normal
    const RESTO_MINIMO = 0.005; // fracción de hilo que ya no se dibuja: 5 pesos

    // Parte un monto en hilos completos y la fracción que sobra.
    // 23,200 pesos son 23 hilos y 0.2 de hilo.
    function partir(monto) {
        const hilos = Math.max(0, monto) / UNIDAD;
        const enteros = Math.floor(hilos + 1e-9);
        const fraccion = hilos - enteros;
        return { enteros: enteros, fraccion: fraccion > RESTO_MINIMO ? fraccion : 0 };
    }

    // Alto que ocupa un monto en el lienzo: proporcional a los pesos, para
    // que dos haces se puedan comparar a ojo.
    function alto(monto) { return Math.max(0, monto) / UNIDAD * PASO; }

    // Centro del primer hilo de un haz que empieza en `arriba`. Se ajusta a
    // medio pixel para que las líneas horizontales salgan nítidas.
    function primerCentro(arriba) { return Math.round(arriba + PASO / 2 - 0.5) + 0.5; }

    // Un hilo: recto en el tronco, curva en S hasta su fila y recto al final.
    function trazo(geo, yTronco, yFila) {
        const medio = (geo.xCurva + geo.xFila) / 2;
        return 'M' + geo.xInicio + ' ' + yTronco +
               'H' + geo.xCurva +
               'C' + medio + ' ' + yTronco + ' ' + medio + ' ' + yFila + ' ' + geo.xFila + ' ' + yFila +
               'H' + geo.xFin;
    }

    // montos: [{ clave, monto }] de arriba hacia abajo.
    // geo: { xInicio, xCurva, xFila, xFin, centroTronco, centros: { clave: y } }.
    // Sale { clave: { enteros, fraccion, grosorResto, d, dResto } }: `d` trae
    // todos los hilos completos del haz en un solo atributo y `dResto` el
    // hilo delgado, que lleva otro grosor.
    function haces(montos, geo) {
        const total = montos.reduce(function (suma, m) { return suma + alto(m.monto); }, 0);
        let arribaTronco = geo.centroTronco - total / 2;
        const salida = {};
        montos.forEach(function (m) {
            const parte = partir(m.monto);
            const altoHaz = alto(m.monto);
            const yTronco = primerCentro(arribaTronco);
            const yFila = primerCentro(geo.centros[m.clave] - altoHaz / 2);
            let d = '';
            for (let i = 0; i < parte.enteros; i++) d += trazo(geo, yTronco + i * PASO, yFila + i * PASO);
            // El hilo delgado va pegado al último completo, centrado en el
            // espacio que le corresponde a su fracción.
            const corrimiento = (parte.enteros - 0.5 + parte.fraccion / 2) * PASO;
            salida[m.clave] = {
                enteros: parte.enteros,
                fraccion: parte.fraccion,
                grosorResto: parte.fraccion ? Math.max(GROSOR_MINIMO, GROSOR * parte.fraccion) : 0,
                d: d,
                dResto: parte.fraccion ? trazo(geo, yTronco + corrimiento, yFila + corrimiento) : ''
            };
            arribaTronco += altoHaz;
        });
        return salida;
    }

    return { UNIDAD: UNIDAD, PASO: PASO, GROSOR: GROSOR, partir: partir, alto: alto, haces: haces };
})();

// En node (pruebas de tools/) el mismo archivo se puede cargar con require.
if (typeof module !== 'undefined') module.exports = hilosRecibo;
