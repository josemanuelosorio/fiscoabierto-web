// Arma una página como la ve el navegador, para que los chequeos estáticos la
// lean entera aunque el CSS y el JS vivan en archivos aparte.
//
// Contrato:
//   entra:   la ruta de un .html
//   sale:    { archivo, html, texto, lineas, origen(i), scripts }
//            html     el archivo tal cual
//            texto    el mismo HTML con cada hoja de estilo local
//                     (<link rel="stylesheet" href="...">) y cada script local
//                     (<script src="..."></script>) sustituidos por su contenido,
//                     en su lugar, dentro de <style> y <script> en líneas propias
//            lineas   texto partido por líneas
//            origen   para la línea i de texto (base 0), dónde vive de verdad:
//                     'js/calculadora.js:12' o 'index.html:40'
//            scripts  los scripts en orden de carga: { etiqueta, codigo, origen }
//                     etiqueta = el comentario <!-- ... --> que lo antecede o,
//                     si no hay, la ruta del archivo
//   no hace: no sigue recursos remotos (fuentes, CDN) ni ejecuta nada.
const fs = require('fs');
const path = require('path');

const RE_LINK = /^(\s*)<link rel="stylesheet" href="([^":]+)">\s*$/;
const RE_SRC = /^(\s*)<script src="([^":]+)"><\/script>\s*$/;
const RE_ETIQUETA = /^\s*<!-- (.+?) -->\s*$/;

function pagina(archivo) {
  archivo = path.resolve(archivo);
  const base = path.dirname(archivo);
  const raiz = path.resolve(__dirname, '..');
  const rel = f => path.relative(raiz, f);
  const html = fs.readFileSync(archivo, 'utf8');
  const lineas = [], origenes = [], scripts = [];

  function empuja(linea, donde) { lineas.push(linea); origenes.push(donde); }
  function enLinea(abre, cierra, ruta) {
    const f = path.join(base, ruta);
    const codigo = fs.readFileSync(f, 'utf8').replace(/\n$/, '');
    empuja(abre, rel(f) + ':0');
    codigo.split('\n').forEach((l, k) => empuja(l, rel(f) + ':' + (k + 1)));
    empuja(cierra, rel(f) + ':fin');
    return { codigo, origen: rel(f) };
  }

  const crudas = html.split('\n');
  let etiqueta = null, enScript = null;
  crudas.forEach((l, k) => {
    const donde = rel(archivo) + ':' + (k + 1);
    let m;
    if ((m = l.match(RE_LINK))) { enLinea('<style>', '</style>', m[2]); return; }
    if ((m = l.match(RE_SRC))) {
      const s = enLinea('<script>', '</script>', m[2]);
      scripts.push({ etiqueta: etiqueta || s.origen, codigo: s.codigo, origen: s.origen });
      etiqueta = null;
      return;
    }
    empuja(l, donde);
    // Scripts en línea: se registran con la misma forma que los de archivo.
    if (l.trim() === '<script>') { enScript = { etiqueta: etiqueta || 'script en ' + donde, desde: k + 1, origen: donde }; return; }
    if (enScript && l.trim() === '</script>') {
      scripts.push({ etiqueta: enScript.etiqueta, codigo: crudas.slice(enScript.desde, k).join('\n'), origen: enScript.origen });
      enScript = null; etiqueta = null;
      return;
    }
    if (!enScript) etiqueta = (l.match(RE_ETIQUETA) || [])[1] || (l.trim() ? null : etiqueta);
  });

  return {
    archivo, html, texto: lineas.join('\n'), lineas,
    origen: i => origenes[i] || '?',
    scripts,
  };
}

module.exports = pagina;
