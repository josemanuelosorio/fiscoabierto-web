(function () {
    var vids = [document.getElementById('vidPlayer'), document.getElementById('vidPlayer2')];
    if (!vids[0] || !vids[1]) return;
    var section = document.getElementById('videos');
    var frame = document.getElementById('vidFrame');
    var poster = document.getElementById('vidPoster');
    var caps = Array.prototype.slice.call(document.querySelectorAll('.vid-ch'));
    var fills = caps.map(function (c) { return c.querySelector('.vid-ch-fill'); });
    var orden = caps.map(function (c) { return c.dataset.vid; });
    var textEl = document.getElementById('vidText');
    var nowEl = document.getElementById('vidNow');
    var nowN = document.getElementById('vidNowN');
    var nowT = document.getElementById('vidNowT');
    var tituloEspera = null;
    var boton = document.getElementById('vidPlay');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var narrow = window.matchMedia('(max-width: 600px)');
    // i = capitulo en curso; cur = cual de los dos <video> lo lleva.
    var i = 0, cur = 0, cargado = false, visible = false, pausadoPorScroll = false, espera = null;
    // t() y currentLanguage vienen del script principal; se leen en cada uso.
    function texto(k) { return typeof t === 'function' ? t(k) : ''; }
    function idioma() { return typeof currentLanguage === 'string' ? currentLanguage : 'es'; }
    function actual() { return vids[cur]; }
    function reserva() { return vids[1 - cur]; }
    function ultimo() { return i === orden.length - 1; }
    // Un archivo por video, idioma y formato: videos/<video>-<es|en>[-m].mp4
    function ruta(j) { return 'videos/' + orden[j] + '-' + idioma() + (narrow.matches ? '-m' : ''); }

    function reproducir() {
        var v = actual();
        var p = v.play();
        // Si el navegador no deja arrancar (ahorro de energia, datos), queda
        // el poster, que es el diagrama terminado, y el boton de play.
        if (p && p.catch) p.catch(function () { mostrarPoster(true); pintarBoton(); });
    }
    function mostrarPoster(si) {
        if (si) poster.style.backgroundImage = 'url(' + ruta(i) + '-poster.webp)';
        poster.classList.toggle('is-off', !si);
    }
    // El boton dice lo que va a hacer. Entre un capitulo y el siguiente sigue en pausa.
    function pintarBoton() {
        var v = actual();
        var estado = v.ended && ultimo() ? 'replay' : (v.paused && !espera ? 'play' : 'pause');
        boton.dataset.estado = estado;
        boton.setAttribute('aria-label', texto('vid.' + estado));
    }
    function barra(j, pct, viva) {
        fills[j].classList.toggle('is-live', viva);
        fills[j].style.width = pct + '%';
    }
    function pintarCapitulos() {
        caps.forEach(function (c, j) {
            c.setAttribute('aria-pressed', j === i ? 'true' : 'false');
            c.classList.toggle('is-done', j < i);
        });
        fills.forEach(function (f, j) { if (j !== i) barra(j, j < i ? 100 : 0, false); });
        textEl.textContent = texto('vid.tx' + (i + 1));
        titulo('0' + (i + 1), texto('vid.tab' + (i + 1)));
    }
    // El titulo sale hacia arriba, cambia y entra desde abajo. Con movimiento
    // reducido, o si el texto no cambio, se escribe directo.
    function titulo(n, nombre) {
        if (nowN.textContent === n && nowT.textContent === nombre) return;
        clearTimeout(tituloEspera);
        function poner() { nowN.textContent = n; nowT.textContent = nombre; }
        if (reduced.matches) { poner(); return; }
        nowEl.classList.add('is-out');
        tituloEspera = setTimeout(function () {
            poner();
            nowEl.classList.remove('is-out');
            nowEl.classList.add('is-in');
            void nowEl.offsetWidth; // aplica el punto de partida antes de animar
            nowEl.classList.remove('is-in');
        }, 180);
    }
    function montar(v, j) {
        var base = ruta(j);
        if (v.dataset.base === base) return;
        v.dataset.base = base;
        v.preload = 'auto';
        v.src = base + '.mp4';
        v.load();
    }
    function enfrente(v) {
        vids.forEach(function (x) {
            x.classList.toggle('is-off', x !== v);
            x.setAttribute('aria-hidden', x === v ? 'false' : 'true');
            x.tabIndex = x === v ? 0 : -1;
        });
    }
    // Mientras corre un capitulo, el <video> de reserva baja el siguiente.
    function precargar() {
        if (ultimo()) return;
        montar(reserva(), i + 1);
    }
    function cargar(correr) {
        var v = actual();
        montar(v, i);
        cargado = true;
        barra(i, 0, false);
        pintarCapitulos();
        enfrente(v);
        // Con movimiento reducido no arranca solo: el poster es el estado.
        if (!correr) mostrarPoster(true);
        if (correr) reproducir();
        pintarBoton();
    }
    // Cambio de capitulo: si el siguiente ya esta en la reserva, los dos
    // <video> se cruzan en un fundido; si no, se carga en el mismo.
    function ir(j, correr) {
        clearTimeout(espera); espera = null;
        if (cargado && j === i) { actual().currentTime = 0; if (correr) reproducir(); pintarBoton(); return; }
        var listo = cargado && reserva().dataset.base === ruta(j);
        if (listo) { actual().pause(); cur = 1 - cur; }
        i = j;
        cargar(correr);
    }
    function alternar() {
        if (!cargado) cargar(false);
        var v = actual();
        if (v.ended && ultimo()) { ir(0, true); return; }
        if (v.paused && !espera) { pausadoPorScroll = false; reproducir(); }
        else { clearTimeout(espera); espera = null; v.pause(); }
        pintarBoton();
    }
    function esActual(e) { return e.target === actual(); }

    boton.addEventListener('click', alternar);
    caps.forEach(function (c, j) { c.addEventListener('click', function () { ir(j, true); }); });
    vids.forEach(function (v) {
        v.addEventListener('click', alternar);
        v.addEventListener('playing', function (e) {
            if (!esActual(e)) return;
            mostrarPoster(false);
            precargar();
        });
        v.addEventListener('timeupdate', function (e) {
            if (esActual(e) && v.duration) barra(i, v.currentTime / v.duration * 100, true);
        });
        // Al terminar un capitulo pasa solo al siguiente; el ultimo se queda en su cierre.
        v.addEventListener('ended', function (e) {
            if (!esActual(e)) return;
            barra(i, 100, false);
            if (!ultimo()) espera = setTimeout(function () { espera = null; ir(i + 1, visible); }, 900);
            pintarBoton();
        });
        ['play', 'pause', 'emptied'].forEach(function (ev) {
            v.addEventListener(ev, function (e) { if (esActual(e)) pintarBoton(); });
        });
    });

    // Cambio de idioma o de formato: ambos <video> quedan con otra ruta.
    function recargar() {
        if (!cargado) { pintarCapitulos(); return; }
        var corria = !actual().paused;
        vids.forEach(function (v) { v.dataset.base = ''; });
        cargar(corria);
    }
    // Corre despues de setLanguage: el mismo clic ya cambio currentLanguage.
    document.querySelectorAll('.lang-switch .lang-btn').forEach(function (b) { b.addEventListener('click', recargar); });
    if (narrow.addEventListener) narrow.addEventListener('change', recargar);
    pintarCapitulos();
    pintarBoton();

    if (!('IntersectionObserver' in window)) { cargar(false); return; }
    // El poster y el video se piden cerca del viewport, no en la carga inicial.
    new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !cargado) cargar(false);
    }, { rootMargin: '600px 0px' }).observe(section);
    // Arranca solo la primera vez que se ve, y se pausa si sales a media reproduccion.
    new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (!visible && !cargado) return;
        if (!cargado) cargar(false);
        var v = actual();
        if (visible) {
            if (reduced.matches) return;
            if (pausadoPorScroll || (i === 0 && v.paused && v.currentTime === 0)) { pausadoPorScroll = false; reproducir(); }
        } else if (!v.paused) {
            pausadoPorScroll = true;
            v.pause();
        }
    }, { threshold: 0.6 }).observe(frame);
})();
