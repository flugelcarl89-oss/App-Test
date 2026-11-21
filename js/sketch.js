// Fahrzeugskizze: aufgeklappte Draufsicht, Teile werden je Fahrzeugtyp erzeugt
import { typeById } from './data.js';

const W = 360;
const C = { x1: 104, x2: 256 };      // Mitte (Haube, Dach, Heck)
const L = { x1: 28, x2: 96 };        // linke Seite
const R = { x1: 264, x2: 332 };      // rechte Seite
const SL = { x1: 2, x2: 24 };        // Streifen links (Räder, Schweller)
const SR = { x1: 336, x2: 358 };     // Streifen rechts
const GAP = 4;

function rr(x, y, w, h, r) {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r;
  return `M${x + tl},${y}H${x + w - tr}Q${x + w},${y} ${x + w},${y + tr}V${y + h - br}Q${x + w},${y + h} ${x + w - br},${y + h}H${x + bl}Q${x},${y + h} ${x},${y + h - bl}V${y + tl}Q${x},${y} ${x + tl},${y}Z`;
}

function trap(xt1, xt2, xb1, xb2, y, h) {
  return `M${xt1},${y}L${xt2},${y}L${xb2},${y + h}L${xb1},${y + h}Z`;
}

export function doorsOf(a) {
  const t = typeById(a.type);
  return t.doorOptions.includes(a.doors) ? a.doors : t.doors;
}

