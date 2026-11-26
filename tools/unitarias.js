// Pruebas unitarias de la lógica que no necesita navegador: plazos, cálculo
// de la retención y evaluación del diagnóstico. Corren con el ejecutor de
// pruebas que trae node.
//
// Uso, desde la raiz del repo:   node tools/unitarias.js
// Sale con código 1 si alguna falla.
//
// Las fechas esperadas no salen del código que se prueba: se calcularon
// aparte, desde el texto del art. 12 CFF (DOF, última reforma 09-04-2026),
// con una implementación independiente y revisadas en el calendario.
const test = require('node:test');
const assert = require('node:assert/strict');

const faPlazo = require('../js/plazos.js');
const calculoRetencion = require('../js/retencion.js');

// 'AAAA-MM-DD' <-> Date local a medianoche, como las arma faPlazo.
const dia = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const iso = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

test('declaración mensual: día 17 o el siguiente día hábil (art. 12 CFF)', () => {
  const casos = [
    ['2026-01-05', '2026-01-19', 'el 17 es sábado: pasa al lunes'],
    ['2026-05-10', '2026-05-18', 'el 17 es domingo: pasa al lunes'],
    ['2025-11-03', '2025-11-18', 'el 17 es el tercer lunes de noviembre: inhábil'],
    ['2025-03-03', '2025-03-18', 'el 17 es el tercer lunes de marzo: inhábil'],
    ['2029-11-05', '2029-11-20', 'sábado, domingo y el lunes 19 inhábil: martes'],
    ['2026-10-20', '2026-11-17', 'ya pasó el de octubre: el de noviembre'],
    ['2026-11-17', '2026-11-17', 'el mismo día del plazo todavía cuenta'],
    ['2026-12-20', '2027-01-18', 'cambio de año: el 17 de enero es domingo'],
  ];
  for (const [hoy, esperado, porque] of casos) {
    assert.equal(iso(faPlazo.mensual(dia(hoy))), esperado, hoy + ': ' + porque);
  }
});

test('declaración anual: 30 de abril o el siguiente día hábil', () => {
  // 2028: el 30 de abril es domingo y el 1 de mayo es inhábil: vence el martes 2.
  let a = faPlazo.anual(dia('2028-03-01'));
  assert.equal(iso(a.fin), '2028-05-02');
  assert.equal(a.ejercicio, 2027);
  assert.equal(a.enCurso, true);
  // Pasado el plazo, la siguiente es la del año que viene.
  a = faPlazo.anual(dia('2026-05-15'));
  assert.equal(iso(a.fin), '2027-04-30');
  assert.equal(a.ejercicio, 2026);
  assert.equal(a.enCurso, false);
  // El último día todavía es el de este año.
  a = faPlazo.anual(dia('2027-04-30'));
  assert.equal(iso(a.fin), '2027-04-30');
  assert.equal(a.ejercicio, 2026);
  // Si el plazo se corre a mayo, el periodo sigue en curso hasta la fecha corrida.
  a = faPlazo.anual(dia('2028-05-01'));
  assert.equal(iso(a.fin), '2028-05-02');
  assert.equal(a.enCurso, true, '1 de mayo de 2028: la anual vence el 2 y sigue en curso');
  a = faPlazo.anual(dia('2028-05-03'));
  assert.equal(a.ejercicio, 2028);
  assert.equal(a.enCurso, false);
});

// Igualdad con tolerancia: las tasas son decimales binarios (0.025 no es exacto).
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, msg + ': ' + a + ' contra ' + b);

test('recibo con RFC: tasa del 113-A y la mitad del IVA', () => {
  // venta, 20,000: IVA 3,200; ISR 2.5% = 500; IVA retenido 1,600; deposita 21,100.
  let r = calculoRetencion.recibo('venta', 20000, true);
  cerca(r.cobra, 23200, 'cobra'); cerca(r.isr, 500, 'isr'); cerca(r.ivaR, 1600, 'iva retenido'); cerca(r.dep, 21100, 'deposita');
  // transporte, 10,000: ISR 2.1% = 210; IVA retenido 800; deposita 10,590.
  r = calculoRetencion.recibo('transporte', 10000, true);
  cerca(r.isr, 210, 'isr'); cerca(r.ivaR, 800, 'iva retenido'); cerca(r.dep, 10590, 'deposita');
  // hospedaje, 10,000: ISR 4% = 400; deposita 10,400.
  r = calculoRetencion.recibo('hospedaje', 10000, true);
  cerca(r.isr, 400, 'isr'); cerca(r.dep, 10400, 'deposita');
});

