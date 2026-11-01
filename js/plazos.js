// ==================== PLAZOS ====================
// Contrato: entra un dia (hoy por omision); salen la fecha limite de la
// siguiente declaracion mensual y la de la anual, ya corridas al siguiente
// dia habil. Fuente: art. 106 LISR (mensual, a mas tardar el dia 17 del mes
// siguiente), art. 150 LISR (anual, en abril) y art. 12 CFF (dias inhabiles;
// si la fecha cae en uno, el plazo se prorroga al siguiente dia habil). Las
// vacaciones del SAT no cuentan: para declaraciones esos dias son habiles.
// No incluye dias que el SAT declare inhabiles por regla (jueves y viernes
// santos): en esos casos la fecha que da es la mas temprana, nunca la tardia.
var faPlazo = (function () {
    function lunes(y, m, n) { var d = new Date(y, m, 1); return 1 + (8 - d.getDay()) % 7 + (n - 1) * 7; }
    function inhabil(d) {
        var w = d.getDay(), y = d.getFullYear(), m = d.getMonth(), x = d.getDate();
        if (w === 0 || w === 6) return true;
        return (m === 0 && x === 1) || (m === 1 && x === lunes(y, 1, 1)) || (m === 2 && x === lunes(y, 2, 3)) ||
            (m === 4 && (x === 1 || x === 5)) || (m === 8 && x === 16) || (m === 10 && x === lunes(y, 10, 3)) ||
            (m === 11 && x === 25);
    }
    function habil(d) { while (inhabil(d)) d.setDate(d.getDate() + 1); return d; }
    function hoy() { var h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); }
    function mensual(h) {
        h = h || hoy();
        var d = habil(new Date(h.getFullYear(), h.getMonth(), 17));
        return d < h ? habil(new Date(h.getFullYear(), h.getMonth() + 1, 17)) : d;
    }
    function anual(h) {
        h = h || hoy();
        var y = h.getFullYear(), fin = habil(new Date(y, 3, 30));
        if (h > fin) { y++; fin = habil(new Date(y, 3, 30)); }
        return { ejercicio: y - 1, fin: fin, enCurso: h >= new Date(y, 0, 1) && h.getMonth() <= 3 && h.getFullYear() === y };
    }
    function dias(d, h) { return Math.round((d - (h || hoy())) / 86400000); }
    var DIAS = { es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
    var MESES = { es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
    function fecha(d) {
        var en = currentLanguage === 'en';
        return en ? DIAS.en[d.getDay()] + ', ' + MESES.en[d.getMonth()] + ' ' + d.getDate()
                  : DIAS.es[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES.es[d.getMonth()];
    }
    function cuando(d) {
        var n = dias(d);
        return n <= 0 ? t('plazo.hoy') : (n === 1 ? t('plazo.dia') : t('plazo.dias').replace('{n}', n));
    }
    // Textos listos en el idioma actual.
    function textoMensual(clave) {
        var d = mensual();
        return t(clave || 'plazo.mensual').replace('{fecha}', fecha(d)).replace('{cuando}', cuando(d));
    }
    function textoAnual() {
        var a = anual();
        if (a.enCurso) return t('plazo.anual').replace('{ej}', a.ejercicio).replace('{fecha}', fecha(a.fin)).replace('{cuando}', cuando(a.fin));
        return t('plazo.anualLejos').replace('{ej}', a.ejercicio).replace('{sig}', a.fin.getFullYear());
    }
    return { mensual: mensual, anual: anual, dias: dias, textoMensual: textoMensual, textoAnual: textoAnual };
})();

// En node (pruebas de tools/) el mismo archivo se puede cargar con require.
if (typeof module !== 'undefined') module.exports = faPlazo;
