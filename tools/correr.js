// Corre los chequeos del sitio y resume cuáles pasaron.
//
// Grupos:
//   node        solo necesitan node: unitarias, arranque, cifras, idioma, CSS
//               muerto, tuteo
//   navegador   necesitan Playwright (Chromium) o html-validate: calculadora,
//               idioma en el DOM real y validación HTML
//   laminas     los controles de las láminas de /aprende (tres minutos;
//               intermitente por tiempos, ver tools/README.md)
//
// Uso, desde web/:   node tools/correr.js node [navegador] [laminas]
// Corre todos los chequeos del grupo aunque alguno falle, para ver el cuadro
// completo, y sale con código 1 si falló al menos uno.
const { spawnSync } = require('child_process');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const LAMINAS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(p => `aprende/laminas/${p}.html`);

const GRUPOS = {
  node: [
    ['node', 'tools/unitarias.js'],
    ['node', 'tools/smoke.js'],
    ['node', 'tools/smoke.js', 'aprende/index.html'],
    ['node', 'tools/cifras.js'],
    ['node', 'tools/cifras.js', 'aprende/index.html'],
    ['node', 'tools/i18n.js'],
    ['node', 'tools/i18n.js', 'aprende/index.html'],
    ['node', 'tools/css-muerto.js'],
    ['node', 'tools/css-muerto.js', 'aprende/index.html'],
    ['node', 'tools/usted.js'],
  ],
  navegador: [
    ['npx', 'html-validate', 'index.html', 'aprende/index.html', ...LAMINAS],
    ['node', 'tools/calc-goldens.js'],
    ['node', 'tools/i18n.js', '--dom'],
    ['node', 'tools/i18n.js', 'aprende/index.html', '--dom'],
  ],
  laminas: [
    ['node', 'tools/laminas.js'],
  ],
};

const pedidos = process.argv.slice(2);
if (!pedidos.length || pedidos.some(g => !GRUPOS[g])) {
  console.error('Uso: node tools/correr.js node [navegador] [laminas]');
  process.exit(2);
}

const resultados = [];
for (const grupo of pedidos) {
  for (const [cmd, ...args] of GRUPOS[grupo]) {
    const nombre = [cmd === 'node' ? '' : cmd, ...args].join(' ').trim();
    const r = spawnSync(cmd, args, { cwd: RAIZ, encoding: 'utf8' });
    const ok = r.status === 0;
    resultados.push({ nombre, ok });
    if (!ok) {
      // Solo se muestra la salida de lo que falló: lo que pasó ya está en el resumen.
      console.log(`\n--- ${nombre} (código ${r.status})`);
      console.log(((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-25).join('\n'));
    }
  }
}

console.log('\nResumen:');
for (const { nombre, ok } of resultados) console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${nombre}`);
const fallas = resultados.filter(r => !r.ok).length;
console.log(fallas ? `\n${fallas} de ${resultados.length} chequeos fallaron.` : `\nLos ${resultados.length} chequeos pasaron.`);
process.exit(fallas ? 1 : 0);