test('recibo sin RFC: 20% de ISR y todo el IVA (113-C fr. IV, 18-J)', () => {
  // venta, 20,000: ISR 4,000; IVA retenido 3,200; deposita 16,000.
  const r = calculoRetencion.recibo('venta', 20000, false);
  cerca(r.isr, 4000, 'isr'); cerca(r.ivaR, 3200, 'iva retenido'); cerca(r.dep, 16000, 'deposita');
  cerca(r.tasa, 0.20, 'tasa');
});

test('umbral del 113-B: más de 300,000 al año', () => {
  assert.equal(calculoRetencion.rebasaUmbral(25000), false, '25,000 al mes son 300,000 exactos: no lo rebasa');
  assert.equal(calculoRetencion.rebasaUmbral(25001), true);
  assert.equal(calculoRetencion.rebasaUmbral(10000), false);
});

test('partes de lo cobrado: depósito, ISR e IVA suman el total', () => {
  // Venta de 20,000 con RFC: de 23,200 cobrados, 21,100 se depositan (90.95%),
  // 500 son ISR (2.16%) y 1,600 son IVA (6.90%). Cuentas hechas a mano.
  let p = calculoRetencion.partes(calculoRetencion.recibo('venta', 20000, true));
  cerca(p.dep, 21100 / 23200, 'depósito'); cerca(p.isr, 500 / 23200, 'ISR'); cerca(p.iva, 1600 / 23200, 'IVA');
  // Sin RFC: 16,000, 4,000 y 3,200 de 23,200.
  p = calculoRetencion.partes(calculoRetencion.recibo('venta', 20000, false));
  cerca(p.dep, 16000 / 23200, 'depósito sin RFC'); cerca(p.isr, 4000 / 23200, 'ISR sin RFC'); cerca(p.iva, 3200 / 23200, 'IVA sin RFC');
  // Las partes no dependen del monto y siempre suman 1.
  for (const [act, base, rfc] of [['venta', 5000, true], ['transporte', 26000, true], ['hospedaje', 60000, false]]) {
    const q = calculoRetencion.partes(calculoRetencion.recibo(act, base, rfc));
    cerca(q.dep + q.isr + q.iva, 1, act + ' ' + base + ': suma');
  }
});

// ---- Diagnóstico -----------------------------------------------------------
// Mapa del hospedaje. El sitio no puede dar por confirmada la ley de un
// estado sin que el dato lo declare: el 24 de noviembre de 2026 se publicó el
// sello «verificado» sobre nueve estados cuyo texto no se había confirmado
// como el más reciente. Desde entonces cada estado lleva el campo c, y el
// que queda en parcial lo dice en su nota, en los dos idiomas.
const HOSPEDAJE = require('../js/datos/hospedaje.js');

test('mapa: cada estado declara si su ley se confirmó en el texto vigente, y el que no, lo dice', () => {
  const claves = Object.keys(HOSPEDAJE);
  assert.equal(claves.length, 32);
  for (const k of claves) {
    const e = HOSPEDAJE[k];
    assert.ok(e.c === 'v' || e.c === 'p', k + ': falta c (v = confirmado en el texto vigente, p = parcial)');
    const dice = /No pudimos confirmar/.test(e.nota), says = /We could not confirm/.test(e.nota_en);
    if (e.c === 'p') {
      assert.ok(dice, k + ': la nota no dice que la vigencia quedó sin confirmar');
      assert.ok(says, k + ': la nota en inglés no lo dice');
    } else {
      assert.ok(!dice && !says, k + ': la nota dice sin confirmar y el dato dice confirmado');
    }
  }
});

