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

// ==================== LÓGICA DE DIAGNÓSTICO ====================
function renderResults() {
    // Todo el contenido dinamico del panel, en el idioma actual. Idempotente:
    // se llama al terminar el examen y al cambiar de idioma con el panel abierto.
    renderProfileSummary();

    const risk = calculateRisk();
    const banner = document.getElementById('risk-banner');
    const riskLevel = document.getElementById('risk-level');

    banner.className = 'risk-banner risk-' + risk.level;
    const labels = currentLanguage === 'en'
        ? { alto: 'HIGH EXPOSURE', medio: 'MEDIUM EXPOSURE', bajo: 'LOW EXPOSURE' }
        : { alto: 'EXPOSICIÓN ALTA', medio: 'EXPOSICIÓN MEDIA', bajo: 'EXPOSICIÓN BAJA' };
    riskLevel.textContent = labels[risk.level];

    // Medidor: bajo 33%, medio 66%, alto 100%. El width se asigna tras el
    // primer frame para que la transicion corra al entrar el panel.
    const meterFill = document.getElementById('risk-meter-fill');
    meterFill.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        meterFill.style.width = { bajo: '33%', medio: '66%', alto: '100%' }[risk.level];
    }));

    renderList('sat-visibility-list', risk.visibility);
    document.getElementById('sat-visibility').hidden = risk.visibility.length === 0;
    renderList('obligations-list', risk.obligations);
    // Los pasos son enlaces: se arman con nodos y textContent, no con HTML.
    const ul = document.getElementById('actions-list');
    ul.innerHTML = '';
    let k = 0;
    risk.actions.forEach(x => {
        const li = document.createElement('li');
        if (x.nota) { li.className = 'paso-nota'; li.textContent = x.nota; ul.appendChild(li); return; }
        k++;
        li.className = 'paso';
        const a = document.createElement('a');
        a.href = x.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        const n = document.createElement('span'); n.className = 'paso-n'; n.textContent = String(k);
        const b = document.createElement('span'); b.className = 'paso-b';
        const st = document.createElement('strong'); st.textContent = x.titulo;
        const d = document.createElement('span'); d.textContent = x.desc;
        b.appendChild(st); b.appendChild(d); a.appendChild(n); a.appendChild(b); li.appendChild(a); ul.appendChild(li);
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
document.querySelectorAll('.lang-switch .lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (document.getElementById('results').classList.contains('active')) renderResults();
    });
});

