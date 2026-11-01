// ==================== EVALUACION DEL DIAGNOSTICO ====================
// Contrato: entran las respuestas del diagnostico (categorias de las
// plataformas elegidas, cuantas son, ingreso, situacion fiscal y facturacion);
// salen el nivel de exposicion y las claves del diccionario (diag.*, pasos.*)
// de lo que el SAT ve, de las obligaciones y de los pasos a seguir.
// No toca el DOM ni el idioma: js/diagnostico.js traduce las claves y pinta;
// tools/unitarias.js lo prueba en node.
var evaluarDiagnostico = (function () {
    // Puntos de exposicion. Es una escala del sitio para ordenar casos, no una
    // regla de la ley: suma lo visible que es cada fuente de ingreso para el
    // SAT, el nivel de ingreso y la brecha de cumplimiento que declara el lector.
    const PUNTOS = {
        categoria: { marketplace: 3, transporte: 2, delivery: 2, hospedaje: 3, contenido: 2, freelance: 2, pagos: 2, crypto: 2 },
        ingreso: { muy_alto: 4, alto: 3, umbral: 3, medio: 2 }, // cualquier otro ingreso suma 1
        fiscal: { ninguna: 4, alta_sin_declarar: 3, declaro_parcial: 2, no_se: 3 },
        factura: { no: 2, no_se: 2, algunas: 1 }
    };
    // Con 8 puntos o mas la exposicion es alta; de 5 a 7, media; abajo, baja.
    const ALTA = 8, MEDIA = 5;
    const VISIBLES = ['marketplace', 'transporte', 'delivery', 'hospedaje', 'contenido', 'freelance', 'pagos', 'crypto'];

    function evaluar(r) {
        const cat = new Set(r.categorias);
        const tiene = function (c) { return cat.has(c); };
        let puntos = 0;
        const visibilidad = [], obligaciones = [];

        // --- Visibilidad por plataforma ---
        VISIBLES.forEach(function (c) {
            if (tiene(c)) { visibilidad.push('diag.ve.' + c); puntos += PUNTOS.categoria[c]; }
        });

        // --- Ingresos ---
        puntos += PUNTOS.ingreso[r.ingreso] || 1;
        // Umbral de $300,000 del Art. 113-B LISR. La opcion se mide con el
        // ejercicio anterior; rebasar el umbral este ano la cierra desde el siguiente.
        if (r.ingreso === 'alto' || r.ingreso === 'muy_alto') obligaciones.push('diag.ob.umbralRebasado');
        else if (r.ingreso === 'umbral') obligaciones.push('diag.ob.umbralCerca');

        // --- Situacion fiscal ---
        puntos += PUNTOS.fiscal[r.fiscal] || 0;
        const porFiscal = { ninguna: 'diag.ob.alta', alta_sin_declarar: 'diag.ob.pendientes', declaro_parcial: 'diag.ob.revisaIngresos', no_se: 'diag.ob.revisaSituacion' };
        if (porFiscal[r.fiscal]) obligaciones.push(porFiscal[r.fiscal]);

        // --- Facturacion ---
        puntos += PUNTOS.factura[r.factura] || 0;
        if (r.factura === 'no' || r.factura === 'no_se') obligaciones.push('diag.ob.facturar');
        if (r.factura === 'algunas') obligaciones.push('diag.ob.facturarTodo');

        // --- Obligaciones por tipo (con el matiz del pago definitivo 113-B) ---
        const excedeUmbral = r.ingreso === 'umbral' || r.ingreso === 'alto' || r.ingreso === 'muy_alto';
        const plataformasRegimen = tiene('marketplace') || tiene('transporte') || tiene('hospedaje') || tiene('delivery');
        // El 113-B solo admite ingresos de plataformas mas sueldo (cap. I) e
        // intereses (cap. VI). Cripto (enajenacion) y creadores quedan fuera.
        const otrosIngresosExcluyen = tiene('crypto') || tiene('contenido');
        if (plataformasRegimen && !excedeUmbral && otrosIngresosExcluyen) obligaciones.push('diag.ob.definitivoNo');
        else if (plataformasRegimen && !excedeUmbral) obligaciones.push('diag.ob.definitivo');
        // Cripto de persona fisica fuera de actividad empresarial es enajenacion
        // de bienes (pago por operacion, Art. 126 LISR), no pagos mensuales.
        const mensuales = excedeUmbral || ['contenido', 'freelance', 'pagos', 'otro'].some(tiene);
        if (mensuales) obligaciones.push('diag.ob.mensuales');
        if (mensuales || tiene('crypto')) obligaciones.push('diag.ob.anual');
        if ((tiene('contenido') || tiene('freelance') || tiene('pagos')) && r.factura === 'si_todas') obligaciones.push('diag.ob.sigueFacturando');
        if (tiene('crypto')) obligaciones.push('diag.ob.enajenacion');

        // --- Pasos ---
        // Cada paso es un tramite de la rama del panel (01 a 06) o la factura;
        // nota es una clave del diccionario o 'plazo' (agrega la fecha limite).
        // Las notas sin tramite van al final.
        const pasos = [];
        function paso(n, nota) {
            if (pasos.some(function (x) { return x.n === n; })) return;
            pasos.push({ n: n, nota: nota });
        }
        if (r.fiscal === 'ninguna') { paso('01'); paso('02'); paso('05', 'pasos.oblig'); paso('04'); paso('03'); }
        else if (r.fiscal === 'no_se') { paso('04', 'pasos.revisa'); paso('02', 'pasos.sinPass'); }
        else if (r.fiscal === 'alta_sin_declarar') { paso('04'); paso('06', 'plazo'); paso('03'); }
        else if (r.fiscal === 'declaro_parcial') { paso('04'); paso('05', 'pasos.oblig'); paso('06', 'plazo'); }
        else { if (mensuales) paso('06', 'plazo'); paso('03'); }
        if (r.factura === 'no' || r.factura === 'no_se' || r.factura === 'algunas') paso('cfdi');
        const notas = [];
        if (r.fiscal === 'ninguna' || r.fiscal === 'alta_sin_declarar' || r.fiscal === 'no_se') notas.push('pasos.contador');
        if (r.nPlataformas > 2) notas.push('pasos.mapea');

        // --- Nivel final ---
        // La visibilidad sola no es exposicion: sin brecha de cumplimiento, el nivel es bajo.
        const sinBrecha = r.fiscal === 'al_corriente' && r.factura === 'si_todas';
        const nivel = sinBrecha ? 'bajo' : puntos >= ALTA ? 'alto' : puntos >= MEDIA ? 'medio' : 'bajo';

        return { nivel: nivel, puntos: puntos, visibilidad: visibilidad, obligaciones: obligaciones, pasos: pasos, notas: notas };
    }

    evaluar.PUNTOS = PUNTOS;
    evaluar.ALTA = ALTA;
    evaluar.MEDIA = MEDIA;
    return evaluar;
})();

// En node (pruebas de tools/) el mismo archivo se puede cargar con require.
if (typeof module !== 'undefined') module.exports = evaluarDiagnostico;
