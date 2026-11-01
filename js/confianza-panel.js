(function() {
    // El panel crece al entrar: scale continuo 0.93 -> 1
    // segun cuanto ha subido en el viewport. Misma familia que el
    // scroll-fade: sin umbrales, el scroll manda y el freno congela.
    var panel = document.querySelector('.trust-panel');
    if (!panel) return;
    var section = panel.closest('section');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var ticking = false;
    var vhCache = window.innerHeight;
    function update() {
        ticking = false;
        if (reduced.matches) {
            panel.style.transform = '';
            panel.style.borderRadius = '';
            section.style.backgroundColor = '';
            return;
        }
        var rect = panel.getBoundingClientRect();
        // Alto de ventana cacheado: en telefono la barra del navegador cambia
        // innerHeight en pleno scroll y eso re-encuadraba el panel. Cambio
        // chico = barra; cambio grande = rotacion.
        var v = window.innerHeight;
        if (Math.abs(v - vhCache) > 120) vhCache = v;
        var vh = vhCache;
        var progress = 1 - Math.min(1, Math.max(0, (rect.top - vh * 0.12) / (vh * 0.55)));
        // Encapsulacion notoria: escala amplia, esquinas que se afinan al
        // crecer, y las lineas del diagrama se materializan con la entrada.
        var scale = 0.86 + progress * 0.14;
        panel.style.transform = 'scale(' + scale.toFixed(4) + ')';
        panel.style.borderRadius = (44 - 16 * progress).toFixed(1) + 'px';
        // El entorno se apaga hasta EXACTAMENTE el color del panel
        // (#1C1917): al fondo del viaje, cuadro y mundo son una sola
        // superficie sin costura. Al subir de regreso, amanece.
        var r = Math.round(250 + (28 - 250) * progress);
        var g = Math.round(250 + (25 - 250) * progress);
        var b = Math.round(249 + (23 - 249) * progress);
        section.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (reduced.addEventListener) {
        reduced.addEventListener('change', function() { onScroll(); });
    }
    update();
})();
