(function() {
    // Contrato: cuando aparecen los resultados, lee las plataformas
    // seleccionadas del DOM y dibuja TU mapa: tus plataformas conectadas
    // por hilos al nodo SAT, con el aro del color de tu nivel.
    const results = document.getElementById('results');
    const holder = document.getElementById('expo-map');
    if (!results || !holder) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const LEVEL_COLORS = { 'risk-alto': '#FCA5A5', 'risk-medio': '#FCD34D', 'risk-bajo': '#86EFAC' };

    function chipLabel(btn) {
        const t = btn.textContent.replace(/\s+/g, ' ').trim();
        return t.length > 15 ? t.slice(0, 14) + '…' : t;
    }
    function el(name, attrs) {
        const n = document.createElementNS(svgNS, name);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        return n;
    }
    function build() {
        holder.innerHTML = '';
        holder.classList.remove('drawn');
        const sel = Array.prototype.slice.call(document.querySelectorAll('.platform-btn.selected'));
        if (!sel.length) return;
        const labels = sel.slice(0, 5).map(chipLabel);
        if (sel.length > 5) labels.push('+' + (sel.length - 5));
        const banner = document.getElementById('risk-banner');
        let ring = '#5EEAD4';
        for (const cls in LEVEL_COLORS) {
            if (banner && banner.classList.contains(cls)) ring = LEVEL_COLORS[cls];
        }
        const W = 400, H = 168, chipH = 26, satW = 74, satH = 32;
        const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
        const perRow = labels.length > 3 ? Math.ceil(labels.length / 2) : labels.length;
        const rows = labels.length > 3 ? 2 : 1;
        const satX = W / 2, satY = H - satH - 2;
        labels.forEach(function(text, i) {
            const row = Math.floor(i / perRow);
            const inRow = Math.min(perRow, labels.length - row * perRow);
            const col = i % perRow;
            const cw = Math.max(9 * text.length + 20, 44);
            const gap = (W - 16) / inRow;
            const cx = 8 + gap * (col + 0.5);
            const cy = 8 + row * (chipH + 14);
            const x = cx - cw / 2;
            svg.appendChild(el('rect', { x: x.toFixed(1), y: cy, rx: chipH / 2, width: cw.toFixed(1), height: chipH, 'class': 'em-chip' }));
            const label = el('text', { x: cx.toFixed(1), y: cy + 17, 'text-anchor': 'middle', 'class': 'em-label' });
            label.textContent = text;
            svg.appendChild(label);
            const y1 = cy + chipH;
            const dy = Math.max(18, (satY - y1) * 0.45);
            const thread = el('path', {
                d: 'M ' + cx.toFixed(1) + ' ' + y1 + ' C ' + cx.toFixed(1) + ' ' + (y1 + dy).toFixed(1) +
                   ', ' + satX + ' ' + (satY - dy).toFixed(1) + ', ' + satX + ' ' + satY,
                pathLength: '1', 'class': 'em-thread'
            });
            thread.style.transitionDelay = (0.08 * i).toFixed(2) + 's';
            svg.appendChild(thread);
        });
        svg.appendChild(el('rect', { x: satX - satW / 2, y: satY, rx: satH / 2, width: satW, height: satH, 'class': 'em-sat', stroke: ring, 'stroke-width': '2' }));
        const satLabel = el('text', { x: satX, y: satY + 21, 'text-anchor': 'middle', 'class': 'em-sat-label' });
        satLabel.textContent = 'SAT';
        svg.appendChild(satLabel);
        holder.appendChild(svg);
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { holder.classList.add('drawn'); });
        });
    }
    const mo = new MutationObserver(function() {
        if (results.classList.contains('active')) { build(); }
    });
    mo.observe(results, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('idioma', function() { if (results.classList.contains('active')) build(); });
})();
