// Corre los scripts del sitio contra un DOM de mentiras. No valida diseño:
// valida que el camino de arranque no truene. Es el chequeo que node --check
// no puede hacer, porque un identificador libre es sintaxis valida.
//
// Los scripts de una pagina corren en orden y en un mismo contexto global,
// como en el navegador: un script ve lo que declararon los anteriores (por
// ejemplo, tramites.js usa el faPlazo de plazos.js), y si uno truena los
// siguientes corren igual. Cada uno se reporta con su rotulo <!-- ... -->.
//
// Uso, desde la raiz del repo:
//   node tools/smoke.js              los scripts de index.html, en linea o en js/
//   node tools/smoke.js otro.html    lo mismo sobre otro archivo html
//   node tools/smoke.js archivo.js   un script suelto, en un contexto propio
// Un bloque vacio cuenta como FALLA: un sed con el rotulo equivocado no debe
// pasar en silencio.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const pagina = require('./pagina');
function el(cls) {
  return {
    className: cls || '', classList: { add(){}, remove(){}, toggle(){return false}, contains(){return false} },
    style: { setProperty(){} }, children: [], firstChild: null, textContent: '', innerHTML: '',
    // dataset devuelve '' para cualquier data-* que el script pida: el DOM real
    // solo entrega elementos que SI traen el atributo, el stub no discrimina.
    dataset: new Proxy({}, { get: (o, k) => (k in o ? o[k] : '') }),
    offsetHeight: 700, offsetWidth: 900, clientWidth: 900, clientHeight: 700, width: 900, height: 700,
    getBoundingClientRect: () => ({top:100,bottom:400,left:0,right:900,width:900,height:300}),
    querySelector: () => el(), querySelectorAll: () => [el(),el(),el()],
    appendChild(c){ this.children.push(c); return c; }, removeChild(){}, insertBefore(){}, setAttribute(){}, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, closest: () => el(), focus(){}, blur(){},
    getContext: () => ({ clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){}, fill(){}, setTransform(){} }),
    getAttribute(){return null},
    get parentNode(){ return el('padre-de-mentiras'); },
    get parentElement(){ return el('padre-de-mentiras'); },
    get nextSibling(){ return null; },
    scrollWidth: 900, scrollLeft: 0
  };
}
const doc = {
  documentElement: el('html'), head: el('head'), body: el('body'), title: '',
  getElementById: () => el('trust-chain'),
  querySelector: () => el(), querySelectorAll: () => [el(),el(),el(),el(),el(),el()],
  createElement: () => el(), createElementNS: () => el(),
  addEventListener(){}, dispatchEvent(){}, fonts: { ready: { then(){} } }
};
function contexto() {
const win = {
  innerHeight: 900, innerWidth: 1440, scrollY: 0, devicePixelRatio: 2,
  location: { search: '', hash: '', pathname: '/', href: 'https://fiscoabierto.org/' },
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  navigator: { language: 'es-MX', languages: ['es-MX'], userAgent: 'humo' },
  matchMedia: () => ({ matches:false, addEventListener(){}, addListener(){} }),
  getComputedStyle: () => ({ getPropertyValue: () => '0.93', position: 'sticky', alignItems: 'center' }),
  // Corre el primer frame en el acto (es el que revienta si algo falta) y
  // deja de encolar despues de unos cuantos: un loop de dibujo real se
  // re-encola solo y aqui no hay reloj que lo corte.
  requestAnimationFrame: cb => { if (win._frames++ < 4) cb(win._frames * 16); return 1; }, cancelAnimationFrame(){},
  _frames: 0,
  addEventListener(){}, ResizeObserver: function(){ this.observe = function(){}; },
  IntersectionObserver: function(){ this.observe = function(){}; },
  MutationObserver: function(){ this.observe = function(){}; this.disconnect = function(){}; }
};
// Lo que el navegador da y node no pone en un contexto nuevo.
Object.assign(win, { console, URLSearchParams, URL, CustomEvent, Event, performance, setTimeout: () => 0, clearTimeout(){} });
win.window = win; win.self = win; win.document = doc;
return vm.createContext(win);
}

function corre(ctx, nombre, src) {
  ctx._frames = 0;
  if (!src.trim()) {
    console.log('  FALLA ' + nombre + ': bloque vacio (rotulo mal escrito o script borrado)');
    process.exitCode = 1;
    return;
  }
  try {
    vm.runInContext(src, ctx, { filename: nombre });
    console.log('  OK   ' + nombre + ': el arranque corre sin reventar');
  } catch (e) {
    console.log('  FALLA ' + nombre + ': ' + e.constructor.name + ' -> ' + e.message);
    process.exitCode = 1;
  }
}

const arg = process.argv[2];
if (arg && !/\.html?$/.test(arg)) {
  corre(contexto(), arg.split('/').pop(), fs.readFileSync(arg, 'utf8'));
} else {
  const { scripts } = pagina(arg || path.join(__dirname, '..', 'index.html'));
  const ctx = contexto();
  scripts.forEach(s => corre(ctx, s.etiqueta, s.codigo));
  if (!scripts.length) { console.log('  FALLA no encontre ningun script'); process.exitCode = 1; }
}
