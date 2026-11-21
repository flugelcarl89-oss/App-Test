// Fahrzeugskizze: linke Seite, Draufsicht, rechte Seite – so, wie man sie am Fahrzeug sieht
import { typeById } from './data.js';

const W = 360;
const G = 2.5;       // Fuge zwischen Teilen
const SILL = 11;     // Höhe Schweller

// Geometrie je Typ (Längen in Skizzen-Einheiten, Front = 0)
// A = Ende Motorhaube / Fuß A-Säule, Wd = Ende Frontscheibe (Dachbeginn), C = Dachende, R = Ende Heckscheibe,
// T = Beginn hinterer Stoßfänger, wf/wr = Radmitten, d2/d3 = Türfugen (4 Türen), door2 = Türende bei 2 Türen
const GEO = {
  kleinwagen: { len: 300, fb: 16, A: 86, Wd: 118, C: 238, R: 266, T: 282, wf: 57, wr: 248, r: 15, gh: 28, bh: 54, hoodDrop: 7, deckDrop: 3, d2: 158, d3: 224, door2: 190, qWin2: true, rwTop: 18, tailTop: 34, rb: 16 },
  limousine: { len: 336, fb: 18, A: 112, Wd: 144, C: 230, R: 262, T: 314, wf: 66, wr: 262, r: 16, gh: 28, bh: 54, hoodDrop: 7, deckDrop: 2, d2: 182, d3: 236, door2: 204, qWin2: true, rwTop: 24, tailTop: 50, rb: 18 },
  kombi: { len: 340, fb: 18, A: 112, Wd: 144, C: 318, R: 326, T: 326, wf: 66, wr: 266, r: 16, gh: 28, bh: 54, hoodDrop: 7, deckDrop: 0, d2: 182, d3: 238, door2: 204, qWin4: true, qWin2: true, rwTop: 14, tailTop: 34, rb: 14 },
  suv: { len: 330, fb: 18, A: 106, Wd: 138, C: 306, R: 316, T: 316, wf: 64, wr: 258, r: 18, gh: 30, bh: 62, hoodDrop: 6, deckDrop: 0, d2: 176, d3: 232, door2: 198, qWin4: true, qWin2: true, rwTop: 14, tailTop: 36, rb: 14 },
  coupe: { len: 330, fb: 18, A: 122, Wd: 160, C: 212, R: 270, T: 312, wf: 66, wr: 258, r: 16, gh: 24, bh: 52, hoodDrop: 8, deckDrop: 2, d2: 180, d3: 232, door2: 214, qWin2: true, rwTop: 30, tailTop: 44, rb: 18 },
  cabrio: { len: 330, fb: 18, A: 118, Wd: 150, C: 214, R: 252, T: 312, wf: 66, wr: 258, r: 16, gh: 24, bh: 52, hoodDrop: 8, deckDrop: 2, d2: 178, d3: 232, door2: 210, rwTop: 22, tailTop: 46, rb: 18, softtop: true },
  van: { len: 330, fb: 14, A: 78, Wd: 112, C: 318, R: 324, T: 324, wf: 52, wr: 258, r: 17, gh: 38, bh: 62, hoodDrop: 8, deckDrop: 0, d2: 140, d3: 232, door2: 200, qWin4: true, qWin2: true, rwTop: 12, tailTop: 30, rb: 14 },
  transporter: { len: 344, fb: 12, A: 64, Wd: 90, C: 338, R: 344, T: 344, wf: 40, wr: 270, r: 17, gh: 44, bh: 64, hoodDrop: 10, deckDrop: 0, d2: 124, d3: 240, door2: 124, cargo: true, rwTop: 0, tailTop: 40, rb: 10 },
  pickup: { len: 344, fb: 18, A: 110, Wd: 142, C: 196, R: 204, T: 330, wf: 66, wr: 272, r: 18, gh: 28, bh: 58, hoodDrop: 7, deckDrop: 0, d2: 160, d3: 204, door2: 178, rwTop: 12, tailTop: 18, rb: 14, bed: true },
};

