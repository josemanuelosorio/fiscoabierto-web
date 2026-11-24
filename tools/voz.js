// Comprueba que la narración de /aprende y las láminas vengan de la misma corrida.
//
// La voz de una lámina son tres piezas que tienen que coincidir: los datos de
// aprende/laminas/voz.js (cuánto dura la narración y en qué segundos la lámina
// espera a la voz), el audio de aprende/voz/ que suena en la página y el MP4
// descargable de aprende/videos/. Si se cambia el tiempo de una lámina o se
// vuelve a narrar y falta rehacer una de las tres, la voz y la animación se
// desfasan sin que nada truene. Esto lo detecta.
//
// Uso, desde la raiz del repo:   node tools/voz.js
// Sale con código 1 si algo no coincide. Solo usa node: lee la duración de
// los archivos en sus cajas MP4, sin ffmpeg.
const fs = require('fs'), path = require('path'), vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const lee = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const fallas = [];
const falla = m => fallas.push(m);

// Recorre las cajas de un MP4 (o M4A): tamaño de 4 bytes, tipo de 4 letras y contenido.
function cajas(buf, desde, hasta, visita) {
  let p = desde;
  while (p + 8 <= hasta) {
    let tam = buf.readUInt32BE(p), cab = 8;
    const tipo = buf.toString('latin1', p + 4, p + 8);
    if (tam === 1) { tam = Number(buf.readBigUInt64BE(p + 8)); cab = 16; }
    if (tam < cab) break;
    visita(tipo, p + cab, p + tam);
    p += tam;
  }
}
// Duración en segundos (caja mvhd) y si trae pista de sonido (un hdlr de tipo soun).
function medio(archivo) {
  const buf = fs.readFileSync(archivo);
  let dura = null, sonido = false;
  const baja = (ini, fin) => cajas(buf, ini, fin, (tipo, a, b) => {
    if (tipo === 'moov' || tipo === 'trak' || tipo === 'mdia') baja(a, b);
    else if (tipo === 'mvhd') {
      const v = buf.readUInt8(a);
      dura = v === 1 ? Number(buf.readBigUInt64BE(a + 24)) / buf.readUInt32BE(a + 20) : buf.readUInt32BE(a + 16) / buf.readUInt32BE(a + 12);
    } else if (tipo === 'hdlr' && buf.toString('latin1', a + 8, a + 12) === 'soun') sonido = true;
  });
  baja(0, buf.length);
  if (dura === null) throw new Error('sin caja mvhd: ' + archivo);
  return { dura, sonido };
}

// Los datos de la voz, tal como los carga la lámina.
const ctx = { window: {} };
vm.runInNewContext(lee('aprende/laminas/voz.js'), ctx);
const VOZ = ctx.window.VOZ;

// Las láminas de la página y el nombre de su video.
const pagina = lee('aprende/index.html');
const laminas = [...pagina.matchAll(/data-lamina="(\w+)" data-video="([\w-]+)"/g)].map(m => ({ id: m[1], video: m[2] }));
if (!laminas.length) falla('no encontré láminas en aprende/index.html');

const TOL = 0.15;   // segundos: el audio se guarda en bloques de 1024 muestras y el video en cuadros
let revisados = 0;
for (const { id, video } of laminas) {
  const fuente = lee(`aprende/laminas/${id}.html`);
  const fin = Number((fuente.match(/terminar\(([\d.]+)\)/) || [])[1]);
  if (!fin) { falla(`${id}: no encontré terminar(fin)`); continue; }
  if (!/<script src="voz\.js"><\/script>\s*<script src="motor\.js">/.test(fuente)) falla(`${id}: voz.js debe cargarse antes de motor.js`);
  for (const lang of ['es', 'en']) {
    const v = VOZ[id] && VOZ[id][lang];
    const audio = path.join(RAIZ, 'aprende/voz', `${id}-${lang}.m4a`);
    for (const suf of ['', '-m']) {
      const mp4 = path.join(RAIZ, 'aprende/videos', `${video}-${lang}${suf}.mp4`);
      if (!fs.existsSync(mp4)) { falla(`${id} ${lang}: falta ${path.relative(RAIZ, mp4)}`); continue; }
      const m = medio(mp4);
      if (!v) { if (m.sonido) falla(`${id} ${lang}${suf}: el video trae sonido y voz.js no tiene narración`); continue; }
      if (!m.sonido) falla(`${id} ${lang}${suf}: voz.js tiene narración y el video descargable no trae sonido`);
      if (Math.abs(m.dura - v.duraVideo) > TOL) falla(`${id} ${lang}${suf}: el video dura ${m.dura.toFixed(2)} s y voz.js dice ${v.duraVideo}`);
    }
    if (!v) { if (fs.existsSync(audio)) falla(`${id} ${lang}: hay audio y voz.js no lo conoce`); continue; }
    revisados++;
    // Las esperas van en orden, duran algo y caen dentro de la lámina o de su cierre en video.
    let antes = 0, enPagina = 0;
    for (const [en, dura] of v.esperas) {
      if (!(en > antes) || !(dura > 0)) falla(`${id} ${lang}: espera fuera de orden o sin duración (${en}, ${dura})`);
      antes = en;
      if (en <= fin) enPagina += dura;
    }
    // En la página la narración dura lo que la lámina más lo que esperó.
    if (Math.abs(fin + enPagina - v.dura) > 0.02) falla(`${id} ${lang}: la lámina termina en ${fin} s, espera ${enPagina.toFixed(2)} s y voz.js dice que dura ${v.dura}`);
    if (!fs.existsSync(audio)) { falla(`${id} ${lang}: falta ${path.relative(RAIZ, audio)}`); continue; }
    const a = medio(audio);
    if (Math.abs(a.dura - v.dura) > TOL) falla(`${id} ${lang}: el audio dura ${a.dura.toFixed(2)} s y voz.js dice ${v.dura}`);
  }
}
// Un archivo de voz sin lámina que lo use es peso muerto en el repo.
const usados = new Set(laminas.flatMap(l => ['es', 'en'].map(g => `${l.id}-${g}.m4a`)));
for (const f of fs.existsSync(path.join(RAIZ, 'aprende/voz')) ? fs.readdirSync(path.join(RAIZ, 'aprende/voz')) : []) {
  if (!f.startsWith('.') && !usados.has(f)) falla(`aprende/voz/${f}: ninguna lámina lo usa`);
}
if (!revisados) falla('ninguna lámina tiene narración: un chequeo que no revisa nada no es chequeo');

if (fallas.length) { fallas.forEach(m => console.log('  FALLA ' + m)); process.exit(1); }
console.log(`  OK   ${revisados} narraciones coinciden con su lámina, su audio y sus dos videos`);