// Liefert Geometrie + Teiledefinitionen
export function buildLayout(a) {
  const t = typeById(a.type);
  const P = t.prop;
  const doors = doorsOf(a);
  const parts = [];
  const add = (id, label, short, kind, path, box, extra = {}) => parts.push({ id, label, short, kind, path, box, ...extra });
  const cw = C.x2 - C.x1;

  let y = 20;
  // Stoßfänger vorne
  add('bumper_f', 'Stoßfänger vorne', 'Stoßf. vorne', 'paint', rr(C.x1 + 8, y, cw - 16, 30, [18, 18, 4, 4]), { x: C.x1 + 8, y, w: cw - 16, h: 30 }, { material: 'kunststoff' });
  y += 30 + GAP;
  const hoodTop = y;
  add('hood', 'Motorhaube', 'Motorhaube', 'paint', rr(C.x1, y, cw, P.hood, [12, 12, 4, 4]), { x: C.x1, y, w: cw, h: P.hood });
  y += P.hood + GAP;
  // Frontscheibe
  const wsH = 30;
  add('windshield', 'Frontscheibe', 'Frontscheibe', 'glass', trap(C.x1 + 4, C.x2 - 4, C.x1 + 16, C.x2 - 16, y, wsH), { x: C.x1, y, w: cw, h: wsH });
  y += wsH + GAP;
  const fenderBottom = y - GAP - 2;
  // Dach / Verdeck
  const roofTop = y;
  if (t.softtop) add('roof', 'Verdeck', 'Verdeck', 'softtop', rr(C.x1 + 16, y, cw - 32, P.roof, 10), { x: C.x1 + 16, y, w: cw - 32, h: P.roof });
  else add('roof', 'Dach', 'Dach', 'paint', rr(C.x1 + 16, y, cw - 32, P.roof, 8), { x: C.x1 + 16, y, w: cw - 32, h: P.roof });
  y += P.roof + GAP;
  const roofBottom = y - GAP;

  let quarterTop;
  if (t.tail === 'trunk') {
    add('rear_window', 'Heckscheibe', 'Heckscheibe', 'glass', trap(C.x1 + 16, C.x2 - 16, C.x1 + 6, C.x2 - 6, y, 26), { x: C.x1, y, w: cw, h: 26 });
    y += 26 + GAP;
    add('trunk', 'Kofferraumdeckel', 'Kofferraum', 'paint', rr(C.x1 + 2, y, cw - 4, P.tail, [4, 4, 12, 12]), { x: C.x1 + 2, y, w: cw - 4, h: P.tail });
    y += P.tail + GAP;
    quarterTop = doors === 2 ? roofTop + Math.round(P.roof * 0.58) : roofBottom - 10;
  } else if (t.tail === 'hatch') {
    add('rear_window', 'Heckscheibe', 'Heckscheibe', 'glass', trap(C.x1 + 16, C.x2 - 16, C.x1 + 10, C.x2 - 10, y, 22), { x: C.x1, y, w: cw, h: 22 });
    y += 22 + GAP;
    add('tailgate', 'Heckklappe', 'Heckklappe', 'paint', rr(C.x1 + 6, y, cw - 12, P.tail, [4, 4, 12, 12]), { x: C.x1 + 6, y, w: cw - 12, h: P.tail });
    y += P.tail + GAP;
    quarterTop = doors === 2 ? roofTop + Math.round(P.roof * 0.5) : roofBottom - Math.round(P.roof * 0.22);
  } else if (t.tail === 'bed') {
    add('rear_window', 'Heckscheibe', 'Heckscheibe', 'glass', trap(C.x1 + 16, C.x2 - 16, C.x1 + 16, C.x2 - 16, y, 14), { x: C.x1, y, w: cw, h: 14 });
    y += 14 + GAP;
    quarterTop = y;
    add('bed', 'Ladefläche', 'Ladefläche', 'paint', rr(C.x1 + 6, y, cw - 12, P.bed, 4), { x: C.x1 + 6, y, w: cw - 12, h: P.bed });
    y += P.bed + GAP;
    add('tailgate', 'Heckklappe / Bordwand', 'Heckklappe', 'paint', rr(C.x1 + 6, y, cw - 12, 26, [4, 4, 10, 10]), { x: C.x1 + 6, y, w: cw - 12, h: 26 });
    y += 26 + GAP;
  } else if (t.tail === 'barn') {
    const half = (cw - GAP) / 2;
    add('barn_l', 'Hecktür links', 'Hecktür L', 'paint', rr(C.x1, y, half, P.tail, [4, 4, 4, 12]), { x: C.x1, y, w: half, h: P.tail });
    add('barn_r', 'Hecktür rechts', 'Hecktür R', 'paint', rr(C.x1 + half + GAP, y, half, P.tail, [4, 4, 12, 4]), { x: C.x1 + half + GAP, y, w: half, h: P.tail });
    y += P.tail + GAP;
  }
  const bumperRTop = y;
  add('bumper_r', 'Stoßfänger hinten', 'Stoßf. hinten', 'paint', rr(C.x1 + 8, y, cw - 16, 28, [4, 4, 16, 16]), { x: C.x1 + 8, y, w: cw - 16, h: 28 }, { material: 'kunststoff' });
  y += 28;

  // Seiten
  const sideBottom = bumperRTop - GAP;
  if (t.tail === 'barn') quarterTop = roofTop + Math.round(P.roof * 0.62);
  if (doors === 'sliding' && t.tail !== 'barn') quarterTop = roofBottom - Math.round(P.roof * 0.16);
  const cabinTop = fenderBottom + GAP;
  const cabinBottom = quarterTop - GAP;
  const sides = [
    { s: 'l', S: 'L', X: L, name: 'links' },
    { s: 'r', S: 'R', X: R, name: 'rechts' },
  ];
  for (const { s, S, X, name } of sides) {
    const w = X.x2 - X.x1;
    const outerTop = s === 'l' ? [18, 4, 4, 4] : [4, 18, 4, 4];
    const outerBottom = s === 'l' ? [4, 4, 4, 18] : [4, 4, 18, 4];
    add('fender_f' + s, `Kotflügel vorne ${name}`, `Kotflügel V${S}`, 'paint', rr(X.x1, hoodTop, w, fenderBottom - hoodTop, outerTop), { x: X.x1, y: hoodTop, w, h: fenderBottom - hoodTop }, { side: s });
    if (doors === 4) {
      const mid = Math.round(cabinTop + (cabinBottom - cabinTop) * 0.52);
      add('door_f' + s, `Tür vorne ${name}`, `Tür V${S}`, 'paint', rr(X.x1, cabinTop, w, mid - cabinTop - GAP / 2, 4), { x: X.x1, y: cabinTop, w, h: mid - cabinTop - GAP / 2 }, { side: s, door: true });
      add('door_r' + s, `Tür hinten ${name}`, `Tür H${S}`, 'paint', rr(X.x1, mid + GAP / 2, w, cabinBottom - mid - GAP / 2, 4), { x: X.x1, y: mid + GAP / 2, w, h: cabinBottom - mid - GAP / 2 }, { side: s, door: true });
    } else if (doors === 'sliding') {
      const mid = Math.round(cabinTop + (cabinBottom - cabinTop) * 0.4);
      add('door_f' + s, `Tür vorne ${name}`, `Tür V${S}`, 'paint', rr(X.x1, cabinTop, w, mid - cabinTop - GAP / 2, 4), { x: X.x1, y: cabinTop, w, h: mid - cabinTop - GAP / 2 }, { side: s, door: true });
      add('sliding_' + s, `Schiebetür ${name}`, `Schiebetür ${S}`, 'paint', rr(X.x1, mid + GAP / 2, w, cabinBottom - mid - GAP / 2, 4), { x: X.x1, y: mid + GAP / 2, w, h: cabinBottom - mid - GAP / 2 }, { side: s, door: true });
    } else {
      add('door_f' + s, `Tür ${name}`, `Tür ${S}`, 'paint', rr(X.x1, cabinTop, w, cabinBottom - cabinTop, 4), { x: X.x1, y: cabinTop, w, h: cabinBottom - cabinTop }, { side: s, door: true });
    }
    const qLabel = t.tail === 'barn' ? `Seitenwand hinten ${name}` : t.tail === 'bed' ? `Seitenwand Ladefläche ${name}` : `Seitenwand hinten ${name}`;
    add('quarter_r' + s, qLabel, `Seitenw. H${S}`, 'paint', rr(X.x1, quarterTop, w, sideBottom - quarterTop, outerBottom), { x: X.x1, y: quarterTop, w, h: sideBottom - quarterTop }, { side: s });
  }

  // Räder und Schweller in den Außenstreifen
  const wheels = [];
  const fenderMid = (hoodTop + fenderBottom) / 2 + 8;
  const quarterMid = (quarterTop + sideBottom) / 2 + 4;
  const wh = 46;
  for (const { s, S, X } of [{ s: 'l', S: 'L', X: SL }, { s: 'r', S: 'R', X: SR }]) {
    const w = X.x2 - X.x1;
    wheels.push({ id: 'f' + s, short: 'V' + S, x: X.x1, y: fenderMid - wh / 2, w, h: wh });
    wheels.push({ id: 'r' + s, short: 'H' + S, x: X.x1, y: quarterMid - wh / 2, w, h: wh });
    const sy = fenderMid + wh / 2 + GAP;
    const sh = quarterMid - wh / 2 - GAP - sy;
    add('sill_' + s, `Schweller ${s === 'l' ? 'links' : 'rechts'}`, 'Schweller', 'paint', rr(X.x1 + 3, sy, w - 6, sh, 6), { x: X.x1 + 3, y: sy, w: w - 6, h: sh }, { side: s, vertical: true });
  }

  return { width: W, height: y + 20, parts, wheels };
}

