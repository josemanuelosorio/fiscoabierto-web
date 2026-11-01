// ==================== IDIOMA (i18n) ====================
let currentLanguage = 'es';

function t(key) {
    return translations[currentLanguage]?.[key] || translations.es[key] || key;
}

function fechaCorta(iso) {
    const MESES = { es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
                  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
    const p = iso.split('-');
    return p[2] + '-' + MESES[currentLanguage][+p[1] - 1] + '-' + p[0];
}

function setLanguage(lang) {
    if (lang !== 'es' && lang !== 'en') return;
    currentLanguage = lang;
    document.documentElement.lang = lang;
    document.title = t('meta.title');

    // Atributos (aria-label de grupos): el texto no es un nodo, asi que el
    // barrido de data-i18n de abajo no lo alcanza.
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });

    // Fecha de verificacion por bloque. Entra la fecha ISO de data-verificado;
    // sale la linea en el idioma activo, con el mismo formato de fecha que
    // usan las citas del sitio (07-nov-2025).
    document.querySelectorAll('[data-verificado]').forEach(el => {
        el.innerHTML = t('verif.line').replace('{fecha}', '<span class="verif-date">' + fechaCorta(el.dataset.verificado) + '</span>');
    });

    // Cada elemento con data-i18n recibe su texto. Los contenedores cuyos
    // hijos tienen su propia clave (un h1 con spans) se saltan: los pintan sus hijos.
    // Solo los callouts de la banda y el CTA de resultados traen marcado en el
    // diccionario; todo lo demas entra como texto.
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (el.querySelector('[data-i18n]')) return;
        if (key.startsWith('stats.callout') || key.startsWith('results.cta')) el.innerHTML = t(key);
        else el.textContent = t(key);
    });

    // Los enlaces a otras páginas del sitio (Aprende) llevan el idioma activo:
    // la otra página lo resuelve primero por ?lang=, así el cambio no lo pierde.
    document.querySelectorAll('a[data-con-idioma]').forEach(function (a) {
        a.setAttribute('href', a.dataset.conIdioma + '?lang=' + lang);
    });

    // Lo que arma el JS (calculadora, mapa, diagnostico, videos...) no lo
    // alcanza el barrido de data-i18n: cada seccion escucha este evento y se
    // vuelve a pintar. Un solo aviso en lugar de un listener por boton en
    // cada archivo, igual que en aprende/index.html.
    document.dispatchEvent(new CustomEvent('idioma'));
}

// Resalta el idioma activo en el switch del nav
function updateLangToggle() {
    document.querySelectorAll('.lang-switch .lang-btn').forEach(function(btn) {
        const isActive = btn.dataset.lang === currentLanguage;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

// Cada boton fija su idioma. No alterna: el usuario ve cual esta activo y elige.
document.querySelectorAll('.lang-switch .lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        setLanguage(btn.dataset.lang);
        updateLangToggle();
    });
});

// El idioma inicial se resuelve en un solo lugar, para que el switch nunca
// muestre un idioma distinto al que esta renderizado.
// Precedencia: ?lang= (intencion explicita) > idioma del navegador > espanol.
(function resolveInitialLanguage() {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested === 'es' || requested === 'en') {
        setLanguage(requested);
    } else {
        const browserLang = navigator.language || navigator.userLanguage || 'es';
        setLanguage(browserLang.toLowerCase().indexOf('en') === 0 ? 'en' : 'es');
    }
    updateLangToggle();
})();
