// PDF-Protokoll (jsPDF, läuft lokal)
import { busy, toast, offerShare, fmtEuro, fmtInt, fmtDec, fmtDate, fmtMonth, parseInt2, parseDec } from './ui.js';
import { state, photoRefs } from './store.js';
import { evaluate, calcPrice, paintMax, paintLevel, PAINT_TEXT, partInfoFn, tireStatus, dotAge, ageYears, kmPerYear, psFromKw, checkGroups, titleOf, vinInfo } from './eval.js';
import { sketchSVG, sketchPNG, walkOrder } from './sketch.js';
import { typeById, FUELS, GEARBOXES, SEASONS, WHEELS, PHOTO_SLOTS } from './data.js';
import { getPhoto } from './photos.js';
import { priceStats } from './market.js';

function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('vendor/jspdf.umd.min.js', location.href).href;
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => reject(new Error('PDF-Modul konnte nicht geladen werden'));
    document.head.append(s);
  });
}

// Nur Zeichen, die die Standardschrift kann
const T = (s) => String(s ?? '')
  .replace(/≈/g, 'ca.').replace(/✓/g, '').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/→/g, '->')
  .replace(/[‚‘’]/g, "'").replace(/ | /g, ' ').replace(/[^\x20-\x7E -ÿ€„“”–—•…‰]/g, '');

const COL = {
  text: [30, 34, 40], muted: [110, 118, 130], line: [220, 224, 230], accent: [10, 108, 255],
  ok: [47, 158, 87], warn: [212, 155, 0], bad: [217, 54, 54], none: [170, 176, 186], info: [60, 120, 200],
  okBg: [230, 247, 236], warnBg: [255, 243, 205], badBg: [255, 226, 226], soft: [244, 246, 249],
};
const label = (list, v) => list.find((x) => x.value === v)?.label || '';

export async function createPDF(a) {
  const b = busy('PDF wird erstellt …');
  try {
    const jsPDF = await loadJsPDF();
    const blob = await build(jsPDF, a, b);
    b.close();
    const name = `Zustandsbericht_${[a.v.make, a.v.model, a.v.plate].filter(Boolean).join('_').replace(/[^\wäöüÄÖÜß-]+/g, '_') || 'Fahrzeug'}_${(a.v.date || '').replace(/-/g, '')}.pdf`;
    await offerShare({ title: 'PDF-Protokoll fertig', message: `${name} · ${fmtInt(Math.round(blob.size / 1024))} KB`, files: [new File([blob], name, { type: 'application/pdf' })], preview: true });
  } catch (e) {
    console.error(e);
    b.close();
    toast('PDF fehlgeschlagen: ' + e.message);
  }
}

