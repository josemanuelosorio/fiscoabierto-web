(function() {
    // Contrato: entra el conjunto de plataformas seleccionadas y la
    // geometria del paso; salen lineas SVG de cada chip a la pregunta.
    var step1 = document.querySelector('.diag-step[data-step="1"]');
    if (!step1) return;
    var grid = step1.querySelector('.platform-grid');
    var question = step1.querySelector('.diag-question');
    if (!grid || !question) return;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'diag-links');
    svg.setAttribute('aria-hidden', 'true');
    step1.insertBefore(svg, step1.firstChild);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    var count = document.getElementById('selCount');
    function draw() {
        svg.classList.remove('drawn');
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        if (reduced.matches) return;
        var sel = grid.querySelectorAll('.platform-btn.selected');
        if (!sel.length || !count || count.hidden) return;
        var sr = step1.getBoundingClientRect();
        if (!sr.width) return;
        svg.setAttribute('width', sr.width);
        svg.setAttribute('height', sr.height);
        // Hilos curvos: cada seleccion baja y se funde en el contador,
        // tus plataformas se acumulan ahi. Curva cubica con tangentes
        // verticales para que el haz se vea organico, no de plano cartesiano.
        var cr = count.getBoundingClientRect();
        var ax = cr.left + cr.width / 2 - sr.left;
        var ay = cr.top - sr.top - 4;
        sel.forEach(function(btn) {
            var r = btn.getBoundingClientRect();
            var x1 = r.left + r.width / 2 - sr.left;
            var y1 = r.bottom - sr.top;
            var dy = Math.max(24, Math.min(90, (ay - y1) * 0.45));
            var p = document.createElementNS(svgNS, 'path');
            p.setAttribute('d', 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
                ' C ' + x1.toFixed(1) + ' ' + (y1 + dy).toFixed(1) +
                ', ' + ax.toFixed(1) + ' ' + (ay - dy).toFixed(1) +
                ', ' + ax.toFixed(1) + ' ' + ay.toFixed(1));
            p.setAttribute('pathLength', '1');
            svg.appendChild(p);
        });
        requestAnimationFrame(function() { svg.classList.add('drawn'); });
    }
    grid.addEventListener('click', function() { requestAnimationFrame(draw); });
    window.addEventListener('resize', draw);
    if (reduced.addEventListener) reduced.addEventListener('change', draw);
    draw();
})();