// Portada. La serie arma sus claves de texto con el nombre de cada escena, así
// que una clave que falte no truena: se vería su nombre en pantalla. Y el video
// del iPhone es una copia renderizada de la serie: si la serie cambia y el
// video no se vuelve a hacer, el teléfono y la computadora dirían cosas distintas.
const fs = require('fs');
const path = require('path');
const selloPortada = require('./sello-portada');
const textos = require('../js/datos/traducciones.js');

test('portada: cada texto que pide la serie existe en español y en inglés', () => {
  const claves = ['hero.title', 'hero.description', 'hero.cta', 'serie.cobra', 'serie.isr', 'serie.ivaMitad', 'serie.ivaTodo', 'serie.dep', 'serie.dia.t', 'serie.dia.n', 'serie.dia.c'];
  for (const c of ['venta', 'sinRfc', 'hospedaje']) claves.push('serie.caso.' + c, 'serie.cita.' + c);
  for (const l of ['transporte', 'venta', 'hospedaje']) claves.push('serie.ley.cita.' + l, 'serie.ley.claro.' + l);
  for (const k of claves) {
    assert.ok(textos.es[k], 'falta en ES: ' + k);
    assert.ok(textos.en[k], 'falta en EN: ' + k);
  }
  // Y al revés: ninguna clave de la serie queda sin usar.
  assert.deepEqual(Object.keys(textos.es).filter((k) => k.startsWith('serie.') && !claves.includes(k)), []);
});

test('portada: el video del iPhone corresponde a la serie en vivo y no pesa de más', () => {
  const sello = JSON.parse(fs.readFileSync(path.join(__dirname, '../portada/serie.json'), 'utf8'));
  assert.equal(sello.entradas, selloPortada(), 'la serie cambió después del último render: correr node tools/render-portada.js');
  for (const lang of ['es', 'en']) {
    const bytes = fs.statSync(path.join(__dirname, '../portada/serie-' + lang + '.mp4')).size;
    assert.equal(bytes, sello.archivos[lang].bytes, 'serie-' + lang + '.mp4 no es el archivo que anota el sello');
    assert.ok(bytes <= 1.5 * 1024 * 1024, 'serie-' + lang + '.mp4 pasa de 1.5 MiB: ' + bytes);
  }
});

const evaluarDiagnostico = require('../js/evaluacion.js');
const translations = require('../js/datos/traducciones.js');
const resp = (categorias, ingreso, fiscal, factura) =>
  ({ categorias, nPlataformas: categorias.length, ingreso, fiscal, factura });

test('diagnóstico: los umbrales de exposición en su borde exacto (8 alta, 5 media)', () => {
  // transporte 2 + umbral 3 + declara parcial 2 + factura algunas 1 = 8
  let ev = evaluarDiagnostico(resp(['transporte'], 'umbral', 'declaro_parcial', 'algunas'));
  assert.equal(ev.puntos, 8); assert.equal(ev.nivel, 'alto');
  // transporte 2 + medio 2 + declara parcial 2 + algunas 1 = 7
  ev = evaluarDiagnostico(resp(['transporte'], 'medio', 'declaro_parcial', 'algunas'));
  assert.equal(ev.puntos, 7); assert.equal(ev.nivel, 'medio');
  // transporte 2 + medio 2 + al corriente 0 + algunas 1 = 5
  ev = evaluarDiagnostico(resp(['transporte'], 'medio', 'al_corriente', 'algunas'));
  assert.equal(ev.puntos, 5); assert.equal(ev.nivel, 'medio');
  // transporte 2 + bajo 1 + al corriente 0 + algunas 1 = 4
  ev = evaluarDiagnostico(resp(['transporte'], 'bajo', 'al_corriente', 'algunas'));
  assert.equal(ev.puntos, 4); assert.equal(ev.nivel, 'bajo');
});

test('diagnóstico: sin brecha de cumplimiento el nivel es bajo aunque el SAT vea mucho', () => {
  // marketplace 3 + hospedaje 3 + crypto 2 + muy alto 4 = 12 puntos
  const ev = evaluarDiagnostico(resp(['marketplace', 'hospedaje', 'crypto'], 'muy_alto', 'al_corriente', 'si_todas'));
  assert.equal(ev.puntos, 12); assert.equal(ev.nivel, 'bajo');
});

