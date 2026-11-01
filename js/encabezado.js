(function() {
    // Contrato: entra scrollY, sale UNA clase en el nav. Nada mas.
    var nav = document.getElementById('topnav');
    if (!nav) return;
    var ticking = false;
    function update() {
        ticking = false;
        nav.classList.toggle('shrunk', window.scrollY > 24);
        // El CTA del nav entra cuando el del hero ya salio de pantalla.
        nav.classList.toggle('cta-on', window.scrollY > window.innerHeight * 0.55);
    }
    window.addEventListener('scroll', function() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
})();
