// Tab „Ergebnis“: Note, Hinweise, Ankaufsrechner, Status, Unterschrift, PDF
import { h, icon, input, segmented, section, fmtEuro, openSheet, confirmDialog } from '../ui.js';
import { evaluate, calcPrice } from '../eval.js';

const STATUS = [{ value: 'offen', label: 'Offen' }, { value: 'angekauft', label: 'Angekauft' }, { value: 'abgelehnt', label: 'Abgelehnt' }];

export function renderResult(ctx) {
  const { a, s, el } = ctx;
  const ev = evaluate(a, s);
  const C = a.calc;

  // Note
  const gradeCard = h('div', { class: 'grade-card g-' + ev.level },
    h('div', { class: 'grade-big' }, h('span', { class: 'grade-num' }, ev.grade), h('span', { class: 'grade-cap' }, 'Note')),
    h('div', { class: 'grade-info' },
      h('div', { class: 'grade-text' }, ev.gradeText),
      h('div', { class: 'score-bar' }, h('div', { class: 'score-fill', style: { width: ev.score + '%' } })),
      h('div', { class: 'muted small' }, `${ev.score} von 100 Punkten · Erfassung ${ev.completeness} %`)));

  const flags = ev.flags.length
    ? h('div', { class: 'card' }, ev.flags.map((f) => h('div', { class: 'flag f-' + f.level },
      icon(f.level === 'info' ? 'info' : 'alert', 20),
      h('div', null, h('div', { class: 'flag-title' }, f.title), f.text ? h('div', { class: 'flag-text' }, f.text) : null))))
    : h('div', { class: 'card pad ok-note' }, icon('check', 20), 'Keine Auffälligkeiten erfasst.');

  const stat = (label, value, sub, tab) => h('button', { type: 'button', class: 'stat', onclick: () => ctx.goTab(tab) },
    h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, value), h('span', { class: 'stat-sub' }, sub));
  const stats = h('div', { class: 'stats' },
    stat('Lack', `${ev.paint.measured}/${ev.progress.paint.total}`, `${ev.paint.warn} lackiert · ${ev.paint.bad} Spachtel`, 'karosserie'),
    stat('Schäden', String(ev.damages.length), fmtEuro(ev.damages.reduce((x, d) => x + d.cost, 0)), 'karosserie'),
    stat('Checkliste', `${ev.checks.done}/${ev.checks.total}`, `${ev.checks.nok} Mängel`, 'check'),
    stat('Reifen', `${ev.progress.tires.done}/4`, 'gemessen', 'reifen'));

  // Rechner
  const out = {
    dmg: h('span'), chk: h('span'), tires: h('span'), total: h('strong'),
    max: h('div', { class: 'price-big' }), offer: h('div', { class: 'price-mid' }), vat: h('div', { class: 'hint' }),
    ask: h('div', { class: 'compare' }), profit: h('div', { class: 'compare' }),
  };
  const upd = () => {
    const r = calcPrice(a, s, ev.layout);
    out.dmg.textContent = fmtEuro(r.dmg);
    out.chk.textContent = fmtEuro(r.chk);
    out.tires.textContent = fmtEuro(r.tires);
    out.total.textContent = fmtEuro(r.total);
    if (r.maxPrice == null) {
      out.max.textContent = '–';
      out.offer.textContent = 'Verkaufspreis eingeben';
      out.vat.textContent = '';
      out.ask.replaceChildren(); out.profit.replaceChildren();
      return;
    }
    out.max.textContent = fmtEuro(r.maxPrice);
    out.offer.textContent = `Einstiegsangebot ≈ ${fmtEuro(r.offer)}`;
    out.vat.textContent = s.vat25a ? `inkl. Differenzbesteuerung: USt auf Marge ≈ ${fmtEuro(r.vat)} · Gewinn ${fmtEuro(r.margin)}` : `Gewinn eingeplant: ${fmtEuro(r.margin)}`;
    if (r.ask != null) {
      const d = r.ask - r.maxPrice;
      out.ask.className = 'compare ' + (d <= 0 ? 'ok' : 'bad');
      out.ask.textContent = d <= 0 ? `Preisvorstellung liegt ${fmtEuro(-d)} unter deinem Limit ✓` : `Preisvorstellung liegt ${fmtEuro(d)} über deinem Limit`;
    } else out.ask.textContent = '';
    if (r.profit != null) {
      out.profit.className = 'compare ' + (r.profit >= r.margin ? 'ok' : r.profit >= 0 ? 'warn' : 'bad');
      out.profit.textContent = `Beim vereinbarten Preis: Gewinn ≈ ${fmtEuro(r.profit)}`;
    } else out.profit.textContent = '';
  };

  const money = (key, label, opts = {}) => h('label', { class: 'calc-row' + (opts.big ? ' big' : '') },
    h('span', { class: 'calc-label' }, label),
    h('span', { class: 'calc-input' }, input({ value: C[key], inputmode: 'numeric', placeholder: opts.placeholder || '0', cls: 'right', onInput: (v) => { C[key] = v; ctx.save(); upd(); } }), h('span', { class: 'unit' }, opts.unit || '€')));
  const auto = (label, node, tab) => h('button', { type: 'button', class: 'calc-row auto', onclick: () => ctx.goTab(tab) }, h('span', { class: 'calc-label' }, label), h('span', { class: 'calc-auto' }, node, icon('next', 16, 'muted')));

  const marginInput = h('span');
  const renderMargin = () => {
    marginInput.replaceChildren(C.marginMode === 'pct'
      ? h('span', { class: 'calc-input' }, input({ value: C.marginPct, inputmode: 'decimal', cls: 'right', onInput: (v) => { C.marginPct = v; ctx.save(); upd(); } }), h('span', { class: 'unit' }, '%'))
      : h('span', { class: 'calc-input' }, input({ value: C.marginEur, inputmode: 'numeric', cls: 'right', onInput: (v) => { C.marginEur = v; ctx.save(); upd(); } }), h('span', { class: 'unit' }, '€')));
  };
  renderMargin();

  const calc = h('div', { class: 'card calc' },
    money('vk', 'Erwarteter Verkaufspreis', { big: true }),
    money('reduction', 'Abschlag (Vorschaden, Ausstattung …)'),
    h('div', { class: 'calc-sep' }, 'Kosten'),
    auto('Schäden Karosserie', out.dmg, 'karosserie'),
    auto('Mängel Checkliste', out.chk, 'check'),
    auto('Reifen & Bremsen', out.tires, 'reifen'),
    money('prep', 'Aufbereitung'),
    money('service', 'Service / Inspektion / HU'),
    money('other', 'Sonstiges (Überführung, Standzeit …)'),
    money('risk', 'Risiko / Gewährleistung'),
    h('div', { class: 'calc-row sum' }, h('span', { class: 'calc-label' }, 'Kosten gesamt'), out.total),
    h('div', { class: 'calc-row' },
      h('span', { class: 'calc-label' }, 'Gewinn', segmented([{ value: 'eur', label: '€' }, { value: 'pct', label: '%' }], C.marginMode, (m) => { C.marginMode = m; ctx.save(); renderMargin(); upd(); }, { cls: 'tiny' })),
      marginInput),
    h('div', { class: 'price-box' }, h('div', { class: 'price-cap' }, 'Max. Ankaufspreis'), out.max, out.offer, out.vat),
    money('ask', 'Preisvorstellung Verkäufer'), out.ask,
    money('agreed', 'Vereinbarter Preis'), out.profit);

  // Unterschrift
  const sigBox = h('div', { class: 'sig-box' });
  const renderSig = () => {
    sigBox.replaceChildren(a.signature
      ? h('div', { class: 'sig-preview' }, h('img', { src: a.signature.dataUrl, alt: 'Unterschrift' }),
        h('div', { class: 'muted small' }, `${a.signature.name || 'Verkäufer'} · ${new Date(a.signature.at).toLocaleString('de-DE')}`),
        h('button', { type: 'button', class: 'btn-text danger', onclick: async () => {
          if (await confirmDialog({ title: 'Unterschrift entfernen?', confirmText: 'Entfernen', danger: true })) { a.signature = null; ctx.save(); renderSig(); }
        } }, 'Entfernen'))
      : h('button', { type: 'button', class: 'btn block', onclick: () => signaturePad(a, () => { ctx.save(); renderSig(); }) }, icon('pen', 20), 'Unterschrift Verkäufer erfassen'));
  };
  renderSig();

  el.append(
    gradeCard,
    h('h3', { class: 'group-title' }, 'Hinweise'), flags,
    stats,
    h('h3', { class: 'group-title' }, 'Ankaufsrechner'), calc,
    section('Status', segmented(STATUS, a.status, (v) => { a.status = v; ctx.save(); })),
    section('Unterschrift (optional)', sigBox),
    h('button', { type: 'button', class: 'btn primary big block', onclick: async () => {
      const { createPDF } = await import('../pdf.js');
      createPDF(a);
    } }, icon('pdf', 22), 'PDF-Protokoll erstellen'),
    h('p', { class: 'hint center pad' }, 'Die Note ist eine Orientierung aus deinen Eingaben – je vollständiger die Erfassung, desto aussagekräftiger.'));
  upd();
}

