(function() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;
    // Cuantas particulas: lo dice el CSS (--hero-particulas), donde vive el
    // corte de pantalla, como --stats-form en la banda de cifras.
    const PARTICLE_COUNT = parseInt(getComputedStyle(canvas.parentElement).getPropertyValue('--hero-particulas'), 10) || 60;
    const CONNECTION_DIST = 150;
    const MOUSE_DIST = 200;
    const mouse = { x: -999, y: -999 };
    let isVisible = true;
    let animId = null;
    const reducedHero = window.matchMedia('(prefers-reduced-motion: reduce)');

    // El lienzo se dibuja a la densidad de la pantalla (tope 2, como el fondo
    // de la seccion de confianza); w y h quedan en pixeles CSS para dibujar.
    function resize() {
        const hero = canvas.parentElement;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = hero.offsetWidth;
        h = hero.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 0.01 + Math.random() * 0.02
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);

        // Lineas entre particulas cercanas
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
                    ctx.strokeStyle = 'rgba(94, 234, 212, ' + alpha + ')';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Lineas entre las particulas y el cursor
        for (let i = 0; i < particles.length; i++) {
            const dx = particles[i].x - mouse.x;
            const dy = particles[i].y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_DIST) {
                const alpha = (1 - dist / MOUSE_DIST) * 0.25;
                ctx.strokeStyle = 'rgba(94, 234, 212, ' + alpha + ')';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }

        // Particulas
        for (const p of particles) {
            p.pulse += p.pulseSpeed;
            const glow = 0.3 + Math.sin(p.pulse) * 0.2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(94, 234, 212, ' + glow + ')';
            ctx.fill();

            // Centro brillante
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (glow * 0.6) + ')';
            ctx.fill();

            // Movimiento, con rebote en los bordes
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
        }

        if (isVisible && !reducedHero.matches) animId = requestAnimationFrame(draw);
    }

    // El cursor sobre el hero (solo escritorio: en tactil no hay mousemove)
    canvas.parentElement.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    canvas.parentElement.addEventListener('mouseleave', function() {
        mouse.x = -999;
        mouse.y = -999;
    });

    // Con el hero fuera de pantalla la animacion se pausa: en movil el scroll se trababa
    const heroObserver = new IntersectionObserver(function(entries) {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !animId && !reducedHero.matches) {
            animId = requestAnimationFrame(draw);
        } else if (!isVisible) {
            if (animId) cancelAnimationFrame(animId);
            animId = null;
        }
    }, { threshold: 0.05 });
    heroObserver.observe(canvas.parentElement);

    // Redimensiona solo cuando cambia el ancho: la barra del navegador movil cambia el alto y no cuenta
    let lastWidth = window.innerWidth;
    let resizeTimer;
    window.addEventListener('resize', function() {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() { resize(); createParticles(); if (reducedHero.matches) draw(); }, 200);
        }
    });
    resize();
    createParticles();
    draw();
})();
