// ==================== CALCULO DE LA RETENCION ====================
// Contrato: entran actividad (venta, transporte u hospedaje), monto mensual
// sin IVA y si la plataforma tiene el RFC; sale el recibo del mes: lo que
// cobra la plataforma, lo que retiene de ISR y de IVA y lo que deposita.
// No toca el DOM: js/calculadora.js lo pinta y tools/unitarias.js lo prueba.
var calculoRetencion = (function () {
    // Las tres tasas del Art. 113-A, parrafo tercero. La LIF 2026 solo sustituyo
    // la fraccion III; las fracciones I y II quedaron intactas, asi que para
    // transporte y hospedaje la tasa de 2025 y la de 2026 son la misma.
    var ACTS = {
        venta:      { past: 0.010, now: 0.025, frac: 'III' },
        transporte: { past: 0.021, now: 0.021, frac: 'I' },
        hospedaje:  { past: 0.040, now: 0.040, frac: 'II' }
    };
    var THRESHOLD = 300000; // Umbral del Art. 113-B LISR
    var SIN_RFC = 0.20; // Art. 113-C, fraccion IV LISR: sin RFC, retencion del 20%
    var IVA = 0.16; // Tasa general de IVA; el calculo supone que la actividad la causa
    var IVA_RET = 0.50; // Art. 18-J, fraccion II, inciso a) LIVA: la plataforma retiene el 50% del IVA cobrado; 100% sin RFC

    // Un recibo para una combinacion dada; la calculadora lo pide dos veces
    // cuando falta el RFC, para decir cuanto mas depositarian con el.
    function recibo(act, base, conRfc) {
        var tasa = conRfc ? ACTS[act].now : SIN_RFC;
        var iva = base * IVA;
        var isrR = base * tasa;
        var ivaR = iva * (conRfc ? IVA_RET : 1);
        return { base: base, iva: iva, cobra: base + iva, isr: isrR, ivaR: ivaR, dep: base + iva - isrR - ivaR, tasa: tasa };
    }
    // El umbral del 113-B es anual: doce veces el monto del mes.
    function rebasaUmbral(mensual) { return mensual * 12 > THRESHOLD; }

    return { ACTS: ACTS, THRESHOLD: THRESHOLD, recibo: recibo, rebasaUmbral: rebasaUmbral };
})();

// En node (pruebas de tools/) el mismo archivo se puede cargar con require.
if (typeof module !== 'undefined') module.exports = calculoRetencion;