export function doorsOf(a) {
  const t = typeById(a.type);
  return t.doorOptions.includes(a.doors) ? a.doors : t.doors;
}

const f1 = (n) => Math.round(n * 10) / 10;

// Pfad-Baustein mit optionaler Spiegelung (rechte Seite: Front zeigt nach rechts)
function pb(mx) {
  const flip = mx(1) < mx(0);
  const out = [];
  const api = {
    M(x, y) { out.push(`M${f1(mx(x))},${f1(y)}`); return api; },
    L(x, y) { out.push(`L${f1(mx(x))},${f1(y)}`); return api; },
    Q(cx, cy, x, y) { out.push(`Q${f1(mx(cx))},${f1(cy)} ${f1(mx(x))},${f1(y)}`); return api; },
    A(r, large, sweep, x, y) { out.push(`A${r},${r} 0 ${large},${flip ? 1 - sweep : sweep} ${f1(mx(x))},${f1(y)}`); return api; },
    Z() { out.push('Z'); return out.join(''); },
    end() { return out.join(''); },
  };
  return api;
}

function rrect(x, y, w, h, r) {
  return `M${f1(x + r)},${f1(y)}H${f1(x + w - r)}Q${f1(x + w)},${f1(y)} ${f1(x + w)},${f1(y + r)}V${f1(y + h - r)}Q${f1(x + w)},${f1(y + h)} ${f1(x + w - r)},${f1(y + h)}H${f1(x + r)}Q${f1(x)},${f1(y + h)} ${f1(x)},${f1(y + h - r)}V${f1(y + r)}Q${f1(x)},${f1(y)} ${f1(x + r)},${f1(y)}Z`;
}

