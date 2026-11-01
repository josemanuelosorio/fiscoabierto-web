(function() {
    // DOS FORMAS, UN SOLO CONTRATO: entra una posicion de scroll, sale UN foco
    // continuo 0..n-1, y de ahi salen la opacidad y el arranque del contador.
    //   pin  (escritorio): el marco se queda pegado y las fichas viven
    //        apiladas en la misma celda: el scroll no las desfila, las
    //        intercambia, y el centro nunca se mueve.
    //   deck (telefono): carrusel vertical con snap DENTRO de una pantalla:
    //        la pagina no se alarga y el foco lo dicta el
    //        scroll del propio carrusel, no el de la ventana. Aqui el fundido
    //        lo hace el navegador con el snap; el foco solo sirve para saber
    //        que cifra arrancar.
    // Cual toca lo dice el CSS en --stats-form, no un media query repetido aqui.
    const track = document.querySelector('.stats-items');
    const pin = document.querySelector('.stats-pin');
    if (!track || !pin) return;
    const items = Array.prototype.slice.call(pin.querySelectorAll('.stats-item'));
    if (!items.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function forma() {
        const v = getComputedStyle(track).getPropertyValue('--stats-form');
        return (v || 'pin').trim() === 'deck' ? 'deck' : 'pin';
    }

    // El alto de ventana se cachea: en telefono la barra del navegador lo
    // cambia en pleno scroll y la pista no debe re-medirse por eso.
    let vhCache = window.innerHeight;
    function stableVH() {
        const v = window.innerHeight;
        if (Math.abs(v - vhCache) > 120) vhCache = v;
        return vhCache;
    }

    const POR_FICHA = 0.36;      // pantallas de scroll que dura cada ficha (pin)
    const PERSIGUE = 55;         // ms de la constante del seguidor: mas chico, mas rapido
    let focus = 0, target = 0, chase = null, lastTs = 0, ticking = false;
    // Arranca en 0 a proposito: la primera cifra la dispara el observer al
    // entrar la seccion, aqui solo pedimos de la segunda en adelante.
    let ultimoActivo = 0;

    // Cuanto se desplaza cada ficha por paso de foco (solo en pin). Con 26px las
    // dos fichas del relevo ocupaban exactamente los mismos renglones y se veian
    // encimadas. El 26% que lo arreglo era del arreglo ANTERIOR (ventana ancha,
    // las dos vecinas al 35% en el relevo); con la ventana 0.30-0.55 el relevo
    // ocurre al 0.10 de brillo y ya no hay nada que separar, asi que 26% solo
    // dejaba la ficha en reposo hasta 100px fuera del centro, que es justo la
    // deriva que veniamos a matar. 13% deja ese error en 33px como maximo.
    // Se recalcula al medir la pista: leer el alto en el paint es un reflow.
    let DESP = 110;
    function sizeTrack() {
        if (forma() === 'deck' || reduced.matches) { track.style.height = ''; return; }
        const ph = pin.offsetHeight;
        DESP = Math.max(70, Math.min(130, Math.round(ph * 0.13)));
        const h = Math.round(ph + items.length * stableVH() * POR_FICHA);
        if (track.style.height !== h + 'px') track.style.height = h + 'px';
    }
    function smooth(a, b, x) {
        let t = (x - a) / (b - a);
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        return t * t * (3 - 2 * t);
    }
    // La ficha que toma el centro. Antes disparaba el contador de su cifra;
    // el contador se retiro el 29-sep-2026 (canon de abril: sin count-ups).
    function tomaElFoco(activo) {
        if (activo === ultimoActivo) return;
        ultimoActivo = activo;
    }
    function paint() {
        if (reduced.matches || forma() === 'deck') return;
        const activo = Math.round(focus);
        for (let i = 0; i < items.length; i++) {
            const d = Math.abs(focus - i);
            // El relevo tiene dos formas de salir mal y las dos se midieron:
            // con la ventana corta (0.18-0.52) las dos fichas caian a 0.01 en el
            // punto medio y la pantalla se apagaba un 13% del recorrido; con la
            // ventana larga (0.20-0.70) se cruzaban al 35% cada una y quedaba una
            // doble exposicion ilegible. 0.30-0.55 no hace ninguna de las dos:
            // brillo minimo 0.10, solape maximo 0.10, y la ficha activa sigue al
            // 90% durante casi todo su tramo.
            const a = 1 - smooth(0.30, 0.55, d);
            items[i].style.opacity = a.toFixed(3);
            items[i].style.transform = 'translateY(' + ((i - focus) * DESP).toFixed(1) + 'px)';
            items[i].style.pointerEvents = a > 0.5 ? 'auto' : 'none';
        }
        tomaElFoco(activo);
    }
    // El foco persigue al scroll por TIEMPO, no por frame: a cualquier fps
    // converge en el mismo tiempo de reloj.
    function tick(ts) {
        const dt = lastTs ? Math.min(64, ts - lastTs) : 16;
        lastTs = ts;
        const d = target - focus;
        if (Math.abs(d) < 0.002) { focus = target; chase = null; lastTs = 0; paint(); return; }
        focus += d * (1 - Math.exp(-dt / PERSIGUE));
        paint();
        chase = requestAnimationFrame(tick);
    }

    // DECK: el navegador ya anima el deslizamiento, asi que aqui no hay
    // seguidor ni opacidad que perseguir. Solo se mide que ficha quedo al
    // centro del carrusel, para arrancar su cifra. La distancia se calcula
    // contra los centros reales porque las fichas no miden todas lo mismo
    // (el callout es mas alto).
    function updateDeck() {
        ticking = false;
        // Se mide con rectangulos de viewport, NO con offsetTop: en el telefono
        // el carrusel es position static, asi que offsetTop de las fichas cuelga
        // de otro ancestro y las ultimas marcas nunca se encendian.
        const pr = pin.getBoundingClientRect();
        const centro = pr.top + pr.height / 2;
        let mejor = 0, dMin = Infinity;
        for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect();
            const d = Math.abs(r.top + r.height / 2 - centro);
            if (d < dMin) { dMin = d; mejor = i; }
        }
        tomaElFoco(mejor);
    }
    function update() {
        ticking = false;
        if (forma() === 'deck') { track.style.height = ''; updateDeck(); return; }
        if (reduced.matches) { track.style.height = ''; return; }
        sizeTrack();
        const runway = track.offsetHeight - pin.offsetHeight;
        if (runway <= 0) return;
        let p = -track.getBoundingClientRect().top / runway;
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        target = p * (items.length - 1);
        if (chase === null) chase = requestAnimationFrame(tick);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    function onDeckScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateDeck); } }

    function refrescarForma() {
        const f = forma();
        // pin-on es lo que apaga el respaldo "sin JS, todo visible". Solo debe
        // estar puesta cuando el JS de verdad va a escribir opacidades.
        if (f === 'pin' && !reduced.matches) track.classList.add('pin-on');
        else {
            track.classList.remove('pin-on');
            track.style.height = '';
            for (let i = 0; i < items.length; i++) {
                items[i].style.opacity = '';
                items[i].style.transform = '';
                items[i].style.pointerEvents = '';
            }
        }
    }

    refrescarForma();
    window.addEventListener('scroll', onScroll, { passive: true });
    pin.addEventListener('scroll', onDeckScroll, { passive: true });
    window.addEventListener('resize', function () {
        vhCache = window.innerHeight; refrescarForma(); sizeTrack(); update();
    });
    window.addEventListener('orientationchange', function () {
        vhCache = window.innerHeight; refrescarForma(); sizeTrack(); update();
    });
    window.addEventListener('load', update);
    if (reduced.addEventListener) reduced.addEventListener('change', function () {
        refrescarForma(); sizeTrack(); update();
    });
    sizeTrack();
    focus = 0; target = 0;
    paint();
    update();
})();
