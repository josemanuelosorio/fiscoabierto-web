'use strict';
/*
 * render-portada.js
 *
 * Contrato:
 *   entra:   el sitio (index.html, css/sitio.css, js/portada.js, js/retencion.js, js/datos/traducciones.js, fonts/)
 *   sale:    portada/serie-es.mp4, portada/serie-en.mp4 y portada/serie.json, el sello de lo renderizado
 *   hace:    corre la serie real de la portada con un reloj falso, avanza 1/FPS s por fotograma, fija las
 *            transiciones CSS en su punto exacto, fotografía la caja de la serie y une los cuadros con ffmpeg.
 *            Graba una vuelta completa, de un cambio de escena al mismo cambio, para que el video repita sin salto.
 *   no hace: no toca el sitio fuera de portada/. No decide cuándo se usa el video (eso es js/portada.js).
 *
 * Es el método de la portada de Anonmydoc (herramientas/render-demo.js), adaptado.
 * Requiere playwright y ffmpeg. CHROMIUM_PATH elige otro Chromium que el de Playwright.
 * Uso, desde la raíz del repo:
 *   node tools/render-portada.js [--solo=es|en] [--escala=2] [--crf=33] [--conservar]
 *   node tools/render-portada.js --medir     solo mide el alto de cada escena por ancho e idioma, sin renderizar
 * Hay que correrlo de nuevo cuando cambian js/portada.js, js/retencion.js, los textos 'serie.*' o los estilos
 * de la serie. tools/unitarias.js avisa de los tres primeros.
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const selloPortada = require('./sello-portada');

const WEB = path.resolve(__dirname, '..');
const SALIDA = path.join(WEB, 'portada');
const FPS = 30;
const VIEWPORT = { width: 390, height: 844 };
const bandera = (n, def) => ((process.argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1] || def);
const ESCALA = +bandera('escala', '2');
const CRF = String(bandera('crf', '33'));
const CONSERVAR = process.argv.includes('--conservar');
const IDIOMAS = ['es', 'en'];
const RELOJ = new Date('2026-01-01T12:00:00Z'); // la serie no muestra fechas: cualquier instante sirve
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4' };

function servir() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      const p = decodeURIComponent(q.url.split('?')[0]);
      const f = path.join(WEB, p === '/' ? 'index.html' : p);
      if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

/** Fija cada transición CSS en el instante que le toca; el reloj falso solo mueve los temporizadores. */
const INYECTAR = () => {
  const ini = new WeakMap();
  window.__sync = (T) => {
    for (const a of document.getAnimations()) {
      const blanco = a.effect && a.effect.target;
      if (!blanco || !blanco.closest || !blanco.closest('.hero')) continue; // el resto de la página tiene animaciones ligadas al scroll
      if (!ini.has(a)) ini.set(a, T - 16); // nació en el paso anterior: se le da la mitad del paso
      const fin = a.effect.getComputedTiming().endTime;
      a.pause();
      a.currentTime = Math.min(T - ini.get(a), Number.isFinite(fin) ? fin : Infinity);
    }
  };
};

