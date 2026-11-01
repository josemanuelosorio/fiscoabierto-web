// ==================== ACORDEON DEL FAQ ====================
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const wasOpen = item.classList.contains('open');
        // Un solo item abierto a la vez: se cierran todos y se abre el pulsado.
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
        // El estado abierto o cerrado se anuncia al lector de pantalla.
        document.querySelectorAll('.faq-question').forEach(b => {
            b.setAttribute('aria-expanded', b.parentElement.classList.contains('open') ? 'true' : 'false');
        });
    });
});

// ==================== DESPLAZAMIENTO SUAVE ====================
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        const target = href === '#' ? document.body : document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        if (href !== '#') {
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }
    });
});

// ==================== APARICION AL DESPLAZAR ====================
(function() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Al terminar el enfoque, quitamos el filtro por completo:
                // blur(0) sigue contando como filtro para el navegador y
                // mantiene capas activas que ya no aportan nada visual.
                entry.target.addEventListener('transitionend', function te(e) {
                    if (e.propertyName === 'filter') {
                        e.currentTarget.style.filter = 'none';
                        e.currentTarget.removeEventListener('transitionend', te);
                    }
                });
                observer.unobserve(entry.target);
            }
        });
    // Umbral más bajo y margen menor: el reveal arranca apenas asoma el
    // elemento, así el contenido no va "detrás" del scroll.
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach(function(el) { observer.observe(el); });
})();
