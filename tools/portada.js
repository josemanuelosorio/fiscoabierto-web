// Prueba la serie de la portada en Chromium con Playwright:
//   1. la serie en vivo recorre sus escenas y vuelve a la primera;
//   2. con ?demo=video se monta un video mudo, en bucle, sin controles ni foco;
//   3. si el video no puede reproducirse, se quita y corre la serie en vivo;
//   4. en escritorio y con ?demo=js no se monta ningún video;
//   5. con movimiento reducido la serie avanza sin transiciones.
// El Chromium de Playwright no trae H.264, así que el MP4 real falla al
// cargar: eso es justo el caso 3. Que el MP4 se reproduce en un iPhone no se
// prueba aquí: se revisa en el teléfono.
//
// Uso, desde la raíz del repo:   node tools/portada.js     Sale con código 1 si algo falla.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const WEB = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4' };
let fallas = 0;
const dice = (ok, que, extra) => { if (!ok) fallas++; console.log((ok ? '  OK    ' : '  FALLA ') + que + (extra ? ': ' + extra : '')); };

(async () => {
  const srv = http.createServer((q, r) => {
    const p = decodeURIComponent(q.url.split('?')[0]);
    const f = path.join(WEB, p === '/' ? 'index.html' : p);
    if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch();
  const errores = [];
  const abrir = async (q, opc, reloj) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, opc));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    if (reloj) { await p.clock.install({ time: new Date('2026-01-01T12:00:00Z') }); await p.clock.pauseAt(new Date('2026-01-01T12:00:01Z')); }
    await p.goto(q === 'about:blank' ? q : base + q);
    await p.waitForTimeout(q === 'about:blank' ? 0 : 500);
    return p;
  };
  const estado = (p) => p.evaluate(() => window.faSerie.estado());

  // 1. La serie en vivo, con reloj falso: debe pasar por todas las escenas y volver a la primera.
  let p = await abrir('?demo=js&lang=es', {}, true);
  const vistas = new Set(); let volvio = false, antes = 0;
  for (let i = 0; i < 1500 && !volvio; i++) {
    await p.clock.runFor(100);
    const e = await estado(p); vistas.add(e.escena);
    if (e.escena < antes) volvio = true;
    antes = e.escena;
  }
  const total = (await estado(p)).total;
  dice(volvio && vistas.size === total, 'la serie recorre sus ' + total + ' escenas y vuelve a la primera', 'vistas ' + vistas.size);
  dice(await p.evaluate(() => !document.querySelector('.serie-video')), 'con ?demo=js no se monta video');
  await p.context().close();

  // 2. Con ?demo=video se monta el video sin controles. La petición del MP4 se deja colgada para que el
  //    elemento siga ahí al leerlo: aquí el video no puede reproducirse y si fallara se quitaría enseguida.
  p = await abrir('about:blank', {});
  await p.route('**/portada/*.mp4', () => {});
  await p.goto(base + '?demo=video&lang=es');
  await p.waitForTimeout(400);
  const v = await p.evaluate(() => {
    const x = document.querySelector('.serie-video');
    return x && { muted: x.muted, loop: x.loop, controls: x.controls, inline: x.playsInline, foco: x.tabIndex, oculto: x.getAttribute('aria-hidden'), toque: getComputedStyle(x).pointerEvents, src: x.getAttribute('src') };
  });
  dice(!!v, 'con ?demo=video se monta el video');
  if (v) {
    dice(v.muted && v.loop && v.inline && !v.controls, 'el video va mudo, en bucle, en línea y sin controles', JSON.stringify(v));
    dice(v.foco === -1 && v.oculto === 'true' && v.toque === 'none', 'el video no recibe foco ni toque');
    dice(v.src === 'portada/serie-es.mp4', 'el video es el del idioma de la página', v.src);
  }
  // Mientras el video no arranca, la serie en vivo espera 1.2 s y después corre por su cuenta.
  await p.waitForTimeout(2600);
  dice(await p.evaluate(() => !document.querySelector('#serie [data-i18n-js]')), 'si el video tarda, la serie en vivo arranca debajo');
  await p.context().close();

  // 3. Un video que falla al cargar se quita y la serie en vivo toma el relevo. Las piezas que trae el HTML
  //    llevan data-i18n-js y las que pinta la serie no: que ya no quede ninguna dice que la serie pintó.
  p = await abrir('about:blank', {});
  await p.route('**/portada/*.mp4', (r) => r.abort());
  await p.goto(base + '?demo=video&lang=es');
  await p.waitForTimeout(2600);
  dice(await p.evaluate(() => !document.querySelector('.serie-video')), 'un video que no carga se quita');
  dice(await p.evaluate(() => !document.querySelector('#serie [data-i18n-js]')), 'sin video, la serie en vivo toma el relevo');
  await p.context().close();

  // 4. En escritorio no se monta video.
  p = await abrir('?lang=es', { viewport: { width: 1280, height: 800 } });
  dice(await p.evaluate(() => !document.querySelector('.serie-video')), 'en escritorio no se monta video');
  dice(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'la portada no desborda en escritorio');
  await p.context().close();

  // 5. Movimiento reducido: la serie avanza, sin transiciones.
  p = await abrir('?demo=js&lang=es', { reducedMotion: 'reduce' }, true);
  await p.clock.runFor(12000);
  const r = await p.evaluate(() => ({ e: window.faSerie.estado().escena, t: getComputedStyle(document.getElementById('serie')).transitionDuration }));
  dice(r.e >= 1 && r.t === '0s', 'con movimiento reducido la serie avanza sin transiciones', JSON.stringify(r));
  await p.context().close();

  dice(errores.length === 0, 'sin errores de JS', errores.join(' | '));
  await b.close(); srv.close();
  console.log(fallas ? fallas + ' fallas' : 'sin fallas');
  process.exit(fallas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