function renderProfileSummary() {
    const container = document.getElementById('profile-summary');

    const platformNames = currentLanguage === 'en' ? {
        meli: 'Mercado Libre', amazon: 'Amazon', uber: 'Uber', didi: 'DiDi',
        rappi: 'Rappi', airbnb: 'Airbnb', youtube: 'YouTube', tiktok: 'TikTok',
        freelance: 'Freelance', paypal: 'PayPal/Wise', crypto: 'Cryptocurrency', otro: 'another platform'
    } : {
        meli: 'Mercado Libre', amazon: 'Amazon', uber: 'Uber', didi: 'DiDi',
        rappi: 'Rappi', airbnb: 'Airbnb', youtube: 'YouTube', tiktok: 'TikTok',
        freelance: 'freelance', paypal: 'PayPal/Wise', crypto: 'crypto', otro: 'otra plataforma'
    };

    const incomeLabels = currentLanguage === 'en' ? {
        bajo: 'less than $10,000 MXN per month', medio: 'between $10,000 and $25,000 MXN per month',
        umbral: 'between $25,000 and $50,000 MXN per month', alto: 'between $50,000 and $150,000 MXN per month',
        muy_alto: 'more than $150,000 MXN per month'
    } : {
        bajo: 'menos de $10,000', medio: 'entre $10,000 y $25,000',
        umbral: 'entre $25,000 y $50,000', alto: 'entre $50,000 y $150,000',
        muy_alto: 'más de $150,000'
    };

    const fiscalFragments = currentLanguage === 'en' ? {
        ninguna: 'you are not registered with the tax authority',
        alta_sin_declarar: 'you are registered but have not filed returns',
        declaro_parcial: 'you file but are unsure if you include everything',
        al_corriente: 'you are current with your tax filings',
        no_se: 'you are unsure of your status with the tax authority'
    } : {
        ninguna: 'no está dado de alta en el SAT',
        alta_sin_declarar: 'está dado de alta pero no ha declarado',
        declaro_parcial: 'declara pero no está seguro de incluir todo',
        al_corriente: 'está al corriente con sus declaraciones',
        no_se: 'no está seguro de su situación ante el SAT'
    };

    const facturaFragments = currentLanguage === 'en' ? {
        si_todas: 'you issue tax receipts for all your income',
        algunas: 'you only issue receipts for some income',
        no: 'you do not issue invoices',
        no_se: 'you do not know what a tax receipt (CFDI) is'
    } : {
        si_todas: 'factura todos sus ingresos',
        algunas: 'solo factura algunos ingresos',
        no: 'no emite facturas',
        no_se: 'no sabe qué es un CFDI'
    };

    const platsArr = Array.from(state.platforms).map(p => platformNames[p] || p);
    let platsText = '';
    const connector = currentLanguage === 'en' ? ' and ' : ' y ';
    const comma = currentLanguage === 'en' ? ', ' : ', ';

    if (platsArr.length === 1) platsText = '<strong>' + platsArr[0] + '</strong>';
    else if (platsArr.length === 2) platsText = '<strong>' + platsArr[0] + '</strong>' + connector + '<strong>' + platsArr[1] + '</strong>';
    else platsText = platsArr.slice(0,-1).map(p => '<strong>' + p + '</strong>').join(comma) + connector + '<strong>' + platsArr[platsArr.length-1] + '</strong>';

    const profileText = currentLanguage === 'en'
        ? `Your profile: you earn <strong>${incomeLabels[state.income]}</strong> on ${platsText}, ${fiscalFragments[state.fiscal]}, and ${facturaFragments[state.factura]}.`
        : `Su perfil: genera <strong>${incomeLabels[state.income]} al mes</strong> en ${platsText}, ${fiscalFragments[state.fiscal]}, y ${facturaFragments[state.factura]}.`;

    container.innerHTML = profileText;
}

function renderList(id, items) {
    const ul = document.getElementById(id);
    ul.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}