async function abrir(browser, url, vista) {
  const ctx = await browser.newContext({ viewport: vista, deviceScaleFactor: ESCALA, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  // El reloj queda detenido antes de cargar la página: la serie arranca en T = 0 y solo avanza con runFor.
  await page.clock.install({ time: RELOJ });
  await page.clock.pauseAt(new Date(RELOJ.getTime() + 1000));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(INYECTAR);
  await page.waitForTimeout(600); // que el observador de entrada a pantalla arranque la serie
  return { ctx, page };
}

async function renderizar(browser, url, dir) {
  const { ctx, page } = await abrir(browser, url, VIEWPORT);
  const clip = await page.evaluate(() => {
    const r = document.querySelector('.hero-serie').getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const estado = () => page.evaluate(() => window.faSerie.estado());
  let T = 0;
  const avanzar = async (n) => {
    const destino = Math.round((n * 1000) / FPS);
    if (destino > T) await page.clock.runFor(destino - T);
    T = destino;
    await page.evaluate((t) => window.__sync(t), T);
  };
  // La primera vuelta arranca con la escena del HTML ya completa, sin fundido de entrada: no sirve de inicio.
  // Se avanza sin fotografiar hasta que la serie vuelve a la primera escena, y desde ese cuadro se graba una vuelta.
  let n = 0;
  let antes = (await estado()).escena;
  for (;; n++) {
    await avanzar(n);
    const e = (await estado()).escena;
    if (e < antes) break;
    antes = e;
    if (n > FPS * 150) throw new Error('la serie no completó su primera vuelta en 150 s');
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let cuadros = 0;
  antes = 0;
  for (;; n++, cuadros++) {
    if (cuadros) await avanzar(n);
    const e = (await estado()).escena;
    if (e < antes) break; // volvió a la primera escena: ese cuadro es el primero de la vuelta siguiente
    antes = e;
    await page.screenshot({ path: path.join(dir, 'f' + String(cuadros).padStart(5, '0') + '.png'), clip, fullPage: true, animations: 'allow', caret: 'initial' });
    if (cuadros > FPS * 150) throw new Error('la vuelta grabada pasa de 150 s');
  }
  await ctx.close();
  return { cuadros, clip };
}

function codificar(dir, salida) {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.0', '-preset', 'slow', '-tune', 'animation', '-crf', CRF,
    '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', '-an', salida,
  ]);
}

async function medir(browser, base) {
  for (const lang of IDIOMAS) for (const w of [320, 360, 390, 430, 560, 900, 1280]) {
    const { ctx, page } = await abrir(browser, base + '?demo=js&lang=' + lang, { width: w, height: 844 });
    let max = 0, antes = 0;
    for (let i = 0; i < 1500; i++) {
      await page.clock.runFor(100);
      const r = await page.evaluate(() => ({ h: document.getElementById('serie').firstElementChild.getBoundingClientRect().height, e: window.faSerie.estado().escena }));
      max = Math.max(max, r.h);
      if (r.e < antes) break;
      antes = r.e;
    }
    const caja = await page.evaluate(() => document.getElementById('serie').getBoundingClientRect().height);
    console.log(lang, String(w).padStart(4), 'escena más alta', Math.round(max), '| caja', Math.round(caja), max > caja + 0.5 ? '  <-- la caja brinca' : '');
    await ctx.close();
  }
}

(async () => {
  const server = await servir();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (process.argv.includes('--medir')) { await medir(browser, base); await browser.close(); server.close(); return; }
  const solo = bandera('solo', '');
  fs.mkdirSync(SALIDA, { recursive: true });
  const jsonRuta = path.join(SALIDA, 'serie.json');
  const sello = fs.existsSync(jsonRuta) ? JSON.parse(fs.readFileSync(jsonRuta, 'utf8')) : {};
  sello.entradas = selloPortada();
  sello.fps = FPS;
  sello.archivos = sello.archivos || {};
  for (const lang of solo ? [solo] : IDIOMAS) {
    const dir = path.join(os.tmpdir(), 'portada-cuadros-' + lang);
    const r = await renderizar(browser, base + '?demo=js&lang=' + lang, dir);
    const mp4 = path.join(SALIDA, 'serie-' + lang + '.mp4');
    codificar(dir, mp4);
    if (!CONSERVAR) fs.rmSync(dir, { recursive: true, force: true });
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,duration,nb_frames', '-of', 'json', mp4]).toString()).streams[0];
    sello.archivos[lang] = { escala: ESCALA, crf: +CRF, bytes: fs.statSync(mp4).size, ancho: info.width, alto: info.height, segundos: +(+info.duration).toFixed(2), fotogramas: +info.nb_frames };
    console.log(lang, JSON.stringify(sello.archivos[lang]), 'clip', JSON.stringify(r.clip));
  }
  fs.writeFileSync(jsonRuta, JSON.stringify(sello, null, 2) + '\n');
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
