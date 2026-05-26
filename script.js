let W = 1000, H = 800;
const DPR = window.devicePixelRatio || 1;
const cbg = document.getElementById('c-bg');
const cdraw = document.getElementById('c-draw');
const cout = document.getElementById('c-out');
const bctx = cbg.getContext('2d');
const dctx = cdraw.getContext('2d');
const octx = cout.getContext('2d');

[cbg, cdraw, cout].forEach(c => {
  c.width = W * DPR;
  c.height = H * DPR;
});
[bctx, dctx, octx].forEach(c => c.scale(DPR, DPR));
bctx.fillStyle = '#1c3d2a';
bctx.fillRect(0, 0, W, H);

let bgImg = null, imgOp = 0.28, imgHidden = false;
let mode = 'draw', color = '#e8dcc0', brushSz = 8;
let strokes = [], current = null, drawing = false;
let generated = false;

const btnToggle = document.getElementById('btn-img-toggle');
const btnRemove = document.getElementById('btn-img-remove');

function setImgControls(hasImg) {
  btnToggle.hidden = !hasImg;
  btnRemove.hidden = !hasImg;
}

/* BG IMAGE */
document.getElementById('img-input').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    bgImg = img; imgHidden = false;
    btnToggle.textContent = 'ocultar';
    setImgControls(true);
    drawBg();
  };
  img.src = url;
});
document.getElementById('img-op').addEventListener('input', e => {
  imgOp = e.target.value / 100; drawBg();
});
btnToggle.addEventListener('click', () => {
  imgHidden = !imgHidden;
  btnToggle.textContent = imgHidden ? 'mostrar' : 'ocultar';
  drawBg();
});
btnRemove.addEventListener('click', () => {
  bgImg = null; imgHidden = false;
  document.getElementById('img-input').value = '';
  btnToggle.textContent = 'ocultar';
  setImgControls(false);
  drawBg();
});
function drawBg() {
  bctx.fillStyle = '#1c3d2a';
  bctx.fillRect(0, 0, W, H);
  if (!bgImg || imgHidden) return;
  const sc = Math.min(W / bgImg.width, H / bgImg.height);
  const sw = bgImg.width * sc, sh = bgImg.height * sc;
  bctx.globalAlpha = imgOp;
  bctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
  bctx.globalAlpha = 1;
}

/* ORIENTATION */
function setOrientation(landscape) {
  W = landscape ? 1000 : 800;
  H = landscape ? 800 : 1000;
  [cbg, cdraw, cout].forEach(c => { c.width = W * DPR; c.height = H * DPR; });
  [bctx, dctx, octx].forEach(c => c.scale(DPR, DPR));
  strokes = []; generated = false; imgHidden = false;
  btnToggle.textContent = 'ocultar';
  cdraw.style.display = 'block';
  drawBg();
  dctx.clearRect(0, 0, W, H);
  octx.clearRect(0, 0, W, H);
  document.getElementById('state-label').textContent = 'modo dibujo';
  const frame = document.querySelector('.canvas-frame');
  frame.classList.toggle('landscape', landscape);
  frame.classList.toggle('portrait', !landscape);
}
document.getElementById('btn-landscape').addEventListener('click', () => {
  setOrientation(true);
  document.getElementById('btn-landscape').classList.add('active');
  document.getElementById('btn-portrait').classList.remove('active');
});
document.getElementById('btn-portrait').addEventListener('click', () => {
  setOrientation(false);
  document.getElementById('btn-portrait').classList.add('active');
  document.getElementById('btn-landscape').classList.remove('active');
});

/* CONTROLS */
document.getElementById('btn-draw').addEventListener('click', () => {
  mode = 'draw';
  document.getElementById('btn-draw').classList.add('active');
  document.getElementById('btn-erase').classList.remove('active');
  cdraw.style.cursor = 'crosshair';
});
document.getElementById('btn-erase').addEventListener('click', () => {
  mode = 'erase';
  document.getElementById('btn-erase').classList.add('active');
  document.getElementById('btn-draw').classList.remove('active');
  cdraw.style.cursor = 'cell';
});
document.getElementById('btn-clear').addEventListener('click', () => {
  strokes = [];
  dctx.clearRect(0, 0, W, H);
  octx.clearRect(0, 0, W, H);
  showDrawMode();
});
document.getElementById('brush-size').addEventListener('input', e => {
  brushSz = +e.target.value;
  document.getElementById('bval').textContent = brushSz;
});
document.getElementById('fsize').addEventListener('input', e => {
  document.getElementById('fval').textContent = e.target.value;
});
document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
    sw.classList.add('sel');
    color = sw.dataset.c;
  });
});

/* DRAW */
function getPos(e) {
  const r = cdraw.getBoundingClientRect();
  const sx = W / r.width, sy = H / r.height;
  const t = e.touches ? e.touches[0] : e;
  return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
}
function startDraw(e) {
  e.preventDefault();
  if (generated) return;
  drawing = true;
  const p = getPos(e);
  if (mode === 'erase') { eraseAt(p); }
  else { current = { pts: [p], color: color, size: brushSz }; strokes.push(current); renderStrokes(); }
}
function moveDraw(e) {
  e.preventDefault();
  if (!drawing || generated) return;
  const p = getPos(e);
  if (mode === 'erase') { eraseAt(p); }
  else { current.pts.push(p); renderStrokes(); }
}
function endDraw(e) { e.preventDefault(); drawing = false; current = null; }