function calculateRisk() {
    const platforms = Array.from(state.platforms);
    const categories = new Set(platforms.map(p => {
        const btn = document.querySelector(`[data-platform="${p}"]`);
        return btn ? btn.dataset.category : 'otro';
    }));

    let riskScore = 0;
    const visibility = [];
    const obligations = [];
    const actions = [];

    // --- Visibilidad por plataforma ---
    if (categories.has('marketplace')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your marketplace sales:</strong> Mercado Libre and Amazon report to the tax authority every month how much you sold through them, along with your RFC and bank account (CLABE) (Income Tax Law art. 113-C, section III; VAT Law art. 18-J, section III).'
            : '<strong>Sus ventas en marketplaces:</strong> Mercado Libre y Amazon le informan al SAT cada mes cuánto vendió usted a través de ellas, junto con su RFC y su CLABE (Art. 113-C, fr. III LISR y art. 18-J, fr. III LIVA).';
        visibility.push(text);
        riskScore += 3;
    }
    if (categories.has('transporte')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your rides as a driver:</strong> Uber, DiDi, and similar platforms report your income to the tax authority and automatically withhold income tax (ISR) and value-added tax (IVA).'
            : '<strong>Sus viajes como conductor:</strong> Uber, DiDi y plataformas similares reportan al SAT lo que usted gana y le retienen ISR e IVA automáticamente.';
        visibility.push(text);
        riskScore += 2;
    }
    if (categories.has('delivery')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your deliveries:</strong> Rappi and delivery platforms report rider income to the tax authority.'
            : '<strong>Sus entregas:</strong> Rappi y plataformas de delivery informan al SAT sobre los ingresos de sus repartidores.';
        visibility.push(text);
        riskScore += 2;
    }
    if (categories.has('hospedaje')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your rental income:</strong> Airbnb reports to the tax authority and withholds taxes. On top of that there is the state lodging tax, which all 32 federal entities levy at 2% to 6% depending on where your property is.'
            : '<strong>Sus rentas de hospedaje:</strong> Airbnb reporta al SAT y retiene impuestos. Aparte está el impuesto estatal sobre hospedaje, que cobran las 32 entidades con tasas de 2% a 6% según dónde esté su inmueble.';
        visibility.push(text);
        riskScore += 3;
    }
    if (categories.has('contenido')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your creator income:</strong> Payments from YouTube, TikTok and similar services may arrive from abroad. The SAT can obtain banking information and request data to review whether that income was declared (Federal Tax Code arts. 32-B and 42).'
            : '<strong>Sus ingresos como creador:</strong> Los pagos de YouTube, TikTok y servicios similares pueden llegar del extranjero. El SAT puede obtener información bancaria y requerir datos para revisar si declaró esos ingresos (arts. 32-B y 42 CFF).';
        visibility.push(text);
        riskScore += 2;
    }
    if (categories.has('freelance')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your freelance payments:</strong> If you receive payments via bank transfer or payment platforms, the tax authority can detect unreported income by cross-checking with banks (Federal Tax Code art. 59, section III).'
            : '<strong>Sus pagos de freelance:</strong> Si recibe por transferencia bancaria o plataformas de pago, el SAT puede detectar ingresos no declarados al cruzar información con los bancos (Art. 59, fr. III CFF).';
        visibility.push(text);
        riskScore += 2;
    }
    if (categories.has('pagos')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your PayPal/Wise transfers:</strong> Mexican financial institutions report to the tax authority. If funds arrive in your Mexican bank account, the tax authority has visibility.'
            : '<strong>Sus movimientos en PayPal/Wise:</strong> Las instituciones financieras mexicanas reportan al SAT. Si los fondos llegan a su cuenta bancaria en México, el SAT tiene visibilidad.';
        visibility.push(text);
        riskScore += 2;
    }
    if (categories.has('crypto')) {
        const text = currentLanguage === 'en'
            ? '<strong>Your crypto transactions:</strong> Reporting duties depend on the provider and the transaction. The SAT can obtain banking information and request data to review tax compliance (Federal Tax Code arts. 32-B and 42).'
            : '<strong>Sus operaciones crypto:</strong> Las obligaciones de reporte dependen del prestador y de la operación. El SAT puede obtener información bancaria y requerir datos para revisar su cumplimiento fiscal (arts. 32-B y 42 CFF).';
        visibility.push(text);
        riskScore += 2;
    }

    // --- Ingresos ---
    if (state.income === 'muy_alto') riskScore += 4;
    else if (state.income === 'alto') riskScore += 3;
    else if (state.income === 'umbral') riskScore += 3;
    else if (state.income === 'medio') riskScore += 2;
    else riskScore += 1;

    // Umbral de $300,000 del Art. 113-B LISR. La opcion se mide con el
    // ejercicio anterior; rebasar el umbral este ano la cierra desde el siguiente.
    if (state.income === 'alto' || state.income === 'muy_alto') {
        const text = currentLanguage === 'en'
            ? '<strong>Income above 300,000 pesos a year:</strong> If you were also above it last year, withholdings cannot be your final payment. If you were not, going above it this year closes that option from next year on. Without the option you file income tax and VAT monthly and credit what was withheld (Income Tax Law art. 113-B).'
            : '<strong>Ingresos arriba de $300,000 al año:</strong> Si el año pasado también rebasó esa cifra, las retenciones no pueden ser su pago definitivo. Si no la rebasó, hacerlo este año le cierra la opción desde el siguiente. Sin esa opción declara ISR e IVA cada mes y acredita lo retenido (Art. 113-B LISR).';
        obligations.push(text);
    } else if (state.income === 'umbral') {
        const text = currentLanguage === 'en'
            ? '<strong>Close to the 300,000-peso annual threshold:</strong> The final-payment election depends on your platform income last year. If it did not exceed 300,000 pesos you can elect it; if it did, you file monthly. Going over the threshold this year closes the option from next year on (Income Tax Law art. 113-B).'
            : '<strong>Cerca del umbral de $300,000 al año:</strong> La opción de pago definitivo se mide con lo que ganó por plataformas el año pasado. Si no pasó de $300,000, puede optar; si pasó, declara cada mes. Rebasar el umbral este año le cierra la opción desde el siguiente (Art. 113-B LISR).';
        obligations.push(text);
    }

    // --- Situación fiscal ---
    if (state.fiscal === 'ninguna') {
        riskScore += 4;
        const text = currentLanguage === 'en'
            ? '<strong>Register with the tax authority (SAT):</strong> If you earn income, you\'re required to register for a tax ID (RFC) and choose a tax regime.'
            : '<strong>Darse de alta en el SAT:</strong> Si genera ingresos, está obligado a inscribirse en el RFC y elegir un régimen fiscal.';
        obligations.push(text);
    }
    if (state.fiscal === 'alta_sin_declarar') {
        riskScore += 3;
        const text = currentLanguage === 'en'
            ? '<strong>File pending returns:</strong> Being registered without filing can trigger tax authority inquiries with penalties and surcharges.'
            : '<strong>Presentar declaraciones pendientes:</strong> Estar dado de alta sin declarar puede generar requerimientos del SAT con multas y recargos.';
        obligations.push(text);
    }
    if (state.fiscal === 'declaro_parcial') {
        riskScore += 2;
        const text = currentLanguage === 'en'
            ? '<strong>Review which income you\'re including:</strong> If you have income from multiple platforms, all must be in your returns. The tax authority cross-checks.'
            : '<strong>Revisar qué ingresos está incluyendo:</strong> Si tiene ingresos de varias plataformas, todos deben estar en sus declaraciones. El SAT cruza información.';
        obligations.push(text);
    }
    if (state.fiscal === 'no_se') {
        riskScore += 3;
        const text = currentLanguage === 'en'
            ? '<strong>Check your tax status:</strong> If you\'re unsure of your status with the tax authority, start by getting your Tax Status Certificate at sat.gob.mx. There you\'ll see if you\'re registered, in which regime, and your obligations.'
            : '<strong>Revise su situación fiscal:</strong> Si no está seguro de su estatus ante el SAT, lo primero es obtener su Constancia de Situación Fiscal en sat.gob.mx. Ahí va a ver si está dado de alta, en qué régimen y sus obligaciones.';
        obligations.push(text);
    }

    // --- Facturación ---
    if (state.factura === 'no' || state.factura === 'no_se') {
        riskScore += 2;
        const text = currentLanguage === 'en'
            ? '<strong>Issue tax receipts (CFDI):</strong> If you\'re registered, you must issue a tax receipt for each income received. It\'s free in the tax authority portal. Not issuing is one of the most common and easy-to-detect violations.'
            : '<strong>Emitir facturas (CFDI):</strong> Si está dado de alta en el SAT, debe emitir un CFDI por cada ingreso que reciba. Es un trámite gratuito en el portal del SAT. No facturar es una de las irregularidades más comunes y fáciles de detectar.';
        obligations.push(text);
    }
    if (state.factura === 'algunas') {
        riskScore += 1;
        const text = currentLanguage === 'en'
            ? '<strong>Issue tax receipts for all income:</strong> If you only issue for some, the tax authority can detect the difference by comparing platform reports vs your receipts. Regularizing helps.'
            : '<strong>Facturar todos sus ingresos:</strong> Si solo factura algunos, el SAT puede detectar la diferencia al cruzar lo que las plataformas reportan vs lo que usted factura. Conviene regularizar.';
        obligations.push(text);
    }

    // --- Obligaciones por tipo (con el matiz del pago definitivo 113-B) ---
    const excedeUmbral = (state.income === 'umbral' || state.income === 'alto' || state.income === 'muy_alto');
    const plataformasRegimen = categories.has('marketplace') || categories.has('transporte') || categories.has('hospedaje') || categories.has('delivery');
    // El 113-B solo admite ingresos de plataformas mas sueldo (cap. I) e
    // intereses (cap. VI). Cripto (enajenacion) y creadores quedan fuera.
    const otrosIngresosExcluyen = categories.has('crypto') || categories.has('contenido');
    if (plataformasRegimen && !excedeUmbral && otrosIngresosExcluyen) {
        const text = currentLanguage === 'en'
            ? '<strong>Final-payment election for platform income:</strong> Not available to you. Income Tax Law art. 113-B requires that your only income come from platforms, a salary or interest; with other kinds of income, withholdings count as an advance.'
            : '<strong>Pago definitivo por plataformas:</strong> No le aplica. El Art. 113-B LISR exige que sus únicos ingresos sean de plataformas, sueldo o intereses; con ingresos de otro tipo, las retenciones cuentan como anticipo.';
        obligations.push(text);
    } else if (plataformasRegimen && !excedeUmbral) {
        const text = currentLanguage === 'en'
            ? '<strong>Digital platform tax regime:</strong> If last year your only income came from platforms (or also from a salary or interest) and your platform income did not exceed 300,000 pesos, you can elect to have the income tax and VAT withholdings be your <strong>final payment</strong> (Income Tax Law art. 113-B; VAT Law art. 18-M), filing the notice within 30 days of your first platform income. If you take that option, withholdings settle your platform taxes and you don\'t file monthly returns for that income. If you don\'t, you file monthly and withholdings count as advance payments.'
            : '<strong>Régimen de plataformas digitales:</strong> Si el año pasado solo tuvo ingresos por plataformas (o, además, sueldo o intereses) y los de plataformas no pasaron de $300,000, puede optar por que las retenciones de ISR e IVA sean su <strong>pago definitivo</strong> (Art. 113-B LISR y art. 18-M LIVA), con aviso al SAT dentro de los 30 días siguientes a su primer ingreso por plataformas. Si ejerce esa opción, las retenciones cierran sus impuestos de plataformas y no presenta pagos mensuales por esos ingresos. Si no la ejerce, sí declara mensualmente y las retenciones cuentan como anticipo.';
        obligations.push(text);
    }
    // Cripto de persona fisica fuera de actividad empresarial es enajenacion
    // de bienes (pago por operacion, Art. 126 LISR), no pagos mensuales.
    const mensuales = excedeUmbral || ['contenido', 'freelance', 'pagos', 'otro'].some(c => categories.has(c));
    if (mensuales) {
        const text1 = currentLanguage === 'en'
            ? '<strong>Monthly returns:</strong> Income tax (ISR) and value-added tax (IVA) are declared every month (by the 17th) for income not covered by a definitive withholding.'
            : '<strong>Declaraciones mensuales:</strong> ISR e IVA se declaran cada mes (a más tardar el día 17) por los ingresos que no estén cubiertos por una retención definitiva.';
        obligations.push(text1);
    }
    if (mensuales || categories.has('crypto')) {
        const text2 = currentLanguage === 'en'
            ? '<strong>Annual return:</strong> Every April you file your annual income tax (ISR) return with the year\'s income, except income already settled by a final withholding.'
            : '<strong>Declaración anual:</strong> En abril presenta su declaración anual de ISR con los ingresos del año, salvo los que ya quedaron cubiertos por una retención definitiva.';
        obligations.push(text2);
    }
    if ((categories.has('contenido') || categories.has('freelance') || categories.has('pagos')) && state.factura === 'si_todas') {
        const text = currentLanguage === 'en'
            ? '<strong>Keep issuing receipts:</strong> You\'re doing well with tax receipts. Make sure each receipt matches the amounts platforms report to the tax authority.'
            : '<strong>Siga facturando:</strong> Está haciendo bien en emitir CFDI. Asegúrese de que cada factura coincida con los montos que las plataformas reportan al SAT.';
        obligations.push(text);
    }
    if (categories.has('crypto')) {
        const text = currentLanguage === 'en'
            ? '<strong>Asset sales (crypto):</strong> Gains from cryptocurrency sales are treated as taxable income. There\'s no special tax regime for crypto in Mexico, which complicates things.'
            : '<strong>Enajenación de bienes:</strong> Las ganancias por venta de criptomonedas se consideran ingresos acumulables. No hay régimen especial para crypto en México, lo cual complica las cosas.';
        obligations.push(text);
    }

    // --- Pasos ---
    // Contrato: entran las respuestas; salen pasos en orden, cada uno con el
    // enlace al tramite. Titulo, descripcion y URL se leen de la rama de
    // tramites del panel (unica fuente); la factura solo vive aqui porque
    // solo el diagnostico pregunta por ella. Las notas sin tramite van al final.
    const PASOS = [];
    function paso(n, nota) {
        if (PASOS.some(x => x.n === n)) return;
        PASOS.push({ n, nota });
    }
    if (state.fiscal === 'ninguna') { paso('01'); paso('02'); paso('05', t('pasos.oblig')); paso('04'); paso('03'); }
    else if (state.fiscal === 'no_se') { paso('04', t('pasos.revisa')); paso('02', t('pasos.sinPass')); }
    else if (state.fiscal === 'alta_sin_declarar') { paso('04'); paso('06', 'plazo'); paso('03'); }
    else if (state.fiscal === 'declaro_parcial') { paso('04'); paso('05', t('pasos.oblig')); paso('06', 'plazo'); }
    else { if (mensuales) paso('06', 'plazo'); paso('03'); }
    if (state.factura === 'no' || state.factura === 'no_se' || state.factura === 'algunas') paso('cfdi');
    PASOS.forEach(x => {
        let titulo, desc, url;
        if (x.n === 'cfdi') {
            titulo = t('pasos.cfdiT'); desc = t('pasos.cfdiD');
            url = 'https://www.sat.gob.mx/portal/public/tramites/factura-electronica';
        } else {
            const a = document.querySelector('#tram-' + x.n + ' a');
            titulo = t('tram.t' + (+x.n)); desc = t('tram.d' + (+x.n)); url = a ? a.href : '#tramites';
        }
        if (x.nota === 'plazo') desc += ' ' + faPlazo.textoMensual();
        else if (x.nota) desc = x.nota;
        actions.push({ titulo, desc, url });
    });
    if (state.fiscal === 'ninguna' || state.fiscal === 'alta_sin_declarar' || state.fiscal === 'no_se') {
        actions.push({ nota: t('pasos.contador') });
    }
    if (state.platforms.size > 2) actions.push({ nota: t('pasos.mapea') });

    // --- Nivel final ---
    // La visibilidad sola no es exposicion: sin brecha de cumplimiento, el nivel es bajo.
    const sinBrecha = state.fiscal === 'al_corriente' && state.factura === 'si_todas';
    let level;
    if (sinBrecha) level = 'bajo';
    else if (riskScore >= 8) level = 'alto';
    else if (riskScore >= 5) level = 'medio';
    else level = 'bajo';

    return { level, visibility, obligations, actions };
}
