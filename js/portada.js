// ==================== PORTADA: LA SERIE ====================
// Contrato:
//   entra:   #serie, que el HTML ya trae pintada con su primera escena completa
//            (así se ve sin JS); calculoRetencion (js/retencion.js); t(),
//            currentLanguage y el evento 'idioma' (js/idioma.js).
//   sale:    la serie en bucle a la derecha de la portada. Tres clases de
//            escena: la cuenta (lo que paga el cliente, lo que retiene la
//            plataforma y lo que deposita), un artículo de la ley que se
//            subraya y se traduce a pesos, y el día 17 de la declaración
//            mensual. En un iPhone de pantalla angosta (o con ?demo=video) el
//            mismo ciclo ya renderizado (portada/serie-es.mp4 y serie-en.mp4,
//            hechos por tools/render-portada.js) se monta encima, mudo, en
//            bucle y sin controles. ?demo=js lo apaga.
//   no hace: no calcula tasas ni importes: los pide a calculoRetencion, para
//            que la portada y la calculadora digan siempre lo mismo. Se
//            detiene fuera de pantalla y con la pestaña oculta. Si el video
//            no arranca o se detiene, se quita y corre la serie en vivo.
// El método del video es el de la portada de Anonmydoc (1 oct 2026): en el
// iPhone una animación larga hecha con temporizadores se quedaba quieta a media
// escena, y un video mudo con playsinline no.
(function () {
    'use strict';
    const serie = document.getElementById('serie');
    if (!serie || typeof calculoRetencion === 'undefined') return;

    // El texto de la ley es literal y va en español en los dos idiomas: es la
    // fuente. Entre corchetes, lo que se subraya.
    const LEY = {
        transporte: ['Tratándose de prestación de servicios de ', ['transporte terrestre de pasajeros y de entrega de bienes'], ' la retención se hará por el ', ['2.1%'], '.'],
        venta: [['en sustitución de la tasa de retención'], ' a que se refiere el artículo 113-A, párrafo tercero, fracción III, de la Ley del Impuesto sobre la Renta, aplicarán la tasa del ', ['2.5 por ciento'], '.'],
        hospedaje: ['Tratándose de prestación de ', ['servicios de hospedaje'], ' la retención se hará por el ', ['4%'], '.']
    };
    // El orden de la serie: cada cuenta va seguida del artículo de otra actividad,
    // para que en una vuelta se vean las tres tasas y el caso sin RFC.
    const ESCENAS = [
        ['cuenta', { act: 'venta', rfc: true, clave: 'venta' }],
        ['ley', 'transporte'],
        ['dia'],
        ['cuenta', { act: 'venta', rfc: false, clave: 'sinRfc' }],
        ['ley', 'venta'],
        ['cuenta', { act: 'hospedaje', rfc: true, clave: 'hospedaje' }],
        ['ley', 'hospedaje']
    ];
    const BASE = 1000; // el ejemplo de toda la serie: una operación de $1,000 sin IVA

    const pesos = function (n) { return '$' + Math.round(n).toLocaleString('es-MX'); };
    const tasa = function (x) { return (Math.round(x * 1000) / 10).toLocaleString('es-MX') + '%'; };
    function el(etiqueta, clase, texto) {
        const n = document.createElement(etiqueta);
        if (clase) n.className = clase;
        if (texto != null) n.textContent = texto;
        return n;
    }

    // ------------------------------------------------ el reloj de la serie
    // Cada arranque lleva un número. Una espera de un arranque viejo no vuelve:
    // así detener, cambiar de idioma o salir de pantalla no dejan pasos sueltos.
    let arranque = 0;
    let actual = 0;          // la escena que se está viendo
    let corriendo = false;
    let ultimoPaso = Date.now();
    function espera(ms, a) {
        return new Promise(function (ok, no) {
            setTimeout(function () {
                if (a !== arranque) return no('otro');
                ultimoPaso = Date.now();
                ok();
            }, ms);
        });
    }

    // ------------------------------------------------ las escenas
    // Cada una pinta su estado inicial y devuelve los pasos que la completan.
    function pintarCuenta(c) {
        const r = calculoRetencion.recibo(c.act, BASE, c.rfc);
        const caja = el('div', 'serie-cuenta');
        const col = el('div', 'serie-col');
        const filas = [
            [pesos(r.cobra), t('serie.cobra'), ''],
            ['− ' + pesos(r.isr), t('serie.isr').replace('{tasa}', tasa(r.tasa)), ''],
            ['− ' + pesos(r.ivaR), t(c.rfc ? 'serie.ivaMitad' : 'serie.ivaTodo'), ''],
            [pesos(r.dep), t('serie.dep'), ' total']
        ];
        const piezas = [];
        filas.forEach(function (f, i) {
            if (i === 3) piezas.push([col.appendChild(el('div', 'raya'))]);
            piezas.push([col.appendChild(el('div', 'n' + f[2], f[0])), col.appendChild(el('div', 't', f[1]))]);
        });
        caja.append(el('p', 'serie-caso', t('serie.caso.' + c.clave)), col, el('p', 'serie-cita', t('serie.cita.' + c.clave)));
        serie.replaceChildren(caja);
        return async function (a) {
            await espera(700, a);
            for (const grupo of piezas) {
                grupo.forEach(function (p) { p.classList.add('on'); });
                await espera(grupo.length === 1 ? 750 : 1200, a);
            }
            await espera(3400, a);
        };
    }

    function pintarLey(clave) {
        const caja = el('div', 'serie-ley');
        const texto = el('p', 'serie-ley-texto');
        texto.lang = 'es';
        const marcas = [];
        LEY[clave].forEach(function (x) {
            if (typeof x === 'string') texto.appendChild(document.createTextNode(x));
            else marcas.push(texto.appendChild(el('mark', '', x[0])));
        });
        const act = clave; // las claves de LEY son las actividades de calculoRetencion
        const isr = calculoRetencion.recibo(act, BASE, true).isr;
        caja.append(el('p', 'serie-cita', t('serie.ley.cita.' + clave)), texto, el('p', 'serie-ley-claro', t('serie.ley.claro.' + clave).replace('{isr}', pesos(isr))));
        serie.replaceChildren(caja);
        return async function (a) {
            await espera(2200, a);
            for (const m of marcas) { m.classList.add('on'); await espera(950, a); }
            await espera(600, a);
            caja.classList.add('traducida');
            await espera(4300, a);
        };
    }

    // El día 17 vale para cualquier mes: la cuadrícula no lleva nombre de mes ni
    // días de la semana, para que la escena no caduque ni en vivo ni en video.
    function pintarDia() {
        const caja = el('div', 'serie-dia');
        const cal = el('div', 'serie-cal');
        let dia17 = null;
        for (let d = 1; d <= 31; d++) {
            const n = cal.appendChild(el('span', 'n', String(d)));
            if (d === 17) dia17 = n;
        }
        const nota = el('p', 'serie-dia-nota', t('serie.dia.n'));
        const cita = el('p', 'serie-cita', t('serie.dia.c'));
        caja.append(el('p', 'serie-caso', t('serie.dia.t')), cal, nota, cita);
        serie.replaceChildren(caja);
        return async function (a) {
            await espera(1600, a);
            dia17.classList.add('on');
            await espera(1100, a);
            nota.classList.add('on'); cita.classList.add('on');
            await espera(4200, a);
        };
    }

    const PINTAR = { cuenta: pintarCuenta, ley: pintarLey, dia: pintarDia };

    // ------------------------------------------------ el ciclo
    async function correr(a) {
        try {
            for (;;) {
                const e = ESCENAS[actual];
                const pasos = PINTAR[e[0]](e[1]);
                serie.classList.remove('sale');
                await pasos(a);
                serie.classList.add('sale');
                await espera(420, a);
                actual = (actual + 1) % ESCENAS.length;
            }
        } catch (err) { if (err !== 'otro') throw err; }
    }

    let enVista = !('IntersectionObserver' in window);
    let videoActivo = false;     // el video se está mostrando: la serie en vivo no corre
    let esperandoVideo = false;  // la serie en vivo espera un momento a que el video arranque

    function iniciar() {
        if (corriendo || document.hidden || !enVista || videoActivo || esperandoVideo) return;
        corriendo = true;
        ultimoPaso = Date.now();
        correr(++arranque);
    }
    function detener() {
        corriendo = false;
        arranque++;
        serie.classList.remove('sale');
    }

    // ------------------------------------------------ video (iPhone)
    const ESPERA_VIDEO = 1200; // ms que la serie en vivo espera al video antes de arrancar por su cuenta
    const modo = new URLSearchParams(location.search).get('demo');
    const enIPhone = /iP(?:hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const usarVideo = modo === 'video' || (modo !== 'js' && enIPhone && window.matchMedia('(max-width: 560px)').matches);
    let video = null;

    function abandonarVideo() {
        if (!video) return;
        video.remove();
        video = null;
        videoActivo = false;
        esperandoVideo = false;
        iniciar();
    }
    function fuenteVideo() { return 'portada/serie-' + (currentLanguage === 'en' ? 'en' : 'es') + '.mp4'; }
    // Pide reproducir. Cada pedido lleva su número: si el navegador rechaza uno
    // que ya fue relevado por otro (pasa al cambiarle la fuente al video cuando
    // todavía no arrancaba), ese rechazo no cuenta y el video se conserva.
    let pedido = 0;
    function reproducir() {
        const mio = ++pedido;
        const p = video.play();
        if (p && p.catch) p.catch(function () { if (mio === pedido) abandonarVideo(); });
    }

    function montarVideo() {
        esperandoVideo = true;
        setTimeout(function () { esperandoVideo = false; iniciar(); }, ESPERA_VIDEO);
        const v = document.createElement('video');
        v.className = 'serie-video';
        v.muted = true;
        v.defaultMuted = true;
        v.loop = true;
        v.autoplay = true;
        v.playsInline = true;
        v.controls = false;
        v.preload = 'auto';
        v.disablePictureInPicture = true;
        [['muted', ''], ['playsinline', ''], ['webkit-playsinline', ''], ['disableremoteplayback', ''], ['aria-hidden', 'true'], ['tabindex', '-1']]
            .forEach(function (p) { v.setAttribute(p[0], p[1]); });
        v.addEventListener('playing', function () {
            videoActivo = true;
            esperandoVideo = false;
            detener();
            v.classList.add('listo');
        });
        v.addEventListener('error', abandonarVideo);
        v.src = fuenteVideo();
        serie.parentNode.appendChild(v);
        video = v;
        reproducir();
    }
    if (usarVideo) montarVideo();

    // Vigilante: una vez por segundo, con la serie a la vista, revisa que lo que
    // debe correr corra. No depende de las señales de pantalla ni de visibilidad.
    let tVideo = -1;
    let quieto = 0;
    function aLaVista() {
        const r = serie.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
    }
    setInterval(function () {
        if (document.hidden || !aLaVista()) { quieto = 0; return; }
        if (videoActivo) {
            if (video.paused) reproducir();
            quieto = Math.abs(video.currentTime - tVideo) < 0.05 ? quieto + 1 : 0;
            tVideo = video.currentTime;
            if (quieto >= 4) abandonarVideo(); // 4 s sin avanzar un fotograma: ya no es confiable
            return;
        }
        if (esperandoVideo) return;
        if (!corriendo) { enVista = true; iniciar(); }
        else if (Date.now() - ultimoPaso > 9000) { detener(); iniciar(); }
    }, 1000);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
            enVista = e[0].isIntersecting;
            if (enVista) iniciar(); else detener();
        }, { threshold: 0.25 }).observe(serie);
    } else {
        iniciar();
    }
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return detener();
        if (videoActivo) reproducir();
        iniciar();
    });
    // Al cambiar de idioma el video cambia al suyo y, si la serie en vivo está
    // corriendo (no hay video, o todavía no arranca), la escena en curso se
    // vuelve a pintar en el idioma nuevo.
    document.addEventListener('idioma', function () {
        if (video) { video.src = fuenteVideo(); reproducir(); }
        if (corriendo) { detener(); iniciar(); }
    });

    // Para tools/render-portada.js: en qué escena va la serie y si está cambiando.
    window.faSerie = { estado: function () { return { escena: actual, sale: serie.classList.contains('sale'), total: ESCENAS.length }; } };
})();
