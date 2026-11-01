// ==================== RAMA DE TRAMITES ====================
// Contrato: pinta el plazo de la siguiente declaracion bajo el tramite 06 y,
// cuando un enlace interno apunta a un tramite (data-tram), lo resalta al
// llegar. No toca las URLs: viven en el HTML de la rama.
(function () {
    const plazo = document.getElementById('tramPlazo');
    function pintar() { if (plazo) plazo.textContent = faPlazo.textoMensual() + ' ' + faPlazo.textoAnual(); }
    pintar();
    document.addEventListener('idioma', pintar);
    document.addEventListener('click', function (e) {
        const a = e.target.closest && e.target.closest('a[data-tram]');
        if (!a) return;
        const li = document.getElementById('tram-' + a.dataset.tram);
        if (!li) return;
        li.classList.add('is-flash');
        setTimeout(function () { li.classList.remove('is-flash'); }, 2600);
    });
})();
