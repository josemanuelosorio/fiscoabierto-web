// ==================== ESTADO ====================
const state = {
    platforms: new Set(),
    income: null,
    fiscal: null,
    factura: null
};

// ==================== SELECCIÓN PLATAFORMAS ====================
document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const p = btn.dataset.platform;
        if (state.platforms.has(p)) {
            state.platforms.delete(p);
            btn.classList.remove('selected');
        } else {
            state.platforms.add(p);
            btn.classList.add('selected');
        }
        document.getElementById('btn-step1').disabled = state.platforms.size === 0;
        // Contador visual: solo numeral + check, funciona en ES y EN
        const chip = document.getElementById('selCount');
        chip.hidden = state.platforms.size === 0;
        chip.textContent = state.platforms.size + ' \u2713';
    });
});

// ==================== SELECCIÓN INGRESOS ====================
document.querySelectorAll('.income-btn[data-income]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.income-btn[data-income]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.income = btn.dataset.income;
        document.getElementById('btn-step2').disabled = false;
    });
});

// ==================== SELECCIÓN FISCAL ====================
document.querySelectorAll('.income-btn[data-fiscal]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.income-btn[data-fiscal]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.fiscal = btn.dataset.fiscal;
        checkStep3Complete();
        // Revelado progresivo: la segunda pregunta aparece al responder la primera
        const qf = document.getElementById('qFactura');
        if (qf.classList.contains('q-hidden')) {
            qf.style.height = '0px';
            qf.classList.remove('q-hidden');
            qf.style.height = qf.scrollHeight + 'px';
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) qf.style.height = 'auto';
            else qf.addEventListener('transitionend', function fin(e) {
                if (e.propertyName !== 'height') return;
                qf.style.height = 'auto';
                qf.removeEventListener('transitionend', fin);
            });
            setTimeout(() => qf.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
        }
    });
});

// ==================== SELECCIÓN FACTURACIÓN ====================
document.querySelectorAll('.income-btn[data-factura]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.income-btn[data-factura]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.factura = btn.dataset.factura;
        checkStep3Complete();
    });
});

function checkStep3Complete() {
    document.getElementById('btn-results').disabled = !(state.fiscal && state.factura);
}

// ==================== NAVEGACIÓN ====================
document.getElementById('btn-step1').addEventListener('click', () => goStep(2));
document.getElementById('btn-step2').addEventListener('click', () => goStep(3));
document.getElementById('btn-results').addEventListener('click', showResults);

let currentStep = 1;
function goStep(n) {
    const wizard = document.getElementById('diag-wizard');
    wizard.dataset.dir = n < currentStep ? 'back' : 'fwd';
    currentStep = n;
    document.querySelectorAll('.diag-step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.diag-step[data-step="${n}"]`).classList.add('active');
    document.getElementById('results').classList.remove('active');
    // Progreso segmentado: se llenan los tramos ya completados o en curso
    document.querySelectorAll('.diag-seg').forEach(seg => {
        seg.classList.toggle('done', Number(seg.dataset.seg) <= n);
    });
}

function restartDiag() {
    state.platforms.clear();
    state.income = null;
    state.fiscal = null;
    state.factura = null;
    document.querySelectorAll('.platform-btn, .income-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('btn-step1').disabled = true;
    document.getElementById('btn-step2').disabled = true;
    document.getElementById('btn-results').disabled = true;
    document.getElementById('results').classList.remove('active');
    document.getElementById('diag-wizard').style.display = 'block';
    const progressBar = document.querySelector('.diag-progress');
    if (progressBar) progressBar.style.display = 'flex';
    const chip = document.getElementById('selCount');
    chip.hidden = true;
    const qf = document.getElementById('qFactura');
    qf.classList.add('q-hidden');
    qf.style.height = '';
    currentStep = 1;
    goStep(1);
    // El reanclado corre un frame despues: el layout ya colapso el panel de
    // resultados y el scroll queda medido contra la geometria final.
    requestAnimationFrame(() => {
        const sec = document.getElementById('diagnostico');
        sec.scrollTop = 0; // por si un navegador viejo (sin overflow:clip) guardo offset interno
        window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 70, behavior: 'auto' });
    });
}

// ==================== RESULTADOS DEL DIAGNÓSTICO ====================
// Contrato: lee las respuestas de state, las evalua con js/evaluacion.js y
// pinta el panel en el idioma actual. Los textos son claves diag.* y pasos.*
// del diccionario; aqui solo se traducen y se arma el DOM.

// Respuestas en la forma que pide evaluarDiagnostico. La categoria de cada
// plataforma vive en su boton (data-category).
function respuestas() {
    const plataformas = Array.from(state.platforms);
    return {
        categorias: plataformas.map(p => {
            const btn = document.querySelector(`[data-platform="${p}"]`);
            return btn ? btn.dataset.category : 'otro';
        }),
        nPlataformas: plataformas.length,
        ingreso: state.income,
        fiscal: state.fiscal,
        factura: state.factura
    };
}

