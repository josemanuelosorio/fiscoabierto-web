(function() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;
    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 30 : 60;
    const CONNECTION_DIST = 150;
    const MOUSE_DIST = 200;
    let mouse = { x: -999, y: -999 };
    let isVisible = true;
    let animId = null;
    const reducedHero = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
        const hero = canvas.parentElement;
        w = canvas.width = hero.offsetWidth;
        h = canvas.height = hero.offsetHeight;
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

        // connections
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
        for (let p of particles) {
            p.pulse += p.pulseSpeed;
            const glow = 0.3 + Math.sin(p.pulse) * 0.2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(94, 234, 212, ' + glow + ')';
            ctx.fill();

            // bright core
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (glow * 0.6) + ')';
            ctx.fill();

            // move
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
    var heroObserver = new IntersectionObserver(function(entries) {
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
    var lastWidth = window.innerWidth;
    var resizeTimer;
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
