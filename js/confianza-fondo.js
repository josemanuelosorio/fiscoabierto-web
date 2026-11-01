(function() {
    // Particulas mint a la deriva dentro del panel, familia del hero.
    // Contrato: solo pinta cuando el panel esta en pantalla; con menos
    // movimiento, no existe.
    var panel = document.querySelector('.trust-panel');
    if (!panel) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'trust-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    panel.insertBefore(canvas, panel.firstChild);
    var ctx = canvas.getContext('2d');
    var dots = [], w = 0, h = 0, running = false, raf = null;
    var N = 16, LINK = 130;

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = panel.clientWidth; h = panel.clientHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed(i) {
        // sin Math.random por frame: semilla determinista suficiente
        var a = Math.sin(i * 127.1) * 43758.5453;
        return a - Math.floor(a);
    }
    for (var i = 0; i < N; i++) {
        dots.push({ x: seed(i) , y: seed(i + 40), vx: (seed(i + 80) - 0.5) * 0.25, vy: (seed(i + 120) - 0.5) * 0.25 });
    }
    function frame() {
        raf = null;
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < N; i++) {
            var d = dots[i];
            d.px = d.x * w; d.py = d.y * h;
            d.x += d.vx / w; d.y += d.vy / h;
            if (d.x < 0) d.x += 1; if (d.x > 1) d.x -= 1;
            if (d.y < 0) d.y += 1; if (d.y > 1) d.y -= 1;
        }
        ctx.strokeStyle = 'rgba(94, 234, 212, 0.05)';
        ctx.lineWidth = 1;
        for (var a = 0; a < N; a++) {
            for (var b = a + 1; b < N; b++) {
                var dx = dots[a].px - dots[b].px, dy = dots[a].py - dots[b].py;
                if (dx * dx + dy * dy < LINK * LINK) {
                    ctx.beginPath();
                    ctx.moveTo(dots[a].px, dots[a].py);
                    ctx.lineTo(dots[b].px, dots[b].py);
                    ctx.stroke();
                }
            }
        }
        ctx.fillStyle = 'rgba(94, 234, 212, 0.35)';
        for (var c = 0; c < N; c++) {
            ctx.beginPath();
            ctx.arc(dots[c].px, dots[c].py, 1.4, 0, 6.2832);
            ctx.fill();
        }
        raf = requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function(entries) {
        running = entries[0].isIntersecting;
        if (running) { resize(); if (!raf) raf = requestAnimationFrame(frame); }
    }, { threshold: 0.05 });
    io.observe(panel);
    window.addEventListener('resize', function() { if (running) resize(); });
})();