// Sustituye {marcas} en una plantilla del diccionario. Con funcion y no con
// cadena: un monto como $10,000 no debe leerse como patron de reemplazo.
function rellena(plantilla, valores) {
    return plantilla.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m));
}

function renderResults() {
    // Todo el contenido dinamico del panel, en el idioma actual. Idempotente:
    // se llama al terminar el examen y al cambiar de idioma con el panel abierto.
    renderProfileSummary();

    const ev = evaluarDiagnostico(respuestas());
    const banner = document.getElementById('risk-banner');
    const riskLevel = document.getElementById('risk-level');

    banner.className = 'risk-banner risk-' + ev.nivel;
    riskLevel.textContent = t('diag.nivel.' + ev.nivel);

    // Medidor: bajo 33%, medio 66%, alto 100%. El width se asigna tras el
    // primer frame para que la transicion corra al entrar el panel.
    const meterFill = document.getElementById('risk-meter-fill');
    meterFill.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        meterFill.style.width = { bajo: '33%', medio: '66%', alto: '100%' }[ev.nivel];
    }));

    renderList('sat-visibility-list', ev.visibilidad.map(t));
    document.getElementById('sat-visibility').hidden = ev.visibilidad.length === 0;
    renderList('obligations-list', ev.obligaciones.map(t));
    renderPasos(ev);
}

// Los pasos son enlaces: se arman con nodos y textContent, no con HTML.
// Titulo, descripcion y URL se leen de la rama de tramites del panel (unica
// fuente); la factura solo vive aqui porque solo el diagnostico pregunta por ella.
function renderPasos(ev) {
    const ul = document.getElementById('actions-list');
    ul.innerHTML = '';
    ev.pasos.forEach((x, i) => {
        let titulo, desc, url;
        if (x.n === 'cfdi') {
            titulo = t('pasos.cfdiT'); desc = t('pasos.cfdiD');
            url = 'https://www.sat.gob.mx/portal/public/tramites/factura-electronica';
        } else {
            const a = document.querySelector('#tram-' + x.n + ' a');
            titulo = t('tram.t' + (+x.n)); desc = t('tram.d' + (+x.n)); url = a ? a.href : '#tramites';
        }
        if (x.nota === 'plazo') desc += ' ' + faPlazo.textoMensual();
        else if (x.nota) desc = t(x.nota);

        const li = document.createElement('li');
        li.className = 'paso';
        const enlace = document.createElement('a');
        enlace.href = url; enlace.target = '_blank'; enlace.rel = 'noopener noreferrer';
        const n = document.createElement('span'); n.className = 'paso-n'; n.textContent = String(i + 1);
        const b = document.createElement('span'); b.className = 'paso-b';
        const st = document.createElement('strong'); st.textContent = titulo;
        const d = document.createElement('span'); d.textContent = desc;
        b.appendChild(st); b.appendChild(d); enlace.appendChild(n); enlace.appendChild(b); li.appendChild(enlace); ul.appendChild(li);
    });
    ev.notas.forEach(clave => {
        const li = document.createElement('li');
        li.className = 'paso-nota'; li.textContent = t(clave);
        ul.appendChild(li);
    });
}

function showResults() {
    document.getElementById('diag-wizard').style.display = 'none';
    const progressBar = document.querySelector('.diag-progress');
    if (progressBar) progressBar.style.display = 'none';
    const results = document.getElementById('results');
    results.classList.add('active');
    renderResults();
    window.scrollTo({ top: results.getBoundingClientRect().top + window.scrollY - 80, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// El diagnostico se arma en JS, asi que el barrido de data-i18n no lo alcanza
// (mismo caso que el tabulador y el mapa: se re-renderiza al cambiar idioma).
document.addEventListener('idioma', function() {
    if (document.getElementById('results').classList.contains('active')) renderResults();
});

// Las marcas se escriben igual en los dos idiomas; las demas se traducen.
const NOMBRES_PLATAFORMA = {
    meli: 'Mercado Libre', amazon: 'Amazon', uber: 'Uber', didi: 'DiDi', rappi: 'Rappi', airbnb: 'Airbnb', youtube: 'YouTube', tiktok: 'TikTok', paypal: 'PayPal/Wise'
};

function renderProfileSummary() {
    const container = document.getElementById('profile-summary');
    const nombres = Array.from(state.platforms).map(p => NOMBRES_PLATAFORMA[p] || t('diag.plat.' + p));
    const negrita = p => '<strong>' + p + '</strong>';
    const plataformas = nombres.length === 1 ? negrita(nombres[0])
        : nombres.slice(0, -1).map(negrita).join(', ') + t('diag.y') + negrita(nombres[nombres.length - 1]);

    container.innerHTML = rellena(t('diag.perfil'), {
        ingreso: t('diag.ingreso.' + state.income),
        plataformas: plataformas,
        fiscal: t('diag.fiscal.' + state.fiscal),
        factura: t('diag.factura.' + state.factura)
    });
}

function renderList(id, items) {
    const ul = document.getElementById(id);
    ul.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}