function signaturePad(a, onSave) {
  const canvas = h('canvas', { class: 'sig-canvas' });
  const nameInp = input({ value: a.v.sellerName, placeholder: 'Name des Unterzeichners', autocap: 'words' });
  let ctx2d, drawing = false, dirty = false, last = null;
  const sheet = openSheet({
    title: 'Unterschrift',
    doneLabel: 'Abbrechen',
    content: h('div', { class: 'sig' },
      h('div', { class: 'hint' }, 'Mit dem Finger im Feld unterschreiben.'),
      canvas,
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Name'), nameInp),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', onclick: () => { ctx2d.clearRect(0, 0, canvas.width, canvas.height); dirty = false; } }, 'Löschen'),
        h('button', { type: 'button', class: 'btn primary grow', onclick: () => {
          if (!dirty) return;
          a.signature = { dataUrl: canvas.toDataURL('image/png'), name: nameInp.value.trim(), at: new Date().toISOString() };
          sheet.close();
          onSave();
        } }, 'Übernehmen'))),
  });
  requestAnimationFrame(() => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx2d = canvas.getContext('2d');
    ctx2d.scale(dpr, dpr);
    ctx2d.lineWidth = 2.4; ctx2d.lineCap = 'round'; ctx2d.lineJoin = 'round'; ctx2d.strokeStyle = '#111';
  });
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx2d.beginPath(); ctx2d.moveTo(last.x, last.y); ctx2d.lineTo(p.x, p.y); ctx2d.stroke();
    last = p; dirty = true; e.preventDefault();
  });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