test('diagnóstico: el pago definitivo del 113-B', () => {
  // Plataformas del régimen, debajo del umbral: puede optar.
  let ev = evaluarDiagnostico(resp(['marketplace'], 'bajo', 'al_corriente', 'si_todas'));
  assert.ok(ev.obligaciones.includes('diag.ob.definitivo'));
  assert.ok(!ev.obligaciones.includes('diag.ob.mensuales'));
  // Con cripto u otros ingresos que el 113-B no admite: no le aplica.
  ev = evaluarDiagnostico(resp(['marketplace', 'crypto'], 'bajo', 'al_corriente', 'si_todas'));
  assert.ok(ev.obligaciones.includes('diag.ob.definitivoNo'));
  assert.ok(!ev.obligaciones.includes('diag.ob.definitivo'));
  // Cerca del umbral: ni una ni otra; declara cada mes y la anual.
  ev = evaluarDiagnostico(resp(['marketplace'], 'umbral', 'al_corriente', 'si_todas'));
  assert.ok(!ev.obligaciones.some(k => k.startsWith('diag.ob.definitivo')));
  assert.ok(ev.obligaciones.includes('diag.ob.umbralCerca'));
  assert.ok(ev.obligaciones.includes('diag.ob.mensuales') && ev.obligaciones.includes('diag.ob.anual'));
});

test('diagnóstico: pasos en orden según la situación fiscal', () => {
  // Sin alta en el SAT: RFC, firma, obligaciones, situación, buzón; y la factura.
  let ev = evaluarDiagnostico(resp(['marketplace'], 'muy_alto', 'ninguna', 'no'));
  assert.deepEqual(ev.pasos.map(p => p.n), ['01', '02', '05', '04', '03', 'cfdi']);
  assert.equal(ev.pasos[2].nota, 'pasos.oblig');
  assert.deepEqual(ev.notas, ['pasos.contador']);
  // No sabe su situación; con tres plataformas se sugiere mapearlas.
  ev = evaluarDiagnostico(resp(['marketplace', 'transporte', 'delivery'], 'bajo', 'no_se', 'si_todas'));
  assert.deepEqual(ev.pasos.map(p => p.n + (p.nota ? ':' + p.nota : '')), ['04:pasos.revisa', '02:pasos.sinPass']);
  assert.deepEqual(ev.notas, ['pasos.contador', 'pasos.mapea']);
});

test('diagnóstico: toda clave que devuelve la evaluación existe, y todas se alcanzan', () => {
  // Todas las respuestas posibles con dos y con tres plataformas.
  const CATS = ['marketplace', 'transporte', 'delivery', 'hospedaje', 'contenido', 'freelance', 'pagos', 'crypto', 'otro'];
  const vistas = new Set();
  for (const ingreso of ['bajo', 'medio', 'umbral', 'alto', 'muy_alto'])
    for (const fiscal of ['ninguna', 'alta_sin_declarar', 'declaro_parcial', 'al_corriente', 'no_se'])
      for (const factura of ['si_todas', 'algunas', 'no', 'no_se'])
        for (const a of CATS) for (const b of CATS) for (const extra of [[], ['otro']]) {
          const ev = evaluarDiagnostico(resp([a, b, ...extra], ingreso, fiscal, factura));
          [...ev.visibilidad, ...ev.obligaciones, ...ev.notas, 'diag.nivel.' + ev.nivel,
           ...ev.pasos.map(p => p.nota).filter(n => n && n !== 'plazo')].forEach(k => vistas.add(k));
        }
  for (const k of vistas) {
    assert.ok(k in translations.es, 'falta en ES: ' + k);
    assert.ok(k in translations.en, 'falta en EN: ' + k);
  }
  // Y al revés: ningún texto del diagnóstico en el diccionario queda inalcanzable.
  const posibles = Object.keys(translations.es).filter(k => /^diag\.(ve|ob|nivel)\.|^pasos\.(oblig|revisa|sinPass|contador|mapea)$/.test(k));
  assert.deepEqual(posibles.filter(k => !vistas.has(k)), [], 'claves que ninguna respuesta produce');
});
