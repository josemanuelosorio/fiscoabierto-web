// ==================== RETENCION EN PESOS ====================
// Contrato: entran actividad, monto mensual sin IVA y si la plataforma tiene
// el RFC; sale el recibo del mes (lo que cobra la plataforma, lo que retiene
// de ISR y de IVA, lo que deposita), el acumulado del ano y el umbral del
// 113-B. El umbral se mide con el ejercicio anterior; la calculadora solo
// conoce el ingreso de este ano, asi que el veredicto condiciona al lector.
(function() {
    var range = document.getElementById('calcRange');
    if (!range) return;
    var $ = function (id) { return document.getElementById(id); };
    var amountEl = $('calcAmount'), verdict = $('calcVerdict');

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
    var act = 'venta', rfc = true;
    var actBtns = document.querySelectorAll('.act-btn');
    var rfcBtns = document.querySelectorAll('.rfc-btn');
    var RFC_URL = 'https://www.sat.gob.mx/portal/public/tramites/inscripcion-y-aviso-al-rfc';

    function money(n) {
        return '$' + Math.round(n).toLocaleString('es-MX');
    }
    function pct(r) {
        // 0.021 -> "2.1%", 0.04 -> "4%"
        var v = r * 100;
        return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%';
    }
    // Un recibo para una combinacion dada; se usa dos veces cuando falta el
    // RFC, para decir cuanto mas te depositarian con el.
    function recibo(base, conRfc) {
        var iva = base * IVA;
        var isrR = base * (conRfc ? ACTS[act].now : SIN_RFC);
        var ivaR = iva * (conRfc ? IVA_RET : 1);
        return { base: base, iva: iva, cobra: base + iva, isr: isrR, ivaR: ivaR, dep: base + iva - isrR - ivaR, tasa: conRfc ? ACTS[act].now : SIN_RFC };
    }

    function paint() {
        var monthly = +range.value;
        var r = recibo(monthly, rfc);
        amountEl.textContent = money(monthly);
        $('calcCobra').textContent = money(r.cobra);
        $('calcCobraNota').textContent = t('calc.rCobraNota').replace('{iva}', money(r.iva));
        $('calcIsrL').textContent = t('calc.rIsr').replace('{rate}', pct(r.tasa));
        $('calcIsr').textContent = '−' + money(r.isr);
        $('calcIvaL').textContent = t(rfc ? 'calc.rIvaMitad' : 'calc.rIvaTodo');
        $('calcIvaR').textContent = '−' + money(r.ivaR);
        $('calcDeposito').textContent = money(r.dep);
        $('rbDep').style.width = (r.dep / r.cobra * 100).toFixed(2) + '%';
        $('rbIsr').style.width = (r.isr / r.cobra * 100).toFixed(2) + '%';
        $('rbIva').style.width = (r.ivaR / r.cobra * 100).toFixed(2) + '%';

        // Contexto: sin RFC, cuanto mas te depositarian con el; con RFC, que
        // cambio en 2026 para tu actividad.
        var ctx = $('calcContexto');
        ctx.textContent = '';
        if (!rfc) {
            var conRfc = recibo(monthly, true);
            ctx.textContent = t('calc.ctxSinRfc').replace('{dep}', money(conRfc.dep)).replace('{diff}', money(conRfc.dep - r.dep)) + ' ';
            var a = document.createElement('a');
            a.href = RFC_URL; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = t('calc.ctxSinRfcGo');
            ctx.appendChild(a);
        } else if (ACTS[act].past !== ACTS[act].now) {
            ctx.textContent = t('calc.ctxVenta').replace('{antes}', money(monthly * ACTS[act].past)).replace('{ahora}', money(monthly * ACTS[act].now));
        } else {
            ctx.textContent = t('calc.ctxIgual');
        }
        $('calcAnual').textContent = t('calc.anual').replace('{isr}', money(r.isr * 12)).replace('{iva}', money(r.ivaR * 12));

        // Umbral del 113-B y, si la retencion es anticipo, cuando vence la
        // siguiente declaracion. Remata en la seccion de tramites.
        var overThreshold = monthly * 12 > THRESHOLD;
        verdict.classList.toggle('is-advance', overThreshold);
        verdict.textContent = t(overThreshold ? 'calc.thAdvance' : 'calc.thFinal') + ' ';
        if (overThreshold) {
            var pl = document.createElement('span');
            pl.className = 'calc-plazo';
            pl.textContent = faPlazo.textoMensual('calc.plazo');
            verdict.appendChild(pl);
        }
        var paso = document.createElement('a');
        paso.href = '#tramites';
        paso.className = 'calc-paso';
        paso.textContent = t(overThreshold ? 'calc.pasoAdvance' : 'calc.pasoFinal');
        if (overThreshold) paso.style.display = 'inline-block';
        verdict.appendChild(paso);
    }

    actBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            act = btn.dataset.act;
            actBtns.forEach(function(b) { b.classList.toggle('active', b === btn); });
            paint();
        });
    });
    rfcBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            rfc = btn.dataset.rfc === 'si';
            rfcBtns.forEach(function(b) { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
            paint();
        });
    });
    range.addEventListener('input', paint);
    paint();
    // El recibo se arma en JS, asi que el barrido de data-i18n no lo alcanza.
    document.querySelectorAll('.lang-switch .lang-btn').forEach(function(btn) {
        btn.addEventListener('click', paint);
    });
})();
