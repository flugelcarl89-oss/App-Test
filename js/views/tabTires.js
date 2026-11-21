// Tab „Reifen“: Profiltiefe, DOT, Radsatz, Bremsen
import { h, icon, input, segmented, chips, field, section, toggle, fmtDec, fmtEuro, parseDec, textarea } from '../ui.js';
import { WHEELS, SEASONS } from '../data.js';
import { tireStatus, dotAge, tireCostSuggestion } from '../eval.js';

const WEAR = [{ value: 'ok', label: 'i.O.' }, { value: 'worn', label: 'Verschlissen' }];

export function renderTires(ctx) {
  const { a, s, el } = ctx;
  const T = a.tires;
  const costBox = h('div', { class: 'cost-box' });

  const updCost = () => {
    const sg = tireCostSuggestion(a, s);
    const override = input({ value: T.costOverride, inputmode: 'numeric', placeholder: String(sg.cost), cls: 'right', onInput: (v) => { T.costOverride = v; ctx.save(); } });
    costBox.replaceChildren(
      h('div', { class: 'kv' }, h('span', null, 'Vorschlag'), h('strong', null, fmtEuro(sg.cost))),
      sg.lines.length ? h('div', { class: 'hint' }, sg.lines.join(' · ')) : h('div', { class: 'hint' }, `Reifen unter ${fmtDec(s.tireMinDepth)} mm oder älter als 8 Jahre werden achsweise eingeplant.`),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Eigener Betrag (optional)'), h('span', { class: 'field-control' }, override, h('span', { class: 'unit' }, '€'))));
  };

  const wheelCard = (w) => {
    const t = T.wheels[w.id] || (T.wheels[w.id] = {});
    const card = h('div', { class: 'wheel-card' });
    const ageEl = h('div', { class: 'wheel-age' });
    const setStatus = () => {
      card.className = `wheel-card w-${w.id} s-${tireStatus(t, s)}`;
      const ag = dotAge(t.dot);
      ageEl.textContent = ag ? `KW ${ag.week}/${ag.year} · ${fmtDec(ag.age)} J.` : 'DOT: Woche + Jahr, z. B. 2321';
    };
    const depth = input({ value: t.depth, inputmode: 'decimal', placeholder: '0,0', cls: 'depth', onInput: (v) => { t.depth = v; setStatus(); updCost(); ctx.save(); } });
    const dot = input({ value: t.dot, inputmode: 'numeric', placeholder: 'DOT', maxlength: 4, cls: 'dot-inp', onInput: (v) => { t.dot = v; setStatus(); updCost(); ctx.save(); } });
    const dmg = h('button', { type: 'button', class: 'mini-toggle' + (t.damage ? ' on' : ''), onclick: () => {
      t.damage = !t.damage; dmg.classList.toggle('on', t.damage); setStatus(); updCost(); ctx.save();
    } }, 'Schaden');
    card.append(
      h('div', { class: 'wheel-head' }, h('strong', null, w.short), h('span', { class: 'muted small' }, w.label)),
      h('label', { class: 'depth-wrap' }, depth, h('span', { class: 'unit' }, 'mm')),
      h('label', { class: 'dot-wrap' }, dot),
      ageEl, dmg);
    setStatus();
    return card;
  };

  const copyAll = () => {
    const src = T.wheels.fl;
    for (const w of ['fr', 'rl', 'rr']) T.wheels[w] = { ...T.wheels[w], depth: src.depth || '', dot: src.dot || '' };
    ctx.save(); ctx.rerender();
  };

  const second = h('div');
  const renderSecond = () => {
    second.replaceChildren(...(T.second.has ? [h('div', { class: 'sub-fields' },
      field('Saison', chips(SEASONS, T.second.season, (v) => { T.second.season = v || ''; ctx.save(); })),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Profil ca.'), h('span', { class: 'field-control' },
        input({ value: T.second.depth, inputmode: 'decimal', placeholder: '0,0', onInput: (v) => { T.second.depth = v; ctx.save(); } }), h('span', { class: 'unit' }, 'mm'))),
      toggle(T.second.onRims, (v) => { T.second.onRims = v; ctx.save(); }, 'Auf Felgen'),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Notiz'), input({ value: T.second.note, placeholder: 'Marke, Größe, Zustand', onInput: (v) => { T.second.note = v; ctx.save(); } })))]
      : []));
  };
  renderSecond();

  const brakeRow = (axle, label) => {
    const b = T.brakes[axle];
    return h('div', { class: 'brake-row' },
      h('div', { class: 'brake-label' }, label),
      field('Scheiben', segmented(WEAR, b.discs, (v) => { b.discs = v; updCost(); ctx.save(); }, { cls: 'small', allowNone: true })),
      field('Beläge', segmented(WEAR, b.pads, (v) => { b.pads = v; updCost(); ctx.save(); }, { cls: 'small', allowNone: true })));
  };

  el.append(
    h('div', { class: 'tires-head' },
      h('h3', { class: 'group-title' }, 'Profiltiefe & DOT'),
      h('button', { type: 'button', class: 'btn-text', onclick: copyAll }, 'VL auf alle übertragen')),
    h('div', { class: 'wheels-grid' },
      h('div', { class: 'wheels-car' }, h('span', null, 'vorne')),
      ...WHEELS.map(wheelCard)),
    h('div', { class: 'legend' },
      h('span', null, h('i', { class: 'dot s-ok' }), `≥ ${fmtDec(s.tireMinDepth)} mm`),
      h('span', null, h('i', { class: 'dot s-warn' }), `< ${fmtDec(s.tireMinDepth)} mm / > 6 J.`),
      h('span', null, h('i', { class: 'dot s-bad' }), '< 1,6 mm / > 10 J.')),
    section('Montierter Radsatz',
      field('Saison', chips(SEASONS, T.season, (v) => { T.season = v || ''; ctx.save(); })),
      h('div', { class: 'field-pair' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Größe'), input({ value: T.size, placeholder: '205/55 R16', onInput: (v) => { T.size = v; ctx.save(); } })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Marke'), input({ value: T.brand, placeholder: 'z. B. Michelin', autocap: 'words', onInput: (v) => { T.brand = v; ctx.save(); } }))),
      field('Felgen', chips([{ value: 'alu', label: 'Alu' }, { value: 'stahl', label: 'Stahl' }], T.rims, (v) => { T.rims = v || ''; ctx.save(); })),
      field('Felgenzustand', chips([{ value: 'ok', label: 'i.O.' }, { value: 'bordstein', label: 'Bordsteinschäden' }, { value: 'defekt', label: 'Beschädigt' }], T.rimState, (v) => { T.rimState = v || ''; ctx.save(); }))),
    section('Zweiter Radsatz',
      toggle(T.second.has, (v) => { T.second.has = v; ctx.save(); renderSecond(); }, 'Zweiter Radsatz vorhanden'),
      second),
    section('Ersatzrad',
      field('Vorhanden', chips([{ value: 'reserve', label: 'Reserverad' }, { value: 'not', label: 'Notrad' }, { value: 'set', label: 'Pannenset' }, { value: 'keins', label: 'Keins' }], T.spare, (v) => { T.spare = v || ''; ctx.save(); }))),
    section('Bremsen', brakeRow('front', 'Vorderachse'), brakeRow('rear', 'Hinterachse')),
    section('Kosten Reifen & Bremsen', costBox),
    section('Notiz', h('label', { class: 'field' }, textarea({ value: T.note, rows: 2, placeholder: 'z. B. Laufrichtung, Verschleiß einseitig …', onInput: (v) => { T.note = v; ctx.save(); } }))),
    h('button', { type: 'button', class: 'btn primary block next-step', onclick: () => ctx.goTab('check') }, 'Weiter zur Checkliste', icon('next', 20)));
  updCost();
}
