(function() {
    // Contrato: entra "el mapa asomo al viewport"; sale UNA clase menos y
    // 32 delays. El orden narrativo es la tasa: b1 (2%) primero, b5 (6%)
    // al final: el mapa cuenta "va del 2% al 6%" mientras se pinta.
    const svg = document.querySelector('.mxmap');
    const group = document.getElementById('mxStates');
    if (!svg || !group) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const paths = Array.prototype.slice.call(group.querySelectorAll('.mx-st'));
    function bucket(p) {
        const m = (p.className.baseVal || '').match(/\bb(\d)\b/);
        return m ? +m[1] : 6;
    }
    const sorted = paths.slice().sort(function(a, b) { return bucket(a) - bucket(b); });
    svg.classList.add('unpainted');
    sorted.forEach(function(p, i) {
        // primer delay = filter (hover, sin retraso); segundo = fill
        p.style.transitionDelay = '0s, ' + (0.1 + i * 0.035).toFixed(3) + 's';
    });
    var io = new IntersectionObserver(function(entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(function() { svg.classList.remove('unpainted'); });
        // pasada la oleada, fuera delays: el hover queda inmediato
        setTimeout(function() {
            paths.forEach(function(p) { p.style.transitionDelay = ''; });
        }, 2600);
    }, { threshold: 0.35 });
    io.observe(svg);
})();