function eraseAt(p) {
  const r = brushSz * 2.5;
  strokes = strokes.filter(s => !s.pts.some(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < r));
  renderStrokes();
}
function renderStrokes() {
  dctx.clearRect(0, 0, W, H);
  for (const s of strokes) {
    if (s.pts.length < 2) continue;
    dctx.beginPath();
    dctx.strokeStyle = s.color;
    dctx.lineWidth = s.size;
    dctx.lineCap = 'round';
    dctx.lineJoin = 'round';
    dctx.globalAlpha = 0.45;
    dctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++)dctx.lineTo(s.pts[i].x, s.pts[i].y);
    dctx.stroke();
    dctx.globalAlpha = 1;
  }
}

cdraw.addEventListener('mousedown', startDraw);
cdraw.addEventListener('mousemove', moveDraw);
cdraw.addEventListener('mouseup', endDraw);
cdraw.addEventListener('mouseleave', endDraw);
cdraw.addEventListener('touchstart', startDraw, { passive: false });
cdraw.addEventListener('touchmove', moveDraw, { passive: false });
cdraw.addEventListener('touchend', endDraw, { passive: false });

/* GENERATE */
document.getElementById('btn-gen').addEventListener('click', generate);
document.getElementById('btn-back').addEventListener('click', () => {
  octx.clearRect(0, 0, W, H);
  showDrawMode();
});

function showDrawMode() {
  generated = false;
  cdraw.style.display = 'block';
  document.getElementById('state-label').textContent = 'modo dibujo';
}
function showGenMode() {
  generated = true;
  cdraw.style.display = 'none'; /* ocultar trazos */
  document.getElementById('state-label').textContent = 'caligrama generado';
}

function rep(s, n) { let r = ''; while (r.length < n) r += s; return r; }

function charsOnPts(pts, text, spacing) {
  if (pts.length < 2) return [];
  const chars = [];
  let px = pts[0].x, py = pts[0].y, seg = 0, dist = 0;
  const totalLen = pts.reduce((a, p, i) => i === 0 ? 0 : a + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y), 0);
  const str = rep(text, totalLen * 3 + 200);
  let ci = 0;
  while (seg < pts.length - 1) {
    // avanzar spacing
    let rem = spacing;
    while (rem > 0 && seg < pts.length - 1) {
      const nx = pts[seg + 1].x, ny = pts[seg + 1].y;
      const d = Math.hypot(nx - px, ny - py);
      if (d <= rem) { rem -= d; px = nx; py = ny; seg++; }
      else { const t = rem / d; px += (nx - px) * t; py += (ny - py) * t; rem = 0; }
    }
    if (seg >= pts.length - 1) break;
    const nx = pts[Math.min(seg + 1, pts.length - 1)].x;
    const ny = pts[Math.min(seg + 1, pts.length - 1)].y;
    const angle = Math.atan2(ny - py, nx - px);
    chars.push({ x: px, y: py, angle, ch: str[ci % str.length] });
    ci++;
    dist += spacing;
    if (dist > totalLen) break;
  }
  return chars;
}

function generate() {
  const text = (document.getElementById('poem').value.trim() || 'texto · ') + ' ';
  const fs = +document.getElementById('fsize').value;
  const spacing = fs * 0.86;

  octx.clearRect(0, 0, W, H);
  octx.font = `italic ${fs}px 'IM Fell DW Pica',Georgia,serif`;
  octx.textBaseline = 'middle';

  for (const s of strokes) {
    if (s.pts.length < 2) continue;
    const chars = charsOnPts(s.pts, text, spacing);
    // capa 1: ligeramente desplazada, más transparente → da sensación de hilo doble
    octx.fillStyle = s.color;
    octx.globalAlpha = 0.45;
    for (const c of chars) {
      octx.save();
      octx.translate(c.x + 1, c.y + 0.6);
      octx.rotate(c.angle);
      octx.fillText(c.ch, 0, 0);
      octx.restore();
    }
    // capa 2: principal
    octx.globalAlpha = 0.9;
    for (const c of chars) {
      octx.save();
      octx.translate(c.x, c.y);
      octx.rotate(c.angle);
      octx.fillText(c.ch, 0, 0);
      octx.restore();
    }
    octx.globalAlpha = 1;
  }

  showGenMode();
}

/* EXPORT HTML */
document.getElementById('btn-dl').addEventListener('click', () => {
  const text = (document.getElementById('poem').value.trim() || 'texto · ') + ' ';
  const fs = +document.getElementById('fsize').value;

  // construir SVG con textPath por cada trazo
  const svgW = W, svgH = H;
  let pathDefs = '', textEls = '';

  strokes.forEach((s, i) => {
    if (s.pts.length < 2) return;
    // construir el path d= desde los puntos
    const d = 'M' + s.pts.map((p, j) => (j === 0 ? '' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const pid = 'p' + i;
    pathDefs += `<path id="${pid}" d="${d}" fill="none"/>\n`;
    textEls += `<text font-family="'IM Fell DW Pica',Georgia,serif" font-style="italic" font-size="${fs}" fill="${s.color}">`;
    textEls += `<textPath href="#${pid}" startOffset="0%">${rep(text, s.pts.length * fs)}</textPath>`;
    textEls += `</text>\n`;
  });

  const bgColor = '#1c3d2a';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>caligrama</title>
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+DW+Pica:ital@0;1&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:${bgColor}; display:flex; justify-content:center; align-items:center; min-height:100vh; }
svg { max-width:100%; height:auto; display:block; }
</style>
</head>
<body>
<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${svgW}" height="${svgH}" fill="${bgColor}"/>
  <defs>
${pathDefs}  </defs>
${textEls}</svg>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.download = 'caligrama.html';
  a.href = URL.createObjectURL(blob);
  a.click();
});