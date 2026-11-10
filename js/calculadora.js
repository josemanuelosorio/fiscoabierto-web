// ==================== RETENCION EN PESOS ====================
// Contrato: pinta el recibo del mes que calcula js/retencion.js, el acumulado
// del ano y el umbral del 113-B. El umbral se mide con el ejercicio anterior;
// la calculadora solo conoce el ingreso de este ano, asi que el veredicto
// condiciona al lector. El recibo se pinta como talonario: la parte que se
// deposita y dos talones para el SAT, cada uno del ancho que le toca.
(function() {
    const range = document.getElementById('calcRange');
    if (!range) return;
    const $ = function (id) { return document.getElementById(id); };
    const amountEl = $('calcAmount'), verdict = $('calcVerdict');

    const ACTS = calculoRetencion.ACTS;
    let act = 'venta', rfc = true;
    const actBtns = document.querySelectorAll('.act-btn');
    const rfcBtns = document.querySelectorAll('.rfc-btn');
    const RFC_URL = 'https://www.sat.gob.mx/portal/public/tramites/inscripcion-y-aviso-al-rfc';

    function money(n) {
        return '$' + Math.round(n).toLocaleString('es-MX');
    }
    function pct(r) {
        // 0.021 -> "2.1%", 0.04 -> "4%"
        const v = r * 100;
        return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%';
    }
    function recibo(base, conRfc) { return calculoRetencion.recibo(act, base, conRfc); }

    function paint() {
        const monthly = +range.value;
        const r = recibo(monthly, rfc);
        amountEl.textContent = money(monthly);
        $('calcCobra').textContent = money(r.cobra);
        $('calcCobraNota').textContent = t('calc.rCobraNota').replace('{iva}', money(r.iva));
        $('calcIsr').textContent = money(r.isr);
        $('calcIvaR').textContent = money(r.ivaR);
        $('calcDeposito').textContent = money(r.dep);
        // Cada parte del talonario mide lo que le toca de lo cobrado.
        const p = calculoRetencion.partes(r);
        $('talDep').style.flexGrow = (p.dep * 100).toFixed(2);
        $('talIva').style.flexGrow = (p.iva * 100).toFixed(2);
        $('talIsr').style.flexGrow = (p.isr * 100).toFixed(2);
        // Las tasas de los dos talones van en la leyenda, en una oracion.
        $('calcTalones').textContent = t('calc.talones').replace('{isr}', pct(r.tasa)).replace('{iva}', t(rfc ? 'calc.ivaMitad' : 'calc.ivaTodo'));

        // Contexto: sin RFC, cuanto mas te depositarian con el; con RFC, que
        // cambio en 2026 para tu actividad.
        const ctx = $('calcContexto');
        ctx.textContent = '';
        if (!rfc) {
            const conRfc = recibo(monthly, true);
            ctx.textContent = t('calc.ctxSinRfc').replace('{dep}', money(conRfc.dep)).replace('{diff}', money(conRfc.dep - r.dep)) + ' ';
            const a = document.createElement('a');
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
        const overThreshold = calculoRetencion.rebasaUmbral(monthly);
        verdict.classList.toggle('is-advance', overThreshold);
        verdict.textContent = t(overThreshold ? 'calc.thAdvance' : 'calc.thFinal') + ' ';
        if (overThreshold) {
            const pl = document.createElement('span');
            pl.className = 'calc-plazo';
            pl.textContent = faPlazo.textoMensual('calc.plazo');
            verdict.appendChild(pl);
        }
        const paso = document.createElement('a');
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
    document.addEventListener('idioma', paint);
})();
