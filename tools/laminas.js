// Controles de las láminas en vivo de /aprende, en un navegador de verdad.
//
// Existe por un bug que llegó a producción: la página marcaba una lámina como "ya vista"
// en cuanto pedía reproducirla, aunque el iframe (carga diferida) todavía no
// estuviera listo para recibir la orden. Al llegar, la lámina saltaba al
// diagrama completo con el botón de Repetir. Chromium pide los iframes
// diferidos mucho antes de que entren en pantalla y lo escondía; Safari los
// pide al entrar, y ahí se veía en todas.
//
// Por eso, por defecto, simula la carga de WebKit: cada lámina se sirve
// cuando su marco ya está en pantalla, 400 ms después. Con --rapido usa la
// carga normal de Chromium. Sobre el código anterior al arreglo da 10 FALLAS.
//
// También prueba la voz (botón Escuchar): que la lámina siga al audio y espere
// donde voz.js dice, que el botón principal pause y reanude la voz, que se calle
// al salir de pantalla o al cambiar de idioma, y que con movimiento reducido
// la lámina no arranque sola pero sí siga a la voz cuando se pide. El Chromium
// de Playwright no trae el códec AAC, así que el audio se sustituye por un
// doble con reloj propio: se prueba el trato entre la página y la lámina, no
// la decodificación.
//
// Uso, desde la raiz del repo (necesita Playwright):
//     node tools/laminas.js [--rapido]
// Tarda unos tres minutos, porque deja correr láminas completas.
const http = require('http'), fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('playwright no esta instalado (npm install)');
  process.exit(2);
}
const raiz = path.resolve(__dirname, '..');
const lento = !process.argv.includes('--rapido');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4', '.m4a': 'audio/mp4' };
const servidor = http.createServer((req, res) => {
  let f = path.join(raiz, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});

let fallas = 0;
const ok = (cond, msg) => { console.log((cond ? '  OK    ' : '  FALLA ') + msg); if (!cond) fallas++; };

async function abre(b, base, opts) {
  const ctx = await b.newContext({ locale: 'es-MX', ...opts });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (lento) await p.route(/laminas\/(p\d)\.html/, async r => {
    const id = r.request().url().match(/(p\d)\.html/)[1];
    for (let k = 0; k < 400; k++) {
      const dentro = await p.evaluate(id => { const b = document.querySelector('[data-lamina="' + id + '"]').getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; }, id).catch(() => true);
      if (dentro) break; await new Promise(z => setTimeout(z, 50));
    }
    await new Promise(z => setTimeout(z, 400)); r.continue().catch(() => {});
  });
  // En modo WebKit no se espera 'load': ese evento espera los iframes que
  // Chromium ya pidió, y la ruta de arriba retiene hasta 20 s los que no están
  // en pantalla. Si Chromium los pedía antes de 'load', la carga tardaba ~22 s
  // y p1, que está en pantalla desde el inicio, se reproducía completa antes de
  // revisarla. Era una carrera de la prueba, no del sitio.
  await p.goto(base + '/aprende/', { waitUntil: lento ? 'domcontentloaded' : 'load' });
  await p.waitForTimeout(800);
  return { ctx, p, errores };
}
// Botón, su rótulo y la barra de avance de una lámina.
const est = (p, id) => p.$eval(`[data-lamina="${id}"]`, f => ({ e: f.querySelector('.ap-play').dataset.estado, a: f.querySelector('.ap-play').getAttribute('aria-label'), w: Math.round(parseFloat(f.querySelector('.ap-fill').style.width || '0')) }));
const ve = (p, id) => p.$eval(`[data-lamina="${id}"]`, f => f.scrollIntoView({ block: 'center' }));
const clic = (p, id) => p.click(`[data-lamina="${id}"] .ap-play`);
const idioma = (p, l) => p.$eval(`.lang-switch .lang-btn[data-lang="${l}"]`, x => x.click());

// Doble del elemento <audio>: avanza con el reloj, se puede mover a un segundo
// y avisa play, pause y ended como el de verdad. Queda en window.__audio.
const audioFalso = () => {
  const crear = document.createElement.bind(document);
  document.createElement = function (etiqueta) {
    if (String(etiqueta).toLowerCase() !== 'audio') return crear(etiqueta);
    const a = new EventTarget(); let t = 0, antes = 0, corre = false, src = '';
    const avanza = () => {
      if (!corre) return;
      const ahora = performance.now(); t = Math.min(a.duration, t + (ahora - antes) / 1000); antes = ahora;
      if (t >= a.duration) { corre = false; a.dispatchEvent(new Event('pause')); a.dispatchEvent(new Event('ended')); }
    };
    setInterval(avanza, 50);
    Object.defineProperties(a, {
      currentTime: { get() { avanza(); return t; }, set(v) { t = v; antes = performance.now(); } },
      paused: { get() { return !corre; } },
      ended: { get() { return t >= a.duration; } },
      src: { get() { return src; }, set(v) { src = v; t = 0; corre = false; } },
    });
    a.duration = 30;
    a.play = () => { if (t >= a.duration) t = 0; corre = true; antes = performance.now(); a.dispatchEvent(new Event('play')); return Promise.resolve(); };
    a.pause = () => { if (!corre) return; avanza(); corre = false; a.dispatchEvent(new Event('pause')); };
    a.removeAttribute = n => { if (n === 'src') src = ''; };
    window.__audio = a;
    return a;
  };
};
const voz = (p, id) => p.$eval(`[data-lamina="${id}"] .ap-voz`, b => ({ oculto: b.hidden, puesta: b.getAttribute('aria-pressed'), texto: b.textContent.trim() }));
const clicVoz = (p, id) => p.click(`[data-lamina="${id}"] .ap-voz`);
const audio = p => p.evaluate(() => ({ src: window.__audio.src.split('/').pop(), pausado: window.__audio.paused, t: window.__audio.currentTime }));
const marco = (p, id) => p.frames().find(f => f.url().includes(id + '.html'));
const opacidad = (fr, id) => fr.evaluate(id => Number(getComputedStyle(document.getElementById(id)).opacity), id);

(async () => {
  await new Promise(z => servidor.listen(0, z));
  const base = 'http://localhost:' + servidor.address().port;
  const b = await chromium.launch();
  console.log('carga ' + (lento ? 'estilo WebKit' : 'normal de Chromium'));

  console.log('escritorio, con movimiento');
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    const { ctx, p } = await abre(b, base, { viewport: { width: 1280, height: 800 } });
    await ve(p, id); await p.waitForTimeout(2000);
    const s = await est(p, id); ok(s.e === 'pause' && s.w > 2 && s.w < 40, `${id} arranca sola al entrar: ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const { ctx, p, errores } = await abre(b, base, { viewport: { width: 1280, height: 800 } });
    await ve(p, 'p2'); await p.waitForTimeout(2000);
    await ve(p, 'p5'); await p.waitForTimeout(1200);
    const s1 = await est(p, 'p2'); ok(s1.e === 'play', `p2 se pausa al salir: ${JSON.stringify(s1)}`);
    await p.waitForTimeout(1500);
    const s2 = await est(p, 'p2'); ok(s2.w === s1.w, `p2 no avanza fuera de pantalla (${s1.w}% y ${s2.w}%)`);
    await ve(p, 'p2'); await p.waitForTimeout(1200);
    const s3 = await est(p, 'p2'); ok(s3.e === 'pause' && s3.w > s1.w, `p2 sigue al volver: ${JSON.stringify(s3)}`);
    await p.waitForTimeout(30000);
    let s = await est(p, 'p2'); ok(s.e === 'replay' && s.w === 100 && s.a === 'Repetir', `p2 termina en Repetir: ${JSON.stringify(s)}`);
    await clic(p, 'p2'); await p.waitForTimeout(1200);
    s = await est(p, 'p2'); ok(s.e === 'pause' && s.w < 15, `Repetir la reinicia: ${JSON.stringify(s)}`);
    await clic(p, 'p2'); await p.waitForTimeout(300);
    await ve(p, 'p5'); await p.waitForTimeout(800); await ve(p, 'p2'); await p.waitForTimeout(1200);
    s = await est(p, 'p2'); ok(s.e === 'play', `pausada con el botón sigue pausada al volver: ${JSON.stringify(s)}`);
    await ve(p, 'p3'); await p.waitForTimeout(1500);
    await idioma(p, 'en'); await p.waitForTimeout(2500);
    s = await est(p, 'p3'); ok(s.e === 'pause' && s.a === 'Pause', `p3 corriendo sigue corriendo en inglés: ${JSON.stringify(s)}`);
    s = await est(p, 'p2'); ok(s.e === 'play' && s.a === 'Play', `p2 pausada queda pausada en inglés: ${JSON.stringify(s)}`);
    ok(errores.length === 0, 'sin errores de JS ' + errores.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await abre(b, base, { viewport: { width: 1280, height: 800 } });
    await ve(p, 'p1'); await p.waitForTimeout(24500);
    await ve(p, 'p6'); await idioma(p, 'en'); await ve(p, 'p1'); await p.waitForTimeout(2000);
    const s = await est(p, 'p1'); ok(s.e === 'replay' && s.w === 100 && s.a === 'Replay', `p1 vista queda completa al cambiar de idioma: ${JSON.stringify(s)}`);
    await ctx.close();
  }

  console.log('voz, con movimiento');
  {
    const ctx = await b.newContext({ locale: 'es-MX', viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(audioFalso);
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto(base + '/aprende/', { waitUntil: 'load' });
    await ve(p, 'p1'); await p.waitForTimeout(1500);
    let v = await voz(p, 'p1'); ok(!v.oculto && v.puesta === 'false' && v.texto === 'Escuchar', `p1 ofrece Escuchar, apagado: ${JSON.stringify(v)}`);
    await clicVoz(p, 'p1'); await p.waitForTimeout(1200);
    let fr = marco(p, 'p1');
    const datos = await fr.evaluate(() => ({ v: window.VOZ.p1.es, rotulos: window.ROTULOS, fin: window.FIN }));
    await p.evaluate(d => { window.__audio.duration = d; }, datos.v.dura);
    v = await voz(p, 'p1'); let a = await audio(p), s = await est(p, 'p1');
    ok(v.puesta === 'true' && a.src === 'p1-es.m4a' && !a.pausado && s.e === 'pause', `Escuchar pone la voz de la lámina y el botón pasa a Pausa: ${JSON.stringify({ v, a, s })}`);
    ok(await opacidad(fr, 'c1') > 0.9, 'la lámina vuelve a empezar con la voz: se ve el primer rótulo');
    // La espera más larga entre dos rótulos (la del último no sirve: después
    // de ella ya no hay rótulo siguiente que deba entrar). Se mira a media
    // espera: la lámina sigue quieta en el rótulo que la voz está diciendo y
    // el siguiente todavía no entra. Sin la espera, a esa altura el rótulo ya
    // se habría ido. Después de la espera, la lámina sigue.
    const ultimo = datos.rotulos[datos.rotulos.length - 1].t0;
    const espera = datos.v.esperas.filter(e => e[0] < ultimo).sort((x, y) => y[1] - x[1])[0];
    if (espera && espera[1] > 0.8) {
      const k = datos.rotulos.filter(r => r.t0 < espera[0]).length;   // rótulo en pantalla durante esa espera
      const previas = datos.v.esperas.filter(e => e[0] < espera[0]).reduce((n, e) => n + e[1], 0);
      await p.evaluate(t => { window.__audio.currentTime = t; }, espera[0] + previas + espera[1] * 0.25);
      await p.waitForTimeout(150);
      const durante = [await opacidad(fr, 'c' + k), await opacidad(fr, 'c' + (k + 1))];
      const medido = (await audio(p)).t - espera[0] - previas;   // qué tan adentro de la espera se midió
      await p.evaluate(t => { window.__audio.currentTime = t; }, espera[0] + previas + espera[1] + 1.2);
      await p.waitForTimeout(250);
      const despues = [await opacidad(fr, 'c' + k), await opacidad(fr, 'c' + (k + 1))];
      ok(medido > 0 && medido < espera[1] && durante[0] > 0.9 && durante[1] < 0.1 && despues[0] < 0.1 && despues[1] > 0.5,
        `la lámina espera a la voz en el rótulo ${k} (${espera[1]} s, medido a los ${medido.toFixed(2)} s) y luego sigue: ${JSON.stringify({ durante, despues })}`);
    } else console.log('  OMITIDA la espera: voz.js no trae ninguna de más de 0.8 s entre dos rótulos de p1');
    await clic(p, 'p1'); await p.waitForTimeout(300);
    a = await audio(p); s = await est(p, 'p1'); ok(a.pausado && s.e === 'play', `el botón principal pausa la voz: ${JSON.stringify({ a, s })}`);
    await fr.evaluate(() => document.getElementById('stage').click()); await p.waitForTimeout(300);
    a = await audio(p); s = await est(p, 'p1'); ok(!a.pausado && s.e === 'pause', `un toque en la lámina la reanuda: ${JSON.stringify({ a, s })}`);
    // La voz se pausa y se reanuda por fuera de la página (teclas multimedia,
    // audífonos, pantalla de bloqueo): la barra la sigue igual. La lámina
    // avanza en la misma función que la barra; aquí solo se mira la barra.
    await p.evaluate(() => window.__audio.pause()); await p.waitForTimeout(300);
    await p.evaluate(() => window.__audio.play()); await p.waitForTimeout(200);
    const b0 = (await est(p, 'p1')).w;
    await p.evaluate(() => { window.__audio.currentTime += 2.5; }); await p.waitForTimeout(400);
    const b1 = (await est(p, 'p1')).w;
    ok(b1 > b0, `reanudada por fuera de la página, la barra sigue a la voz: ${b0}% y ${b1}%`);
    await ve(p, 'p5'); await p.waitForTimeout(1000);
    a = await audio(p); ok(a.pausado, 'la voz se calla al salir de pantalla');
    await ve(p, 'p1'); await p.waitForTimeout(1200);
    a = await audio(p); s = await est(p, 'p1'); ok(a.pausado && s.e === 'play', `y no vuelve a sonar sola al regresar: ${JSON.stringify({ a, s })}`);
    await clic(p, 'p1'); await p.evaluate(() => { window.__audio.currentTime = window.__audio.duration - 0.4; }); await p.waitForTimeout(1200);
    s = await est(p, 'p1'); v = await voz(p, 'p1');
    ok(s.e === 'replay' && s.w === 100 && v.puesta === 'true' && await opacidad(fr, 'c' + datos.rotulos.length) > 0.9, `al terminar la voz queda el diagrama completo con Repetir: ${JSON.stringify(s)}`);
    await clic(p, 'p1'); await p.waitForTimeout(800);
    a = await audio(p); ok(!a.pausado && a.t < 2, `Repetir vuelve a narrar desde el principio: ${JSON.stringify(a)}`);
    // Otra lámina pide la voz: la primera la suelta.
    await ve(p, 'p2'); await p.waitForTimeout(800); await clicVoz(p, 'p2'); await p.waitForTimeout(800);
    a = await audio(p); v = await voz(p, 'p1'); const v2 = await voz(p, 'p2');
    ok(a.src === 'p2-es.m4a' && !a.pausado && v.puesta === 'false' && v2.puesta === 'true', `solo se oye una lámina a la vez: ${JSON.stringify({ a, p1: v.puesta, p2: v2.puesta })}`);
    // Se quita la voz a media lámina: sigue sola y en silencio.
    await clicVoz(p, 'p2'); await p.waitForTimeout(1000);
    a = await audio(p); s = await est(p, 'p2'); const w1 = s.w;
    await p.waitForTimeout(1000); const w2 = (await est(p, 'p2')).w;
    ok(a.pausado && s.e === 'pause' && w2 > w1, `sin voz la lámina sigue sola: ${JSON.stringify({ a, s, w2 })}`);
    // Si el audio no carga, la lámina se queda sin voz y sigue.
    await clicVoz(p, 'p2'); await p.waitForTimeout(500);
    await p.evaluate(() => window.__audio.dispatchEvent(new Event('error'))); await p.waitForTimeout(600);
    v = await voz(p, 'p2'); s = await est(p, 'p2'); ok(v.puesta === 'false' && s.e === 'pause', `si el audio falla, sigue sin voz: ${JSON.stringify({ v, s })}`);
    // Cambio de idioma con la voz puesta.
    await clicVoz(p, 'p2'); await p.waitForTimeout(500);
    await idioma(p, 'en'); await p.waitForTimeout(2500);
    a = await audio(p); v = await voz(p, 'p2');
    ok(a.pausado && v.puesta === 'false' && !v.oculto && v.texto === 'Listen', `al cambiar de idioma la voz se quita y el botón queda en inglés: ${JSON.stringify({ a, v })}`);
    await clicVoz(p, 'p2'); await p.waitForTimeout(600);
    a = await audio(p); ok(a.src === 'p2-en.m4a' && !a.pausado, `en inglés suena la narración en inglés: ${JSON.stringify(a)}`);
    ok(errores.length === 0, 'sin errores de JS ' + errores.join(' | '));
    await ctx.close();
  }
  console.log('voz, movimiento reducido');
  {
    const ctx = await b.newContext({ locale: 'es-MX', viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: 'reduce' });
    await ctx.addInitScript(audioFalso);
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto(base + '/aprende/', { waitUntil: 'load' });
    await ve(p, 'p3'); await p.waitForTimeout(1500);
    const fr = marco(p, 'p3');
    const datos = await fr.evaluate(() => ({ v: window.VOZ.p3.es, rotulos: window.ROTULOS }));
    const ultimo = 'c' + datos.rotulos.length;
    let s = await est(p, 'p3');
    ok(s.e === 'play' && await opacidad(fr, ultimo) > 0.9, `sin pedirla, la lámina espera en el diagrama completo: ${JSON.stringify(s)}`);
    // Escuchar es un toque de la persona: la lámina vuelve a empezar y sigue
    // a la voz, igual que sin movimiento reducido. Antes se quedaba quieta en
    // el diagrama completo y en un iPhone con «Reducir movimiento» parecía
    // rota.
    await clicVoz(p, 'p3'); await p.evaluate(d => { window.__audio.duration = d; }, datos.v.dura); await p.waitForTimeout(1500);
    let a = await audio(p); s = await est(p, 'p3');
    ok(!a.pausado && a.t > 0.5 && s.e === 'pause' && s.w > 0, `la voz suena y la barra avanza: ${JSON.stringify({ a, s })}`);
    ok(await opacidad(fr, 'c1') > 0.9 && await opacidad(fr, ultimo) < 0.1, 'la lámina vuelve a empezar con la voz: se ve el primer rótulo y no el último');
    // Un segundo después de que entra el segundo rótulo, contado en el reloj
    // de la voz (se suman las esperas anteriores).
    const tau = datos.rotulos[1].t0 + 1;
    await p.evaluate(t => { window.__audio.currentTime = t; }, tau + datos.v.esperas.filter(e => e[0] < tau).reduce((n, e) => n + e[1], 0));
    await p.waitForTimeout(250);
    ok(await opacidad(fr, 'c2') > 0.5 && await opacidad(fr, 'c1') < 0.1 && await opacidad(fr, ultimo) < 0.1, 'la lámina sigue a la voz: pasa al segundo rótulo');
    // Un toque en la lámina es de la voz: la pausa y la reanuda.
    await fr.evaluate(() => document.getElementById('stage').click()); await p.waitForTimeout(400);
    a = await audio(p); s = await est(p, 'p3');
    ok(a.pausado && s.e === 'play', `un toque en la lámina pausa la voz: ${JSON.stringify({ a, s })}`);
    await fr.evaluate(() => document.getElementById('stage').click()); await p.waitForTimeout(400);
    a = await audio(p); s = await est(p, 'p3');
    ok(!a.pausado && s.e === 'pause', `otro toque la reanuda: ${JSON.stringify({ a, s })}`);
    // Se quita la voz a media lámina: con movimiento reducido nada sigue solo.
    await clicVoz(p, 'p3'); await p.waitForTimeout(400);
    a = await audio(p); s = await est(p, 'p3'); let v = await voz(p, 'p3');
    const quieta = [await opacidad(fr, 'c2'), await opacidad(fr, ultimo)];
    await p.waitForTimeout(1500);
    const s2 = await est(p, 'p3');
    ok(a.pausado && v.puesta === 'false' && s.e === 'play' && s2.e === 'play' && s2.w === s.w && Math.abs(await opacidad(fr, 'c2') - quieta[0]) < 0.01 && quieta[1] < 0.1,
      `sin voz la lámina se detiene donde iba y no sigue sola: ${JSON.stringify({ a, s, s2, quieta })}`);
    // Si el audio no carga, vuelve a su estado de entrada: diagrama completo con Reproducir.
    await clicVoz(p, 'p3'); await p.waitForTimeout(500);
    await p.evaluate(() => window.__audio.dispatchEvent(new Event('error'))); await p.waitForTimeout(600);
    v = await voz(p, 'p3'); s = await est(p, 'p3');
    ok(v.puesta === 'false' && s.e === 'play' && s.w === 0 && await opacidad(fr, ultimo) > 0.9, `si el audio falla, queda el diagrama completo con Reproducir: ${JSON.stringify({ v, s })}`);
    // La voz llega al final: diagrama completo con Repetir.
    await clicVoz(p, 'p3'); await p.evaluate(d => { window.__audio.duration = d; }, datos.v.dura); await p.waitForTimeout(400);
    await p.evaluate(() => { window.__audio.currentTime = window.__audio.duration - 0.4; }); await p.waitForTimeout(1200);
    s = await est(p, 'p3');
    ok(s.e === 'replay' && s.w === 100 && await opacidad(fr, ultimo) > 0.9, `al terminar la voz queda el diagrama completo con Repetir: ${JSON.stringify(s)}`);
    ok(errores.length === 0, 'sin errores de JS ' + errores.join(' | '));
    await ctx.close();
  }

  console.log('teléfono, movimiento reducido');
  {
    const { ctx, p, errores } = await abre(b, base, { viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: 'reduce' });
    await ve(p, 'p4'); await p.waitForTimeout(1500);
    let s = await est(p, 'p4'); ok(s.e === 'play' && s.w === 0 && s.a === 'Reproducir', `p4 en diagrama completo con Reproducir, sin arrancar: ${JSON.stringify(s)}`);
    const fr = p.frames().find(f => f.url().includes('p4.html'));
    ok(/fmt=m/.test(fr.url()), 'formato de teléfono: ' + fr.url().split('/').pop());
    await clic(p, 'p4'); await p.waitForTimeout(1500);
    s = await est(p, 'p4'); ok(s.e === 'pause' && s.w > 0 && s.w < 20, `el botón la corre desde el inicio: ${JSON.stringify(s)}`);
    await fr.evaluate(() => document.getElementById('stage').click()); await p.waitForTimeout(300);
    s = await est(p, 'p4'); ok(s.e === 'play', `un toque en la lámina la pausa y el botón se entera: ${JSON.stringify(s)}`);
    ok(errores.length === 0, 'sin errores de JS ' + errores.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await abre(b, base, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    await ve(p, 'p5'); await p.waitForTimeout(100); await clic(p, 'p5'); await p.waitForTimeout(1500);
    const s = await est(p, 'p5'); ok(s.e === 'pause' && s.w > 0, `botón antes de que la lámina esté lista: la orden se entrega: ${JSON.stringify(s)}`);
    await ctx.close();
  }

  await b.close(); servidor.close();
  console.log(fallas ? `\n${fallas} FALLAS` : '\nsin fallas');
  process.exit(fallas ? 1 : 0);
})();
