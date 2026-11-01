// ==================== MAPA DEL IMPUESTO AL HOSPEDAJE ====================
// Datos: HOSPEDAJE, en js/datos/hospedaje.js (se carga antes que este archivo).
(function() {
    const group = document.getElementById('mxStates');
    const panel = document.getElementById('mapPanel');
    if (!group || !panel) return;

    let active = null;
    let activeId = null;
    const montoEl = document.getElementById('mapMonto');
    if (montoEl) montoEl.addEventListener('input', function () { paintPanel(activeId); });

    function fmtPct(v) {
        return (v % 1 === 0 ? v.toFixed(0) : String(v)) + '%';
    }

    function paintPanel(id) {
        let name, figure, text;
        if (!id) {
            name = t('map.panelNatName');
            figure = '2% - 6%';
            text = t('map.panelNatText');
        } else {
            const d = HOSPEDAJE[id];
            name = d.n;
            figure = fmtPct(d.t);
            text = t('map.ret_' + d.r) + ' ' + t('map.basis').replace('{f}', d.f);
            const nota = currentLanguage === 'en' ? d.nota_en : d.nota;
            if (nota) text += ' ' + nota;
        }
        panel.innerHTML = '<div class="map-panel-name"></div><div class="map-panel-figure"></div><div class="map-panel-pesos"></div><div class="map-panel-text"></div>';
        panel.querySelector('.map-panel-name').textContent = name;
        panel.querySelector('.map-panel-figure').textContent = figure;
        panel.querySelector('.map-panel-text').textContent = text;
        // En pesos: sobre el monto del lector, con la tasa efectiva cuando la
        // hay (Chihuahua suma el adicional universitario, campo ef).
        const pesos = panel.querySelector('.map-panel-pesos');
        const monto = Math.max(0, +(montoEl && montoEl.value) || 0);
        if (id && monto) {
            const d2 = HOSPEDAJE[id], tasa = d2.ef || d2.t;
            const m = function (n) { return '$' + Math.round(n).toLocaleString('es-MX'); };
            pesos.textContent = t('map.pesos').replace('{monto}', m(monto)).replace('{imp}', m(monto * tasa / 100)).replace('{tasa}', fmtPct(tasa));
        } else {
            panel.removeChild(pesos);
        }
    }

    // La cubeta de color la asigna el dato, no el HTML: asi cambiar una tasa
    // solo obliga a editar HOSPEDAJE y no a regenerar los 32 paths.
    group.querySelectorAll('.mx-st').forEach(function(el) {
        const d = HOSPEDAJE[el.getAttribute('data-st')];
        if (d) {
            el.setAttribute('class', 'mx-st b' + d.b + (d.r === 'nv' ? ' is-partial' : ''));
            el.setAttribute('aria-label', d.n + ': ' + fmtPct(d.t));
        }
    });

    group.querySelectorAll('.mx-st').forEach(function(el) {
        function activate() {
            if (active) active.classList.remove('is-active');
            el.classList.add('is-active');
            active = el;
            activeId = el.getAttribute('data-st');
            paintPanel(activeId);
        }
        el.addEventListener('mouseenter', activate);
        el.addEventListener('click', activate);
        el.addEventListener('focus', activate);
    });

    paintPanel(null);
    document.addEventListener('idioma', function() { paintPanel(activeId); });
})();