// Reihenfolge für den Lack-Rundgang (im Uhrzeigersinn um das Fahrzeug)
export function walkOrder(layout) {
  const order = ['hood', 'fender_fr', 'door_fr', 'sliding_r', 'door_rr', 'sill_r', 'quarter_rr', 'tailgate', 'trunk', 'barn_r', 'barn_l', 'bed',
    'quarter_rl', 'sill_l', 'door_rl', 'sliding_l', 'door_fl', 'fender_fl', 'roof', 'bumper_f', 'bumper_r'];
  const ids = new Set(layout.parts.map((p) => p.id));
  return order.filter((id) => ids.has(id)).map((id) => layout.parts.find((p) => p.id === id));
}

const PALETTE = {
  none: { fill: '#ffffff', stroke: '#b8c0cc', text: '#3a4250' },
  ok: { fill: '#d6f3df', stroke: '#2f9e57', text: '#1b5e34' },
  warn: { fill: '#ffe7a6', stroke: '#d49b00', text: '#6b4d00' },
  bad: { fill: '#ffcccc', stroke: '#d93636', text: '#7a1515' },
  glass: { fill: '#e3f0fc', stroke: '#9dbfe3', text: '#3d5f85' },
  softtop: { fill: '#e9e6f2', stroke: '#a49cc0', text: '#4b4466' },
  wheel: { fill: '#3a3f47', stroke: '#22262b', text: '#ffffff' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * SVG-Text der Skizze.
 * info(partId) → { status: 'none'|'ok'|'warn'|'bad', value: '128 µm', badge: 2 }
 */
export function sketchSVG(a, layout, info, { highlight = null, wheelInfo = null, pdf = false } = {}) {
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" class="sketch-svg" font-family="-apple-system, Helvetica, Arial, sans-serif">`);
  out.push(`<text x="${W / 2}" y="12" text-anchor="middle" class="sk-dir" font-size="9" letter-spacing="2" fill="#8a93a1">VORNE</text>`);
  out.push(`<text x="${W / 2}" y="${layout.height - 5}" text-anchor="middle" class="sk-dir" font-size="9" letter-spacing="2" fill="#8a93a1">HINTEN</text>`);

  for (const w of layout.wheels) {
    const wi = wheelInfo?.(w.id);
    const st = wi?.status && wi.status !== 'none' ? wi.status : null;
    const c = PALETTE.wheel;
    const stroke = st ? PALETTE[st].stroke : c.stroke;
    out.push(`<g class="sk-wheel${st ? ' s-' + st : ''}" data-wheel="${w.id}" role="button" aria-label="Rad ${w.short}">`);
    out.push(`<rect x="${w.x - 6}" y="${w.y - 4}" width="${w.w + 12}" height="${w.h + 8}" fill="transparent"/>`);
    out.push(`<rect class="sk-wheel-body" x="${w.x + 1}" y="${w.y}" width="${w.w - 2}" height="${w.h}" rx="7" fill="${c.fill}" stroke="${stroke}" stroke-width="${st ? 2.5 : 1}"/>`);
    out.push(`<text x="${w.x + w.w / 2}" y="${w.y + w.h / 2 + 3}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${c.text}">${w.short}</text>`);
    out.push('</g>');
  }

  for (const p of layout.parts) {
    const i = info(p.id) || { status: 'none' };
    const pal = i.status && i.status !== 'none' ? PALETTE[i.status] : (p.kind === 'glass' ? PALETTE.glass : p.kind === 'softtop' ? PALETTE.softtop : PALETTE.none);
    const hl = highlight === p.id;
    const cls = `sk-part k-${p.kind} s-${i.status || 'none'}${hl ? ' hl' : ''}`;
    out.push(`<g class="${cls}" data-part="${p.id}" role="button" aria-label="${esc(p.label)}">`);
    if (p.vertical) out.push(`<rect x="${p.box.x - 4}" y="${p.box.y}" width="${p.box.w + 8}" height="${p.box.h}" fill="transparent"/>`);
    out.push(`<path class="sk-shape" d="${p.path}" fill="${pal.fill}" stroke="${hl ? '#0a6cff' : pal.stroke}" stroke-width="${hl ? 3 : 1.4}" stroke-linejoin="round"/>`);
    const cx = p.box.x + p.box.w / 2;
    const cy = p.box.y + p.box.h / 2;
    if (p.vertical) {
      out.push(`<text class="sk-label" x="${cx}" y="${cy}" text-anchor="middle" font-size="8.5" fill="${pal.text}" transform="rotate(-90 ${cx} ${cy})" dy="3">${esc(i.value ? i.value : p.short)}</text>`);
    } else {
      const small = p.box.h < 34;
      const fs = p.box.w < 80 ? 10 : 11;
      if (i.value && !small) {
        out.push(`<text class="sk-label" x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="${fs}" fill="${pal.text}">${esc(p.short)}</text>`);
        out.push(`<text class="sk-value" x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="${fs + 1}" font-weight="700" fill="${pal.text}">${esc(i.value)}</text>`);
      } else {
        const label = small && i.value ? `${p.short} · ${i.value}` : p.short;
        out.push(`<text class="sk-label" x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${small ? 9.5 : fs}" fill="${pal.text}">${esc(label)}</text>`);
      }
    }
    if (i.badge) {
      const bx = p.vertical ? cx : p.box.x + p.box.w - 9;
      const by = p.vertical ? p.box.y + 10 : p.box.y + 9;
      out.push(`<circle cx="${bx}" cy="${by}" r="7.5" fill="${i.status === 'bad' ? '#d93636' : '#e08600'}" stroke="#fff" stroke-width="1.5"/>`);
      out.push(`<text x="${bx}" y="${by + 3.2}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${i.badge}</text>`);
    }
    out.push('</g>');
  }
  out.push('</svg>');
  return out.join('');
}

// Rendert die Skizze als PNG (für das PDF)
export function sketchPNG(svg, scale = 3) {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = +m[1], hgt = +m[2];
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w * scale; c.height = hgt * scale;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve({ dataUrl: c.toDataURL('image/png'), w, h: hgt });
    };
    img.onerror = reject;
    const sized = svg.replace('<svg ', `<svg width="${w * scale}" height="${hgt * scale}" `);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  });
}