export function buildLayout(a) {
  const t = typeById(a.type);
  const doors = doorsOf(a);
  const g0 = GEO[t.id] || GEO.limousine;
  const g = { ...g0 };
  if (t.id === 'pickup' && doors === 2) { g.C -= 26; g.R -= 26; }
  const x0 = (W - g.len) / 2;
  const parts = new Map();
  const deco = { back: [], front: [] };
  const wheels = [];
  const titles = [];

  const addPart = (id, label, short, kind, path, box, extra = {}) => {
    if (!parts.has(id)) parts.set(id, { id, label, short, kind, paths: [], box: null, ...extra });
    const p = parts.get(id);
    Object.assign(p, extra);
    p.paths.push(path);
    if (box) p.box = box;
    return p;
  };

  // ---------- Seitenansicht ----------
  const side = (s, top) => {
    const left = s === 'l';
    const mx = left ? (v) => x0 + v : (v) => W - (x0 + v);
    const name = left ? 'links' : 'rechts';
    const S = left ? 'L' : 'R';
    const yRoof = top;
    const yBelt = top + g.gh;
    const yB = yBelt + g.bh;
    const yG = yB + 10;
    const wy = yG - g.r;
    const ra = g.r + 4;
    const ax = Math.sqrt(ra * ra - (yB - wy) ** 2);
    const box = (s1, s2, y1, y2) => {
      const xa = mx(s1), xb = mx(s2);
      return { x: Math.min(xa, xb), y: y1, w: Math.abs(xb - xa), h: y2 - y1 };
    };

    // Aufbau (Dach, Säulen) als Hintergrund
    const hoodY = yBelt + g.hoodDrop;
    const up = pb(mx).M(g.A - 4, yBelt).L(g.Wd, yRoof + 4).Q(g.Wd + 4, yRoof, g.Wd + 12, yRoof)
      .L(g.C - 10, yRoof).Q(g.C - 2, yRoof, g.C + 1, yRoof + 4).L(g.R + 2, yBelt).Z();
    deco.back.push(`<path class="sk-deco-body${g.softtop ? ' soft' : ''}" d="${up}" fill="${g.softtop ? '#5b5f69' : '#eef1f5'}" stroke="${g.softtop ? '#41454d' : '#b8c0cc'}" stroke-width="1.2" stroke-linejoin="round" pointer-events="none"/>`);

    // Fenster
    const ghFront = (y) => g.A + (g.Wd - g.A) * (yBelt - y) / g.gh;
    const ghRear = (y) => g.R - (g.R - g.C) * (yBelt - y) / g.gh;
    const win = (s1, s2) => {
      const yt = yRoof + 4, yb = yBelt - 2;
      const lb = Math.max(s1, ghFront(yb) + 3), lt = Math.max(s1, ghFront(yt) + 3);
      let rb = Math.min(s2, ghRear(yb) - 3), rt = Math.min(s2, ghRear(yt) - 3);
      if (rb - lb < 6) return;
      if (rt < lt + 2) rt = lt + 2;
      const d = pb(mx).M(lb, yb).L(lt, yt).L(rt, yt).L(rb, yb).Z();
      deco.back.push(`<path class="sk-deco-glass" d="${d}" fill="#d6e6f7" stroke="#9dbfe3" stroke-width="0.8" stroke-linejoin="round" pointer-events="none"/>`);
    };
    let doorEnd;
    if (doors === 4) { doorEnd = g.d3; win(g.A, g.d2 - 3); win(g.d2 + 3, g.d3 - 2); if (g.qWin4) win(g.d3 + 3, g.R); }
    else if (doors === 'sliding') { doorEnd = g.d3; win(g.A, g.d2 - 3); if (!g.cargo) { win(g.d2 + 3, g.d3 - 2); win(g.d3 + 3, g.R); } }
    else { doorEnd = g.door2; win(g.A, g.door2 - 3); if (g.qWin2 && !g.softtop) win(g.door2 + 3, g.R); }
    if (g.softtop) {
      // Stoffverdeck: Nähte andeuten
      for (const sx of [g.C - 30, g.C - 8]) deco.back.push(`<path d="${pb(mx).M(sx, yRoof + 2).L(sx + 4, yBelt - 3).end()}" stroke="#7c818c" stroke-width="1" pointer-events="none"/>`);
    }

    // Schweller (zuerst, damit Türen Vorrang beim Tippen haben)
    const sillD = pb(mx).M(g.A + G, yB - SILL).L(doorEnd - G, yB - SILL).L(doorEnd - G, yB - 1).Q(doorEnd - G, yB, doorEnd - G - 3, yB)
      .L(g.A + G + 3, yB).Q(g.A + G, yB, g.A + G, yB - 1).Z();
    const sillHit = rrect(Math.min(mx(g.A + G), mx(doorEnd - G)), yB - SILL, Math.abs(mx(doorEnd - G) - mx(g.A + G)), SILL + 7, 2);
    addPart('sill_' + s, `Schweller ${name}`, 'Schweller', 'paint', sillD, box(g.A + G, doorEnd - G, yB - SILL, yB), { hit: sillHit, thin: true });

    // Stoßfänger (Seitenteil gehört zum jeweiligen Stoßfänger)
    const bf = pb(mx).M(g.fb - 1, hoodY + 3).L(7, hoodY + 7).Q(0, hoodY + 9, 0, hoodY + 17).L(0, yB - 7).Q(0, yB - 1, 7, yB - 1).L(g.fb - 1, yB - 1).Z();
    addPart('bumper_f', 'Stoßfänger vorne', 'Stoßfänger', 'paint', bf, null, { material: 'kunststoff' });
    const rTop = yBelt + g.deckDrop;
    const br = pb(mx).M(g.T + 1, rTop + 3).L(g.len - 5, rTop + 6).Q(g.len, rTop + 8, g.len, rTop + 15).L(g.len, yB - 7).Q(g.len, yB - 1, g.len - 7, yB - 1).L(g.T + 1, yB - 1).Z();
    addPart('bumper_r', 'Stoßfänger hinten', 'Stoßfänger', 'paint', br, null, { material: 'kunststoff' });

    // Kotflügel mit Radlauf
    const fe = pb(mx).M(g.fb + 1, hoodY).L(g.A, yBelt).L(g.A, yB).L(g.wf + ax, yB).A(ra, 1, 0, g.wf - ax, yB).L(g.fb + 1, yB).Z();
    addPart('fender_f' + s, `Kotflügel vorne ${name}`, 'Kotflügel', 'paint', fe, box(g.fb + 1, g.A, yBelt + 2, wy - ra), { side: s, labelPos: left ? 0.6 : 0.4 });

    // Türen
    const doorPath = (s1, s2) => pb(mx).M(s1, yBelt).L(s2, yBelt).L(s2, yB - SILL - G).L(s1, yB - SILL - G).Z();
    const handle = (sx) => deco.front.push(`<rect x="${f1(Math.min(mx(sx), mx(sx + 9)))}" y="${f1(yBelt + 6)}" width="9" height="2.6" rx="1.3" fill="#8e96a3" pointer-events="none"/>`);
    if (doors === 4) {
      addPart('door_f' + s, `Tür vorne ${name}`, 'Tür vorne', 'paint', doorPath(g.A + G, g.d2 - G / 2), box(g.A + G, g.d2 - G / 2, yBelt, yB - SILL - G), { side: s, door: true });
      addPart('door_r' + s, `Tür hinten ${name}`, 'Tür hinten', 'paint', doorPath(g.d2 + G / 2, g.d3 - G), box(g.d2 + G / 2, g.d3 - G, yBelt, yB - SILL - G), { side: s, door: true });
      handle(g.d2 - 16); handle(g.d3 - 15);
    } else if (doors === 'sliding') {
      addPart('door_f' + s, `Tür vorne ${name}`, 'Tür vorne', 'paint', doorPath(g.A + G, g.d2 - G / 2), box(g.A + G, g.d2 - G / 2, yBelt, yB - SILL - G), { side: s, door: true });
      addPart('sliding_' + s, `Schiebetür ${name}`, 'Schiebetür', 'paint', doorPath(g.d2 + G / 2, g.d3 - G), box(g.d2 + G / 2, g.d3 - G, yBelt, yB - SILL - G), { side: s, door: true });
      handle(g.d2 - 16); handle(g.d2 + 8);
      deco.front.push(`<path d="${pb(mx).M(g.d2 + 6, yB - SILL - 6).L(g.d3 - 6, yB - SILL - 6).end()}" stroke="#a8b0bc" stroke-width="1" pointer-events="none"/>`);
    } else {
      addPart('door_f' + s, `Tür ${name}`, 'Tür', 'paint', doorPath(g.A + G, g.door2 - G), box(g.A + G, g.door2 - G, yBelt, yB - SILL - G), { side: s, door: true });
      handle(g.door2 - 18);
    }

    // Seitenwand hinten mit Radlauf
    const qs = doorEnd;
    const qe = pb(mx).M(qs, yBelt).L(g.R, yBelt).L(g.T, rTop).L(g.T, yB).L(g.wr + ax, yB).A(ra, 1, 0, g.wr - ax, yB).L(qs, yB).Z();
    const qLabel = t.id === 'pickup' ? `Seitenwand Ladefläche ${name}` : `Seitenwand hinten ${name}`;
    addPart('quarter_r' + s, qLabel, 'Seitenwand', 'paint', qe, box(qs, g.T, yBelt + 2, wy - ra), { side: s, labelPos: left ? 0.42 : 0.58 });

    // Spiegel, Leuchten
    deco.front.push(`<path d="${pb(mx).M(g.A - 2, yBelt - 1).L(g.A + 7, yBelt - 7).Q(g.A + 11, yBelt - 8, g.A + 11, yBelt - 4).L(g.A + 8, yBelt + 1).Z()}" fill="#9aa3af" class="sk-deco-dark" pointer-events="none"/>`);
    deco.front.push(`<path d="${pb(mx).M(g.fb + 3, hoodY + 3).L(g.fb + 16, hoodY + 1.5).L(g.fb + 16, hoodY + 7).L(g.fb + 4, hoodY + 8).Z()}" fill="#f3e6b5" stroke="#c9b26a" stroke-width="0.6" pointer-events="none"/>`);
    deco.front.push(`<path d="${pb(mx).M(g.T - 12, rTop + 2.5).L(g.T - 1, rTop + 2.5).L(g.T - 1, rTop + 9).L(g.T - 10, rTop + 8).Z()}" fill="#f2b8b8" stroke="#cf7a7a" stroke-width="0.6" pointer-events="none"/>`);

    // Räder
    wheels.push({ id: 'f' + s, short: 'V' + S, cx: mx(g.wf), cy: wy, r: g.r });
    wheels.push({ id: 'r' + s, short: 'H' + S, cx: mx(g.wr), cy: wy, r: g.r });

    titles.push({ text: left ? 'LINKE SEITE · FAHRER' : 'RECHTE SEITE · BEIFAHRER', front: left ? 'left' : 'right', y: top - 8, x1: mx(0), x2: mx(g.len) });
    return yG;
  };

  // ---------- Draufsicht ----------
  const topView = (top) => {
    const mx = (v) => x0 + v;
    const yc = top + 76;
    const box = (s1, s2, hw) => ({ x: mx(s1), y: yc - hw, w: s2 - s1, h: 2 * hw });
    // Spiegel
    for (const sg of [-1, 1]) deco.back.push(`<rect x="${f1(mx(g.A + 1))}" y="${f1(sg < 0 ? yc - 76 : yc + 68)}" width="11" height="8" rx="3" fill="#9aa3af" class="sk-deco-dark" pointer-events="none"/>`);

    addPart('bumper_f', 'Stoßfänger vorne', 'Stoßfänger', 'paint',
      pb(mx).M(g.fb, yc - 62).L(8, yc - 62).Q(0, yc - 60, 0, yc - 42).L(0, yc + 42).Q(0, yc + 60, 8, yc + 62).L(g.fb, yc + 62).Z(),
      box(0, g.fb, 62), { material: 'kunststoff', vertical: true });
    const h1 = g.fb + G;
    addPart('hood', 'Motorhaube', 'Motorhaube', 'paint',
      pb(mx).M(h1, yc - 62).L(g.A, yc - 67).L(g.A, yc + 67).L(h1, yc + 62).Q(h1 - 4, yc, h1, yc - 62).Z(), box(h1, g.A, 62));
    deco.front.push(`<path d="${pb(mx).M(h1 + 10, yc - 34).Q((h1 + g.A) / 2, yc - 40, g.A - 6, yc - 38).M(h1 + 10, yc + 34).Q((h1 + g.A) / 2, yc + 40, g.A - 6, yc + 38).end()}" fill="none" stroke="rgba(120,130,145,0.35)" stroke-width="1" pointer-events="none"/>`);
    const w1 = g.A + G;
    addPart('windshield', 'Frontscheibe', 'Frontscheibe', 'glass',
      pb(mx).M(w1, yc - 65).L(g.Wd, yc - 54).Q(g.Wd + 3, yc, g.Wd, yc + 54).L(w1, yc + 65).Q(w1 - 3, yc, w1, yc - 65).Z(), box(w1, g.Wd, 54), { vertical: true });

    let roofEnd, x;
    const tailStart = (len) => g.len - g.rb - G - len;
    if (g.bed) {
      roofEnd = g.C - 4;
      addPart('roof', 'Dach', 'Dach', 'paint', rrect(mx(g.Wd + G), yc - 54, roofEnd - g.Wd - G, 108, 10), box(g.Wd + G, roofEnd, 54));
      const rw1 = roofEnd + G, rw2 = g.R + 6;
      addPart('rear_window', 'Heckscheibe', 'Heckscheibe', 'glass', rrect(mx(rw1), yc - 54, rw2 - rw1, 108, 3), box(rw1, rw2, 54), { vertical: true });
      const tg1 = tailStart(g.tailTop);
      const b1 = rw2 + G + 2;
      addPart('bed', 'Ladefläche', 'Ladefläche', 'paint', rrect(mx(b1), yc - 64, tg1 - G - b1, 128, 4), box(b1, tg1 - G, 64));
      deco.front.push(`<rect x="${f1(mx(b1 + 6))}" y="${f1(yc - 56)}" width="${f1(tg1 - G - b1 - 12)}" height="112" rx="3" fill="none" stroke="rgba(120,130,145,0.45)" stroke-width="1" pointer-events="none"/>`);
      addPart('tailgate', 'Heckklappe / Bordwand', 'Heckklappe', 'paint', rrect(mx(tg1), yc - 64, g.tailTop, 128, 4), box(tg1, tg1 + g.tailTop, 64), { vertical: true });
    } else {
      const tl = g.tailTop;
      const rw = g.rwTop;
      roofEnd = tailStart(tl) - (rw ? rw + G : 0) - G;
      const kind = g.softtop ? 'softtop' : 'paint';
      addPart('roof', g.softtop ? 'Verdeck' : 'Dach', g.softtop ? 'Verdeck' : 'Dach', kind, rrect(mx(g.Wd + G), yc - 54, roofEnd - g.Wd - G, 108, 12), box(g.Wd + G, roofEnd, 54));
      if (g.softtop) for (let i = 1; i < 4; i++) deco.front.push(`<path d="M${f1(mx(g.Wd + G + (roofEnd - g.Wd) * i / 4))},${f1(yc - 50)}V${f1(yc + 50)}" stroke="rgba(110,100,150,0.35)" stroke-width="1" pointer-events="none"/>`);
      x = roofEnd + G;
      if (rw) {
        addPart('rear_window', 'Heckscheibe', 'Heckscheibe', 'glass',
          pb(mx).M(x, yc - 54).L(x + rw, yc - 62).L(x + rw, yc + 62).L(x, yc + 54).Q(x - 2, yc, x, yc - 54).Z(), box(x, x + rw, 54), { vertical: true });
        x += rw + G;
      }
      const t2 = g.len - g.rb - G;
      if (t.tail === 'barn') {
        addPart('barn_r', 'Hecktür rechts', 'Hecktür R', 'paint', rrect(mx(x), yc - 64, t2 - x, 64 - G / 2, 4), { x: mx(x), y: yc - 64, w: t2 - x, h: 64 - G / 2 }, { vertical: true });
        addPart('barn_l', 'Hecktür links', 'Hecktür L', 'paint', rrect(mx(x), yc + G / 2, t2 - x, 64 - G / 2, 4), { x: mx(x), y: yc + G / 2, w: t2 - x, h: 64 - G / 2 }, { vertical: true });
      } else {
        const id = t.tail === 'trunk' ? 'trunk' : 'tailgate';
        const label = t.tail === 'trunk' ? 'Kofferraumdeckel' : 'Heckklappe';
        addPart(id, label, t.tail === 'trunk' ? 'Kofferraum' : 'Heckklappe', 'paint',
          pb(mx).M(x, yc - 64).L(t2 - 8, yc - 62).Q(t2, yc - 60, t2, yc - 50).L(t2, yc + 50).Q(t2, yc + 60, t2 - 8, yc + 62).L(x, yc + 64).Z(),
          box(x, t2, 62), { vertical: t2 - x < 56 });
      }
    }
    addPart('bumper_r', 'Stoßfänger hinten', 'Stoßfänger', 'paint',
      pb(mx).M(g.len - g.rb, yc - 62).L(g.len - 8, yc - 62).Q(g.len, yc - 60, g.len, yc - 42).L(g.len, yc + 42).Q(g.len, yc + 60, g.len - 8, yc + 62).L(g.len - g.rb, yc + 62).Z(),
      box(g.len - g.rb, g.len, 62), { material: 'kunststoff', vertical: true });
    titles.push({ text: 'DRAUFSICHT', front: 'left', y: top - 8, x1: mx(0), x2: mx(g.len) });
    return yc + 78;
  };

  let y = 26;
  const leftEnd = side('l', y);
  const topEnd = topView(leftEnd + 30);
  const rightEnd = side('r', topEnd + 30);

  // Reihenfolge: Schweller zuerst (Türen liegen darüber)
  const list = [...parts.values()].sort((p, q) => (q.thin ? 1 : 0) - (p.thin ? 1 : 0));
  return { width: W, height: rightEnd + 6, parts: list, wheels, deco, titles };
}

