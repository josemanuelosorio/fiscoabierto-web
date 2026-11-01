(function() {
    // DOS DRIVERS, UN SOLO DIBUJO.
    // En escritorio el scroll es continuo y funciona como perilla: el progreso
    // 0..1 sale de la posicion del scroll. En el telefono el scroll es inercia
    // (avientas y decelera), asi que una animacion atada al scroll se consume
    // entera durante el frenado y solo se ven el estado inicial y el final.
    // Ahi el progreso lo manda una linea de tiempo propia que arranca cuando
    // el diagrama entra en pantalla. paint() es el mismo en los dos casos.
    const chain = document.getElementById('trust-chain');
    if (!chain) return;
    const stage = document.querySelector('.trust-stage');
    const panel = document.querySelector('.trust-panel');
    const svg = chain.querySelector('.chain-threads');
    const node = chain.querySelector('.chain-node');
    const out = chain.querySelector('.chain-out');
    const L = Array.prototype.slice.call(chain.querySelectorAll('.chain-col-l .chain-src'));
    const R = Array.prototype.slice.call(chain.querySelectorAll('.chain-col-r .chain-src'));
    if (!stage || !panel || !svg || !node || !out || !L.length || !R.length) return;
    chain.classList.add('chain-on');

    // La forma vive en el CSS (--chain-form: fan | rail) y JS la lee. Asi el
    // breakpoint existe en UN lugar: mover el media query mueve la geometria.
    function form() {
        return (getComputedStyle(chain).getPropertyValue('--chain-form') || 'fan').trim();
    }

    // Orden de encendido. En abanico alterna izquierda/derecha hacia el centro;
    // en espina es el orden del DOM, que ya es el orden visual.
    let pills = [], k;
    for (k = 0; k < Math.max(L.length, R.length); k++) {
        if (L[k]) pills.push({ el: L[k], side: -1 });
        if (R[k]) pills.push({ el: R[k], side: 1 });
    }
    const flatOrder = L.concat(R).map(function(el) { return { el: el, side: -1 }; });

    // El alto de ventana se cachea. En el telefono, esconder la barra del
    // navegador cambia innerHeight en pleno scroll; si la pista se mide con
    // eso, el panel se re-encuadra a media animacion. Un cambio chico es la
    // barra; uno grande es una rotacion de verdad.
    let vhCache = window.innerHeight;
    function stableVH() {
        const v = window.innerHeight;
        if (Math.abs(v - vhCache) > 120) vhCache = v;
        return vhCache;
    }
    // Los puntos conservan el argumento de la seccion: que las fuentes son
    // SEIS, aunque en el carril solo se vea una y pico a la vez.
    let dotsEl = null;
    (function () {
        const band = chain.querySelector('.chain-band');
        if (!band) return;
        dotsEl = document.createElement('div');
        dotsEl.className = 'chain-dots';
        dotsEl.setAttribute('aria-hidden', 'true');
        for (let q = 0; q < L.length + R.length; q++) dotsEl.appendChild(document.createElement('span'));
        band.parentNode.insertBefore(dotsEl, band.nextSibling);
        if (dotsEl.firstChild) dotsEl.firstChild.className = 'on';
        band.addEventListener('scroll', function () {
            const w = band.scrollWidth - band.clientWidth;
            const idx = w > 4 ? Math.round((band.scrollLeft / w) * (dotsEl.children.length - 1)) : 0;
            for (let z = 0; z < dotsEl.children.length; z++) {
                dotsEl.children[z].className = (z === idx) ? 'on' : '';
            }
        }, { passive: true });
    })();

    const NS = 'http://www.w3.org/2000/svg';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let threads = [], dots = [], stem = null;
    // El tronco se dibuja por TRAMOS, uno entre cada dos uniones, cada uno mas
    // grueso que el anterior: el grosor ES la cuenta de ramas recogidas.
    let segs = [];          // { path, a, b }  a,b = tramo del progreso
    let deckPill = [];      // span de entrada de cada tarjeta del carril
    let ready = false, ticking = false, progress = 0, mobile = false;
    let lastW = -1, lastH = -1, lastForm = '';
    let seq = pills;

    // Tramos del recorrido, uno por forma.
    const SPANS = {
        fan: {
            pill:   function(i) { return [0.02 + i * 0.042, 0.12 + i * 0.042]; },
            thread: function(i) { return [0.07 + i * 0.042, 0.23 + i * 0.042]; },
            spine: null, node: [0.24, 0.37], dot: [0.40, 0.48],
            stem: [0.47, 0.58], out: [0.56, 0.74]
        },
        deck: {
            // en el carril no hay un hilo por fuente: las tarjetas se deslizan
            // en horizontal y la convergencia queda en UNA linea al nodo
            pill:   function(i) { return deckPill[i]; },
            thread: function() { return null; },
            spine: null, node: [0.52, 0.65], dot: [0.60, 0.68],
            stem: [0.66, 0.78], out: [0.74, 0.92]
        }
    };
    function S() { return mobile ? SPANS.deck : SPANS.fan; }

    function ease(t) { return t * t * (3 - 2 * t); }
    function span(p, s) {
        if (!s) return 0;
        const t = (p - s[0]) / (s[1] - s[0]);
        return t <= 0 ? 0 : (t >= 1 ? 1 : ease(t));
    }
    function mk(name, attrs) {
        const n = document.createElementNS(NS, name);
        for (const a in attrs) n.setAttribute(a, attrs[a]);
        return n;
    }
    function line(d) {
        const p = mk('path', { d: d, pathLength: '1' });
        p.style.strokeDasharray = '1';
        p.style.strokeDashoffset = '1';
        svg.appendChild(p);
        return p;
    }
    function n1(v) { return v.toFixed(1); }

    // Solo el escritorio usa pista (la da el CSS). En telefono el panel ya no
    // se pega arriba: con el traductor mide mas que la pantalla, y un panel
    // pegado mas alto que la ventana esconde su parte de abajo justo mientras
    // se dibuja. Ahi el dibujo corre por tiempo (arrancarMovil).
    function sizeStage() {
        if (stage.style.height) stage.style.height = '';
    }

    function layout(force) {
        const box = chain.getBoundingClientRect();
        const W = box.width, H = box.height, f = form();
        if (!W || !H) { ready = false; return; }
        if (!force && Math.round(W) === lastW && Math.round(H) === lastH && f === lastForm) return;
        lastW = Math.round(W); lastH = Math.round(H); lastForm = f;
        mobile = (f !== 'fan');
        seq = mobile ? flatOrder : pills;
        // El panel puede venir escalado por el grow. El viewBox se toma del
        // MISMO rect escalado que las coordenadas, asi la escala se cancela.
        svg.setAttribute('viewBox', '0 0 ' + n1(W) + ' ' + n1(H));
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        threads = []; dots = []; stem = null; segs = []; deckPill = [];

        const nb = node.getBoundingClientRect();
        const nTop = nb.top - box.top, nBot = nb.bottom - box.top;
        const nCx = nb.left - box.left + nb.width / 2;
        const nCy = nTop + nb.height / 2;
        const nL = nb.left - box.left, nR = nb.right - box.left;
        const ob = out.getBoundingClientRect();

        if (mobile) {
            // CARRIL: una sola linea baja del carril al nodo. La convergencia
            // se dice una vez, no seis, porque las fuentes ya no estan
            // apiladas: se deslizan y solo se ve una y pico a la vez.
            const band = chain.querySelector('.chain-band');
            const byEl = dotsEl || band;
            const by = byEl.getBoundingClientRect().bottom - box.top + 14;
            const seg = line('M ' + n1(nCx) + ' ' + n1(by) + ' L ' + n1(nCx) + ' ' + n1(nTop - 8));
            seg.style.strokeWidth = '1.6';
            segs.push({ path: seg, a: 0.42, b: 0.56 });
            const d0 = mk('circle', { cx: n1(nCx), cy: n1(nTop - 8), r: '0' });
            svg.appendChild(d0); dots.push(d0);
            stem = line('M ' + n1(nCx) + ' ' + n1(nBot + 8) +
                        ' L ' + n1(nCx) + ' ' + n1(ob.top - box.top - 8));
            for (let i2 = 0; i2 < seq.length; i2++) {
                deckPill.push([0.05 + i2 * 0.025, 0.20 + i2 * 0.025]);
            }
        } else {
            // ABANICO: dos columnas alineadas por su borde INTERIOR, asi cada
            // hilo sale hacia el centro y nunca vuelve sobre una pill.
            let colBottom = 0;
            seq.forEach(function(o) {
                colBottom = Math.max(colBottom, o.el.getBoundingClientRect().bottom - box.top);
            });
            const below = nTop > colBottom - 2;
            seq.forEach(function(o) {
                const r = o.el.getBoundingClientRect();
                const y = r.top - box.top + r.height / 2;
                const x = o.side < 0 ? (r.right - box.left + 7) : (r.left - box.left - 7);
                let x1, y1, d;
                if (below) {
                    x1 = nCx; y1 = nTop - 7;
                    d = 'M ' + n1(x) + ' ' + n1(y) +
                        ' C ' + n1(x + (x1 - x) * 0.62) + ' ' + n1(y) +
                        ', ' + n1(x1) + ' ' + n1(y + (y1 - y) * 0.45) +
                        ', ' + n1(x1) + ' ' + n1(y1);
                } else {
                    x1 = o.side < 0 ? nL - 7 : nR + 7;
                    y1 = nCy;
                    const mx = (x + x1) / 2;
                    d = 'M ' + n1(x) + ' ' + n1(y) +
                        ' C ' + n1(mx) + ' ' + n1(y) + ', ' + n1(mx) + ' ' + n1(y1) +
                        ', ' + n1(x1) + ' ' + n1(y1);
                }
                threads.push(line(d));
            });
            (below ? [[nCx, nTop - 7]] : [[nL - 7, nCy], [nR + 7, nCy]]).forEach(function(pt) {
                const c = mk('circle', { cx: n1(pt[0]), cy: n1(pt[1]), r: '0' });
                svg.appendChild(c); dots.push(c);
            });
            stem = line('M ' + n1(nCx) + ' ' + n1(nBot + 7) +
                        ' L ' + n1(nCx) + ' ' + n1(ob.top - box.top - 7));
        }

        ready = true;
        sizeStage();
        paint();
        if (typeof paintHi === 'function') paintHi();
    }

    function draw(path, t) {
        if (!path) return;
        path.style.strokeDashoffset = (1 - t).toFixed(4);
        path.style.opacity = t > 0 ? '1' : '0';
    }

    function paint() {
        if (!ready) return;
        let i, t, sp = S();
        if (reduced.matches) {
            seq.forEach(function(o) { o.el.style.opacity = '1'; o.el.style.transform = 'none'; });
            node.style.opacity = '1'; node.style.transform = 'none';
            out.style.opacity = '1'; out.style.transform = 'none';
            threads.concat([stem]).forEach(function(p) { draw(p, 1); });
            segs.forEach(function(g) { draw(g.path, 1); });
            dots.forEach(function(d) { d.setAttribute('r', '3'); });
            return;
        }
        const p = progress;
        for (i = 0; i < segs.length; i++) draw(segs[i].path, span(p, [segs[i].a, segs[i].b]));
        for (i = 0; i < seq.length; i++) {
            t = span(p, sp.pill(i));
            seq[i].el.style.opacity = t.toFixed(3);
            const dx = mobile ? 0 : (seq[i].side * (1 - t) * 14);
            seq[i].el.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + ((1 - t) * (mobile ? 12 : 8)).toFixed(1) + 'px)';
        }
        for (i = 0; i < threads.length; i++) draw(threads[i], span(p, sp.thread(i)));
        t = span(p, sp.node);
        node.style.opacity = t.toFixed(3);
        node.style.transform = 'scale(' + (0.94 + t * 0.06).toFixed(4) + ')';
        t = span(p, sp.dot);
        for (i = 0; i < dots.length; i++) dots[i].setAttribute('r', (3 * t).toFixed(2));
        draw(stem, span(p, sp.stem));
        t = span(p, sp.out);
        out.style.opacity = t.toFixed(3);
        out.style.transform = 'translateY(' + ((1 - t) * 18).toFixed(1) + 'px)';
    }

    // --- QUIEN MANDA EL DIBUJO ---
    // En escritorio, el scroll: es continuo y funciona como perilla.
    // En telefono, el reloj: el scroll es inercia (avientas y decelera) y una
    // animacion atada a el se consume entera en el frenado. El dibujo arranca
    // cuando el diagrama entra en pantalla y dura DUR ms, a ritmo fijo.
    let reloj = null, DUR = 2600;
    function arrancarMovil() {
        if (reloj !== null) return;
        const r = chain.getBoundingClientRect();
        if (r.top > stableVH() * 0.75 || r.bottom < 0) return;
        let t0 = null;
        function avanza(ts) {
            if (t0 === null) t0 = ts;
            progress = Math.min(1, (ts - t0) / DUR);
            paint();
            reloj = progress < 1 ? requestAnimationFrame(avanza) : 'fin';
        }
        reloj = requestAnimationFrame(avanza);
    }
    function update() {
        ticking = false;
        if (!ready) layout(true);
        if (reduced.matches) { progress = 1; paint(); return; }
        sizeStage();
        if (mobile) { arrancarMovil(); return; }
        const runway = stage.offsetHeight - panel.offsetHeight;
        if (runway <= 0) { progress = 1; paint(); return; }
        // p = 0 justo cuando el panel se pega arriba (el grow ya termino);
        // p = 1 cuando el panel llega al fondo de su pista.
        const d = (stableVH() * 0.04 - stage.getBoundingClientRect().top) / runway;
        progress = d < 0 ? 0 : (d > 1 ? 1 : d);
        paint();
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    function relayout() { layout(true); update(); }

    // Al pasar, tocar o enfocar una fuente se enciende SU hilo: el diagrama
    // dice de donde viene cada cosa antes de que le des clic. Las fuentes del
    // tema elegido en el traductor quedan encendidas.
    var hi = -1, selEls = [];
    function paintHi() {
        for (let i = 0; i < threads.length; i++) {
            const on = (i === hi) || selEls.indexOf(seq[i].el) >= 0;
            threads[i].style.stroke = on ? '#5EEAD4' : '';
            threads[i].style.strokeWidth = on ? '1.8' : '';
        }
    }

    // EL TRADUCTOR. Contrato: entra el tema elegido; salen la cita literal,
    // la cifra, lo que significa, el articulo con su enlace, el tramite con
    // su enlace (leido de la rama de tramites, que es la unica fuente de las
    // URLs) y las fuentes y el tramite encendidos. Las citas son texto
    // literal de la ley consultado el 29-sep-2026 (mley.mx); no se traducen.
    const TR = [
        { src: [0, 1], tram: '06', fig: '2.5%', cite: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
          lit: 'La retención se deberá efectuar sobre el total de los ingresos que efectivamente perciban las personas físicas por conducto de los citados medios […], sin incluir el impuesto al valor agregado. Esta retención tendrá el carácter de pago provisional.' },
        { src: [1], tram: '01', fig: '20%', cite: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
          lit: 'En el caso de que los contribuyentes no proporcionen su clave del Registro Federal de Contribuyentes […], se deberá retener el impuesto que corresponda por los ingresos a que se refiere el artículo 113-A de esta Ley, aplicando la tasa del 20% sobre los ingresos referidos.' },
        { src: [2], tram: '06', fig: '50%', cite: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf',
          lit: 'Retener a las personas físicas que enajenen bienes, presten servicios o concedan el uso o goce temporal de bienes, el 50% del impuesto al valor agregado cobrado.' },
        { src: [1], tram: '05', fig: '$300,000', cite: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
          lit: 'Cuando únicamente obtengan ingresos a los que se refiere el primer párrafo del artículo 113-A de esta Ley, que en el ejercicio inmediato anterior no hayan excedido de la cantidad de trescientos mil pesos.' },
        { src: [3], tram: '03', fig: null, cite: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf',
          lit: '[…] deberán permitir a las autoridades fiscales, en forma permanente, el acceso en línea y en tiempo real únicamente a la información que permita comprobar el debido cumplimiento de las obligaciones fiscales […]' }
    ];
    const trTabs = Array.prototype.slice.call(chain.querySelectorAll('.tr-tab'));
    let srcAll = L.concat(R), trSel = 0;
    const trLit = document.getElementById('trLit'), trFig = document.getElementById('trFig');
    const trWhat = document.getElementById('trWhat'), trCite = document.getElementById('trCite'), trGo = document.getElementById('trGo');
    function pintarTraductor(desdeClic) {
        if (!trTabs.length || typeof t !== 'function') return;
        const d = TR[trSel];
        trTabs.forEach(function (b, j) { b.setAttribute('aria-pressed', j === trSel ? 'true' : 'false'); });
        trLit.textContent = d.lit;
        trFig.textContent = d.fig || t('tr.f5');
        trWhat.textContent = t('tr.w' + (trSel + 1));
        trCite.textContent = t('tr.c' + (trSel + 1));
        trCite.href = d.cite;
        const item = document.getElementById('tram-' + d.tram);
        const a = item && item.querySelector('a');
        trGo.textContent = d.tram + ' \u00B7 ' + t('tram.t' + (+d.tram));
        if (a) trGo.href = a.href;
        selEls = d.src.map(function (k) { return srcAll[k]; });
        srcAll.forEach(function (el) { el.classList.toggle('is-sel', selEls.indexOf(el) >= 0); });
        document.querySelectorAll('.tram-item').forEach(function (li) { li.classList.toggle('is-sel', li.id === 'tram-' + d.tram); });
        paintHi();
        // En el carril del telefono, la fuente elegida se trae a la vista.
        const band = chain.querySelector('.chain-band');
        if (desdeClic && mobile && band && selEls[0]) {
            band.scrollTo({ left: selEls[0].offsetLeft - 18, behavior: reduced.matches ? 'auto' : 'smooth' });
        }
    }
    trTabs.forEach(function (b, j) {
        b.addEventListener('click', function () { trSel = j; pintarTraductor(true); });
    });
    pintarTraductor(false);
    L.concat(R).forEach(function(el) {
        function on() {
            for (let i = 0; i < seq.length; i++) { if (seq[i].el === el) { hi = i; break; } }
            paintHi();
        }
        function off() { hi = -1; paintHi(); }
        el.addEventListener('mouseenter', on);
        el.addEventListener('mouseleave', off);
        el.addEventListener('focus', on);
        el.addEventListener('blur', off);
        el.addEventListener('touchstart', on, { passive: true });
        el.addEventListener('touchend', off, { passive: true });
        el.addEventListener('touchcancel', off, { passive: true });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    window.addEventListener('load', relayout);
    if (window.ResizeObserver) new ResizeObserver(function() { layout(false); update(); }).observe(chain);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    if (reduced.addEventListener) reduced.addEventListener('change', relayout);
    // Al cambiar de idioma las pills cambian de ancho: se retrazan los hilos.
    document.addEventListener('idioma', function () { pintarTraductor(false); });
    document.addEventListener('click', function(e) {
        let el = e.target;
        while (el && el.classList) {
            if (el.classList.contains('lang-btn')) { setTimeout(relayout, 60); return; }
            el = el.parentNode;
        }
    }, true);
    relayout();
})();