async function build(jsPDF, a, b) {
  const s = state.settings;
  const ev = evaluate(a, s);
  const price = calcPrice(a, s, ev.layout);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const PW = 210, PH = 297, M = 14, CW = PW - 2 * M;
  let y = M;

  const color = (c) => doc.setTextColor(...c);
  const font = (size, style = 'normal', c = COL.text) => { doc.setFont('helvetica', style); doc.setFontSize(size); color(c); };
  const text = (str, x, yy, opts) => doc.text(T(str), x, yy, opts);
  const need = (hh) => { if (y + hh > PH - 16) { doc.addPage(); y = M + 4; } };
  const heading = (str) => {
    need(14);
    y += 3;
    font(12, 'bold', COL.text);
    text(str, M, y + 4);
    doc.setDrawColor(...COL.accent); doc.setLineWidth(0.6);
    doc.line(M, y + 6, M + 18, y + 6);
    y += 10;
  };
  const wrap = (str, w) => doc.splitTextToSize(T(str), w);
  const dot = (x, yy, st, r = 1.3) => { doc.setFillColor(...(COL[st] || COL.none)); doc.circle(x, yy, r, 'F'); };

  // Tabelle: cols [{w, align}], rows [[...]], header
  const table = (cols, header, rows, { fs = 8.5, zebra = true, rowStatus } = {}) => {
    const pad = 1.6;
    const lineH = fs * 0.42;
    const drawHeader = () => {
      doc.setFillColor(...COL.soft);
      doc.rect(M, y, CW, 6.2, 'F');
      font(fs, 'bold', COL.muted);
      let x = M;
      header.forEach((hd, i) => { text(hd, cols[i].align === 'right' ? x + cols[i].w - pad : x + pad + (i === 0 && rowStatus ? 3 : 0), y + 4.2, { align: cols[i].align === 'right' ? 'right' : 'left' }); x += cols[i].w; });
      y += 6.2;
    };
    need(14);
    drawHeader();
    rows.forEach((r, ri) => {
      const cells = r.map((c, i) => wrap(c ?? '', cols[i].w - 2 * pad - (i === 0 && rowStatus ? 3 : 0)));
      const hh = Math.max(...cells.map((c) => c.length)) * lineH + 2.6;
      if (y + hh > PH - 16) { doc.addPage(); y = M + 4; drawHeader(); }
      if (zebra && ri % 2) { doc.setFillColor(250, 251, 252); doc.rect(M, y, CW, hh, 'F'); }
      let x = M;
      font(fs, 'normal', COL.text);
      cells.forEach((c, i) => {
        const off = i === 0 && rowStatus ? 3 : 0;
        if (i === 0 && rowStatus) dot(x + pad + 1.2, y + 1.3 + lineH * 0.68, rowStatus[ri], 1.1);
        doc.text(c, cols[i].align === 'right' ? x + cols[i].w - pad : x + pad + off, y + 1.3 + lineH, { align: cols[i].align === 'right' ? 'right' : 'left' });
        x += cols[i].w;
      });
      y += hh;
      doc.setDrawColor(...COL.line); doc.setLineWidth(0.15);
      doc.line(M, y, M + CW, y);
    });
    y += 3;
  };

  // ---------- Kopf ----------
  doc.setFillColor(...COL.accent);
  doc.rect(0, 0, PW, 3, 'F');
  font(17, 'bold');
  text('Zustandsbericht', M, y + 7);
  font(9, 'normal', COL.muted);
  text('Fahrzeugbewertung für den Ankauf', M, y + 12);
  const right = [s.companyName, s.inspectorName ? `Prüfer: ${s.inspectorName}` : null, `Datum: ${fmtDate(a.v.date || a.createdAt)}`, a.v.location ? `Ort: ${a.v.location}` : null].filter(Boolean);
  right.forEach((r, i) => { font(i === 0 && s.companyName ? 10 : 8.5, i === 0 && s.companyName ? 'bold' : 'normal', i === 0 && s.companyName ? COL.text : COL.muted); text(r, PW - M, y + 5 + i * 4.3, { align: 'right' }); });
  y += 19;
  doc.setDrawColor(...COL.line); doc.setLineWidth(0.3); doc.line(M, y, PW - M, y);
  y += 6;

  // ---------- Fahrzeug + Note ----------
  const v = a.v;
  font(14, 'bold');
  const ttl = [titleOf(a), v.variant].filter(Boolean).join(' ');
  const ttlLines = wrap(ttl, CW - 52);
  doc.text(ttlLines, M, y + 4);
  y += ttlLines.length * 5.6;
  font(9, 'normal', COL.muted);
  text([typeById(a.type).label, v.plate].filter(Boolean).join(' · '), M, y + 2);
  y += 6;

  const vi = vinInfo(v.vin);
  const age = ageYears(v.firstReg);
  const kpy = kmPerYear(a);
  const km = parseInt2(v.km);
  const kw = parseInt2(v.kw);
  const pairs = [
    ['FIN', v.vin ? v.vin + (vi?.make ? ` (${vi.make})` : '') : '–'],
    ['Erstzulassung', v.firstReg ? `${fmtDate(v.firstReg)}${age != null ? ` (${fmtDec(age)} J.)` : ''}` : '–'],
    ['Kilometerstand', km != null ? `${fmtInt(km)} km${kpy ? ` (ca. ${fmtInt(kpy)} km/J.)` : ''}` : '–'],
    ['HU bis', v.hu ? fmtMonth(v.hu) : '–'],
    ['Kraftstoff', label(FUELS, v.fuel) || '–'],
    ['Getriebe', label(GEARBOXES, v.gearbox) || '–'],
    ['Leistung', kw ? `${kw} kW / ${psFromKw(kw)} PS` : '–'],
    ['Hubraum', v.ccm ? `${fmtInt(parseInt2(v.ccm))} cm³` : '–'],
    ['Farbe', v.color || '–'],
    ['HSN / TSN', v.hsn || v.tsn ? `${v.hsn || '–'} / ${v.tsn || '–'}` : '–'],
    ['Vorbesitzer', v.owners || '–'],
    ['Schlüssel', v.keys || '–'],
  ];
  const boxTop = y;
  const colW = (CW - 52) / 2;
  pairs.forEach((p, i) => {
    const cx = M + (i % 2) * colW;
    const cy = boxTop + Math.floor(i / 2) * 9;
    font(7.5, 'normal', COL.muted); text(p[0], cx, cy + 3);
    font(9.5, 'normal', COL.text); text(wrap(p[1], colW - 3)[0], cx, cy + 7.2);
  });
  // Note
  const gx = PW - M - 46, gy = boxTop;
  const gc = COL[ev.level], gbg = COL[ev.level + 'Bg'];
  doc.setFillColor(...gbg); doc.setDrawColor(...gc); doc.setLineWidth(0.5);
  doc.roundedRect(gx, gy, 46, 52, 3, 3, 'FD');
  font(8, 'bold', gc); text('GESAMTNOTE', gx + 23, gy + 7, { align: 'center' });
  font(34, 'bold', gc); text(String(ev.grade), gx + 23, gy + 24, { align: 'center' });
  font(10, 'bold', COL.text); text(ev.gradeText, gx + 23, gy + 32, { align: 'center' });
  font(8, 'normal', COL.muted); text(`${ev.score}/100 Punkte`, gx + 23, gy + 38, { align: 'center' });
  doc.setFillColor(255, 255, 255); doc.roundedRect(gx + 6, gy + 41, 34, 2.4, 1.2, 1.2, 'F');
  doc.setFillColor(...gc); doc.roundedRect(gx + 6, gy + 41, Math.max(2.4, 34 * ev.score / 100), 2.4, 1.2, 1.2, 'F');
  font(7, 'normal', COL.muted); text(`Erfassung ${ev.completeness} %`, gx + 23, gy + 48.5, { align: 'center' });
  y = Math.max(boxTop + Math.ceil(pairs.length / 2) * 9, gy + 52) + 6;

  // ---------- Hinweise ----------
  heading('Hinweise');
  if (!ev.flags.length) { font(9, 'normal', COL.ok); text('Keine Auffälligkeiten erfasst.', M, y + 2); y += 7; }
  for (const f of ev.flags) {
    const lines = wrap(f.text || '', CW - 52);
    const hh = Math.max(1, lines.length) * 4 + 2.5;
    need(hh);
    dot(M + 1.5, y + 1.8, f.level === 'info' ? 'info' : f.level, 1.4);
    font(9, 'bold'); text(f.title, M + 5, y + 3);
    font(8.5, 'normal', COL.muted); doc.text(lines, M + 52, y + 3);
    y += hh;
  }
  y += 2;

  // ---------- Karosserie ----------
  b.set('Skizze …');
  const svg = sketchSVG(a, ev.layout, partInfoFn(a, s, 'all'), { wheelInfo: (id) => ({ status: tireStatus(a.tires.wheels[id], s) }), pdf: true });
  const png = await sketchPNG(svg, 3);
  const skW = 118, skH = skW * png.h / png.w;
  need(skH + 30);
  heading('Karosserie & Lack');
  doc.addImage(png.dataUrl, 'PNG', M + (CW - skW) / 2, y, skW, skH);
  y += skH + 3;
  // Legende
  font(7.5, 'normal', COL.muted);
  const leg = [['ok', `Original <= ${s.paintOkMax} µm`], ['warn', `Nachlackiert <= ${s.paintWarnMax} µm / Schaden`], ['bad', 'Spachtel / starker Schaden']];
  let lx = M + (CW - 150) / 2;
  leg.forEach(([st, l]) => { dot(lx + 1.5, y + 1.6, st, 1.2); text(l, lx + 4, y + 2.6); lx += 50; });
  y += 9;
  // Messwerte aller lackierten Teile
  const rowsAll = walkOrder(ev.layout).filter((p) => p.kind === 'paint');
  table(
    [{ w: 62 }, { w: 60 }, { w: 60, align: 'right' }],
    ['Teil', 'Messwerte (µm)', 'Bewertung'],
    rowsAll.map((p) => {
      const d = a.parts[p.id];
      const lvl = paintLevel(paintMax(d), s);
      return [p.label, d?.paint?.length ? d.paint.join(' / ') : (d?.ok ? 'i.O. (ohne Messung)' : '–'), lvl ? PAINT_TEXT[lvl] : (d?.material === 'kunststoff' || p.material === 'kunststoff' ? 'Kunststoff' : '')];
    }),
    { fs: 8, rowStatus: rowsAll.map((p) => { const d = a.parts[p.id]; return paintLevel(paintMax(d), s) || (d?.ok ? 'ok' : 'none'); }) });

  // Schäden
  if (ev.damages.length) {
    heading('Schäden');
    table(
      [{ w: 48 }, { w: 34 }, { w: 22 }, { w: 58 }, { w: 20, align: 'right' }],
      ['Teil', 'Schaden', 'Schwere', 'Notiz', 'Kosten'],
      ev.damages.map((d) => [d.part.label, d.typeLabel, d.severity, d.note || '', d.cost ? fmtEuro(d.cost) : '–']),
      { rowStatus: ev.damages.map((d) => (d.severity === 'stark' ? 'bad' : 'warn')) });
    font(9, 'bold'); text(`Summe Schäden: ${fmtEuro(price.dmg)}`, PW - M, y, { align: 'right' }); y += 6;
  }

  // ---------- Reifen ----------
  heading('Reifen & Bremsen');
  const TI = a.tires;
  table(
    [{ w: 40 }, { w: 30, align: 'right' }, { w: 50 }, { w: 62 }],
    ['Rad', 'Profil', 'DOT / Alter', 'Bemerkung'],
    WHEELS.map((w) => {
      const t = TI.wheels[w.id] || {};
      const ag = dotAge(t.dot);
      const d = parseDec(t.depth);
      return [w.label, d != null ? `${fmtDec(d)} mm` : '–', ag ? `${t.dot} (${fmtDec(ag.age)} J.)` : (t.dot || '–'), t.damage ? 'Reifen-/Felgenschaden' : ''];
    }),
    { rowStatus: WHEELS.map((w) => tireStatus(TI.wheels[w.id], s)) });
  const tireInfo = [
    TI.season || TI.size || TI.brand ? `Montiert: ${[label(SEASONS, TI.season), TI.size, TI.brand, TI.rims ? (TI.rims === 'alu' ? 'Alufelgen' : 'Stahlfelgen') : '', { ok: 'Felgen i.O.', bordstein: 'Bordsteinschäden', defekt: 'Felgen beschädigt' }[TI.rimState] || ''].filter(Boolean).join(', ')}` : null,
    TI.second.has ? `2. Radsatz: ${[label(SEASONS, TI.second.season), TI.second.depth ? `ca. ${TI.second.depth} mm` : '', TI.second.onRims ? 'auf Felgen' : '', TI.second.note].filter(Boolean).join(', ') || 'vorhanden'}` : '2. Radsatz: nein',
    TI.spare ? `Ersatzrad: ${{ reserve: 'Reserverad', not: 'Notrad', set: 'Pannenset', keins: 'keins' }[TI.spare]}` : null,
    `Bremsen vorne: Scheiben ${wear(TI.brakes.front.discs)}, Beläge ${wear(TI.brakes.front.pads)} · hinten: Scheiben ${wear(TI.brakes.rear.discs)}, Beläge ${wear(TI.brakes.rear.pads)}`,
    TI.note ? `Notiz: ${TI.note}` : null,
    `Kosten Reifen & Bremsen: ${fmtEuro(price.tires)}`,
  ].filter(Boolean);
  font(8.5, 'normal');
  for (const l of tireInfo) { const ls = wrap(l, CW); need(ls.length * 4 + 1); doc.text(ls, M, y + 1); y += ls.length * 4 + 0.8; }
  y += 2;

  // ---------- Checkliste ----------
  heading('Checkliste');
  const st = ev.checks;
  font(8.5, 'normal', COL.muted);
  text(`${st.done} von ${st.total} Punkten geprüft · ${st.ok} i.O. · ${st.nok} Mängel · ${st.na} n.v.`, M, y + 1);
  y += 5;
  for (const g of checkGroups(a, s)) {
    need(12);
    font(9, 'bold'); text(g.label, M, y + 3); y += 5;
    for (const it of g.items) {
      const c = a.checks[it.id];
      const sv = c?.s;
      const lines = wrap(it.label + (it.critical ? ' (!)' : ''), CW - 30);
      const extra = sv === 'nok' && (c.note || parseInt2(c.cost)) ? wrap(`-> ${[c.note, parseInt2(c.cost) ? fmtEuro(parseInt2(c.cost)) : ''].filter(Boolean).join(' · ')}`, CW - 30) : [];
      const hh = (lines.length + extra.length) * 3.7 + 1;
      need(hh);
      dot(M + 1.5, y + 1.3, sv === 'ok' ? 'ok' : sv === 'nok' ? 'bad' : 'none', 1.1);
      font(8, 'normal', COL.text); doc.text(lines, M + 5, y + 2.2);
      if (extra.length) { font(8, 'normal', COL.bad); doc.text(extra, M + 5, y + 2.2 + lines.length * 3.7); }
      font(8, 'bold', sv === 'ok' ? COL.ok : sv === 'nok' ? COL.bad : COL.muted);
      text(sv === 'ok' ? 'i.O.' : sv === 'nok' ? 'Mangel' : sv === 'na' ? 'n.v.' : 'offen', PW - M, y + 2.2, { align: 'right' });
      y += hh;
    }
    y += 2;
  }

  // ---------- Kalkulation ----------
  heading('Ankaufskalkulation');
  const calcRows = [
    ['Erwarteter Verkaufspreis', price.vk != null ? fmtEuro(price.vk) : '–'],
    price.reduction ? ['Abschlag', '- ' + fmtEuro(price.reduction)] : null,
    ['Schäden Karosserie', fmtEuro(price.dmg)],
    ['Mängel Checkliste', fmtEuro(price.chk)],
    ['Reifen & Bremsen', fmtEuro(price.tires)],
    ['Aufbereitung', fmtEuro(price.prep)],
    ['Service / Inspektion / HU', fmtEuro(price.service)],
    ['Sonstiges', fmtEuro(price.other)],
    ['Risiko / Gewährleistung', fmtEuro(price.risk)],
    ['Kosten gesamt', fmtEuro(price.total)],
    price.vk != null ? ['Eingeplanter Gewinn', fmtEuro(price.margin)] : null,
    price.vk != null && s.vat25a ? ['USt auf Marge (§ 25a)', fmtEuro(price.vat)] : null,
    priceStats(a.market?.prices) ? (() => { const m = priceStats(a.market.prices); return [`Marktvergleich: ${m.n} Angebote (${fmtEuro(m.min)} – ${fmtEuro(m.max)}), Median`, fmtEuro(m.median)]; })() : null,
  ].filter(Boolean);
  table([{ w: 120 }, { w: 62, align: 'right' }], ['Position', 'Betrag'], calcRows.map((r) => r), { zebra: true });
  if (price.maxPrice != null) {
    need(24);
    doc.setFillColor(...COL.soft); doc.roundedRect(M, y, CW, 20, 2, 2, 'F');
    font(9, 'normal', COL.muted); text('Max. Ankaufspreis', M + 5, y + 7);
    font(16, 'bold', COL.accent); text(fmtEuro(price.maxPrice), M + 5, y + 15);
    font(9, 'normal', COL.muted); text('Einstiegsangebot', M + 75, y + 7);
    font(12, 'bold', COL.text); text(fmtEuro(price.offer), M + 75, y + 15);
    if (price.agreed != null || price.ask != null) {
      font(9, 'normal', COL.muted); text(price.agreed != null ? 'Vereinbarter Preis' : 'Preisvorstellung', M + 130, y + 7);
      font(12, 'bold', COL.text); text(fmtEuro(price.agreed ?? price.ask), M + 130, y + 15);
    }
    y += 25;
  }

  // ---------- Verkäufer, Ausstattung, Notizen ----------
  const info = [
    v.sellerName || v.sellerPhone || v.sellerAddress ? ['Verkäufer', [v.sellerName, { privat: 'privat', haendler: 'Händler', inzahlung: 'Inzahlungnahme' }[v.sellerType], v.sellerPhone, v.sellerAddress].filter(Boolean).join(' · ')] : null,
    v.equipment ? ['Ausstattung', v.equipment] : null,
    a.notes ? ['Notizen', a.notes] : null,
  ].filter(Boolean);
  if (info.length) {
    heading('Weitere Angaben');
    for (const [k, val] of info) {
      const ls = wrap(val, CW - 32);
      need(ls.length * 4 + 3);
      font(8.5, 'bold', COL.muted); text(k, M, y + 2);
      font(8.5, 'normal'); doc.text(ls, M + 32, y + 2);
      y += ls.length * 4 + 2.5;
    }
  }

  // ---------- Unterschriften ----------
  need(42);
  y += 6;
  font(8, 'normal', COL.muted);
  doc.text(wrap('Der Fahrzeugzustand wurde wie oben dokumentiert gemeinsam festgestellt. Die Bewertung ist eine Einschätzung auf Basis der Sichtprüfung und Probefahrt.', CW), M, y);
  y += 12;
  const sw = (CW - 10) / 2;
  if (a.signature?.dataUrl) {
    try { doc.addImage(a.signature.dataUrl, 'PNG', M, y - 2, Math.min(sw, 60), 18); } catch { /* egal */ }
  }
  y += 18;
  doc.setDrawColor(...COL.text); doc.setLineWidth(0.3);
  doc.line(M, y, M + sw, y); doc.line(M + sw + 10, y, M + CW, y);
  font(8, 'normal', COL.muted);
  text(`Verkäufer${a.signature?.name ? `: ${a.signature.name}` : v.sellerName ? `: ${v.sellerName}` : ''}${a.signature?.at ? ` · ${fmtDate(a.signature.at)}` : ''}`, M, y + 4);
  text(`Käufer / Prüfer${s.inspectorName ? `: ${s.inspectorName}` : ''}`, M + sw + 10, y + 4);
  y += 10;

  // ---------- Fotos ----------
  const refs = photoRefs(a);
  if (refs.length) {
    doc.addPage(); y = M + 4;
    heading(`Fotodokumentation (${refs.length})`);
    const cols = 2, gap = 6;
    const cw = (CW - gap) / cols, chh = cw * 0.72;
    let col = 0;
    const slotLabel = Object.fromEntries(PHOTO_SLOTS.map((p) => [p.id, p.label]));
    const partLabel = Object.fromEntries(ev.layout.parts.map((p) => [p.id, p.label]));
    const checkLabel = Object.fromEntries(checkGroups(a, s).flatMap((g) => g.items.map((i) => [i.id, i.label])));
    const wheelLabel = Object.fromEntries(WHEELS.map((w) => [w.id, 'Rad ' + w.label]));
    for (let i = 0; i < refs.length; i++) {
      b.set(`Fotos ${i + 1}/${refs.length}`, (i + 1) / refs.length);
      const r = refs[i];
      const rec = await getPhoto(r.id);
      if (!rec) continue;
      if (col === 0) need(chh + 9);
      const x = M + col * (cw + gap);
      const img = await shrink(rec.blob, 1100);
      const f = Math.min(cw / img.w, chh / img.h);
      const iw = img.w * f, ih = img.h * f;
      doc.setFillColor(...COL.soft); doc.rect(x, y, cw, chh, 'F');
      doc.addImage(img.dataUrl, 'JPEG', x + (cw - iw) / 2, y + (chh - ih) / 2, iw, ih);
      const cap = r.kind === 'slot' ? slotLabel[r.label] : r.kind === 'part' ? `Schaden: ${partLabel[r.label] || r.label}` : r.kind === 'check' ? `Mangel: ${checkLabel[r.label] || ''}` : r.kind === 'wheel' ? wheelLabel[r.label] : 'Weiteres Foto';
      font(8, 'normal', COL.muted); text(wrap(cap || '', cw)[0], x, y + chh + 4);
      col++;
      if (col === cols) { col = 0; y += chh + 9; }
    }
  }

  // ---------- Fußzeile ----------
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    font(7, 'normal', COL.muted);
    text(T(`${titleOf(a)}${v.vin ? ' · ' + v.vin : ''}`), M, PH - 8);
    text(`Seite ${i} von ${n}`, PW - M, PH - 8, { align: 'right' });
  }
  return doc.output('blob');
}

const wear = (v) => (v === 'ok' ? 'i.O.' : v === 'worn' ? 'verschlissen' : '–');

async function shrink(blob, max) {
  const bmp = await createImageBitmap(blob);
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return { dataUrl: c.toDataURL('image/jpeg', 0.72), w: c.width, h: c.height };
}