// Reihenfolge für den Lack-Rundgang (im Uhrzeigersinn um das Fahrzeug)
export function walkOrder(layout) {
  const order = ['hood', 'fender_fr', 'door_fr', 'sliding_r', 'door_rr', 'sill_r', 'quarter_rr', 'tailgate', 'trunk', 'barn_r', 'barn_l', 'bed',
    'quarter_rl', 'sill_l', 'door_rl', 'sliding_l', 'door_fl', 'fender_fl', 'roof', 'bumper_f', 'bumper_r'];
  const ids = new Set(layout.parts.map((p) => p.id));
  const sorted = order.filter((id) => ids.has(id)).map((id) => layout.parts.find((p) => p.id === id));
  return [...sorted, ...layout.parts.filter((p) => !order.includes(p.id))];
}

const PALETTE = {
  none: { fill: '#ffffff', stroke: '#aeb6c2', text: '#3a4250' },
  ok: { fill: '#d6f3df', stroke: '#2f9e57', text: '#1b5e34' },
  warn: { fill: '#ffe7a6', stroke: '#d49b00', text: '#6b4d00' },
  bad: { fill: '#ffcccc', stroke: '#d93636', text: '#7a1515' },
  glass: { fill: '#dcebfa', stroke: '#8fb4dc', text: '#35577d' },
  softtop: { fill: '#e6e3ef', stroke: '#9890b8', text: '#4b4466' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Schriftgröße so wählen, dass der Text in die Breite passt
const fit = (txt, w, max, min = 6.5) => Math.max(min, Math.min(max, (w - 6) / (String(txt).length * 0.56)));

function labelSVG(p, i, pal) {
  const b = p.box;
  const o = [];
  const cx = b.x + b.w * (p.labelPos ?? 0.5);
  const cy = b.y + b.h / 2;
  const T = (x, y, fs, txt, extra = '') => `<text class="sk-label" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="${f1(fs)}" fill="${pal.text}" pointer-events="none" ${extra}>${esc(txt)}</text>`;
  const vertical = p.vertical || (!p.thin && b.w < 50 && b.h > b.w * 1.4);
  if (p.thin) {
    const txt = i.value ? `${p.short} · ${i.value}` : p.short;
    o.push(T(cx, cy + 2.6, fit(txt, b.w, 7.5), txt));
  } else if (vertical) {
    const txt = i.value ? `${p.short} · ${i.value}` : p.short;
    o.push(T(cx, cy, fit(txt, b.h, b.w < 22 ? 8 : 9), txt, `dy="3" transform="rotate(-90 ${f1(cx)} ${f1(cy)})"`));
  } else {
    const fs = fit(p.short, b.w, b.w < 70 ? 9.5 : 10.5);
    if (i.value) {
      o.push(T(cx, cy - 2, fs, p.short));
      o.push(T(cx, cy + fs + 1, fs + 0.5, i.value, 'font-weight="700"').replace('class="sk-label"', 'class="sk-value"'));
    } else o.push(T(cx, cy + 3.5, fs, p.short));
  }
  if (i.badge) {
    const bx = b.x + b.w - (p.thin ? 8 : 7);
    const by = p.thin ? b.y + b.h / 2 : b.y + 7;
    o.push(`<circle cx="${f1(bx)}" cy="${f1(by)}" r="6.5" fill="${i.status === 'bad' ? '#d93636' : '#e08600'}" stroke="#fff" stroke-width="1.3" pointer-events="none"/>`);
    o.push(`<text x="${f1(bx)}" y="${f1(by + 3)}" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" pointer-events="none">${i.badge}</text>`);
  }
  return o.join('');
}

/**
 * SVG-Text der Skizze.
 * info(partId) → { status: 'none'|'ok'|'warn'|'bad', value: '128 µm', badge: 2 }
 */
export function sketchSVG(a, layout, info, { highlight = null, wheelInfo = null } = {}) {
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${f1(layout.height)}" class="sketch-svg" font-family="-apple-system, Helvetica, Arial, sans-serif">`);

  for (const tt of layout.titles) {
    const frontLeft = tt.front === 'left';
    const fx = frontLeft ? Math.min(tt.x1, tt.x2) : Math.max(tt.x1, tt.x2);
    const ox = frontLeft ? Math.max(tt.x1, tt.x2) : Math.min(tt.x1, tt.x2);
    o.push(`<text x="${f1(ox)}" y="${f1(tt.y)}" text-anchor="${frontLeft ? 'end' : 'start'}" class="sk-title" font-size="8.5" font-weight="600" letter-spacing="1" fill="#8a93a1">${esc(tt.text)}</text>`);
    o.push(`<text x="${f1(fx)}" y="${f1(tt.y)}" text-anchor="${frontLeft ? 'start' : 'end'}" class="sk-title" font-size="8.5" font-weight="600" letter-spacing="1" fill="#0a6cff">${frontLeft ? '◀ VORNE' : 'VORNE ▶'}</text>`);
  }

  o.push(...layout.deco.back);

  const labels = [];
  for (const p of layout.parts) {
    const i = info(p.id) || { status: 'none' };
    const st = i.status && i.status !== 'none' ? i.status : null;
    const pal = st ? PALETTE[st] : (p.kind === 'glass' ? PALETTE.glass : p.kind === 'softtop' ? PALETTE.softtop : PALETTE.none);
    const hl = highlight === p.id;
    o.push(`<g class="sk-part k-${p.kind} s-${i.status || 'none'}${hl ? ' hl' : ''}" data-part="${p.id}" role="button" aria-label="${esc(p.label)}">`);
    if (p.hit) o.push(`<path d="${p.hit}" fill="transparent"/>`);
    for (const d of p.paths) o.push(`<path class="sk-shape" d="${d}" fill="${pal.fill}" stroke="${hl ? '#0a6cff' : pal.stroke}" stroke-width="${hl ? 3 : 1.3}" stroke-linejoin="round"/>`);
    o.push('</g>');
    if (p.box) labels.push(labelSVG(p, i, pal));
  }

  o.push(...layout.deco.front);

  for (const w of layout.wheels) {
    const wi = wheelInfo?.(w.id);
    const st = wi?.status && wi.status !== 'none' ? wi.status : null;
    const ring = st ? PALETTE[st].stroke : '#1e2227';
    o.push(`<g class="sk-wheel${st ? ' s-' + st : ''}" data-wheel="${w.id}" role="button" aria-label="Rad ${w.short}">`);
    o.push(`<circle class="sk-tire" cx="${f1(w.cx)}" cy="${f1(w.cy)}" r="${w.r}" fill="#2b2f36" stroke="${ring}" stroke-width="${st ? 3 : 1}"/>`);
    o.push(`<circle class="sk-rim" cx="${f1(w.cx)}" cy="${f1(w.cy)}" r="${f1(w.r * 0.58)}" fill="#c3c9d2" stroke="#8d95a1" stroke-width="0.8"/>`);
    o.push(`<text x="${f1(w.cx)}" y="${f1(w.cy + 2.8)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#2b2f36">${w.short}</text>`);
    o.push('</g>');
  }
  o.push(...labels);
  o.push('</svg>');
  return o.join('');
}

// Rendert die Skizze als PNG (für das PDF)
export function sketchPNG(svg, scale = 3) {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = +m[1], hgt = +m[2];
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(hgt * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve({ dataUrl: c.toDataURL('image/png'), w, h: hgt });
    };
    img.onerror = reject;
    const sized = svg.replace('<svg ', `<svg width="${Math.round(w * scale)}" height="${Math.round(hgt * scale)}" `);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  });
}
