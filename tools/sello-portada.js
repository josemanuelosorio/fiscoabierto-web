// El sello del video de portada: una huella de lo que el video muestra. La usan
// tools/render-portada.js, que la guarda al renderizar, y tools/unitarias.js,
// que avisa cuando el video ya no corresponde a la serie en vivo.
// Entran el script de la serie, el cálculo de retención y los textos de la
// serie (las claves serie.*); no entran el titular ni el CSS, así que un cambio de estilo de la serie
// pide volver a renderizar a mano.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WEB = path.join(__dirname, '..');

function selloPortada() {
  const h = crypto.createHash('sha256');
  for (const f of ['js/portada.js', 'js/retencion.js']) h.update(fs.readFileSync(path.join(WEB, f)));
  const textos = fs.readFileSync(path.join(WEB, 'js/datos/traducciones.js'), 'utf8').split('\n').filter((l) => /^\s*'serie\./.test(l));
  if (!textos.length) throw new Error('no se encontraron los textos de la serie en traducciones.js');
  h.update(textos.join('\n'));
  return h.digest('hex');
}
module.exports = selloPortada;
