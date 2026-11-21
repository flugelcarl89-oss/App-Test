// Tab „Karosserie“: Skizze, Teile-Details, Lack-Rundgang
import { h, icon, segmented, chips, input, textarea, openSheet, parseInt2, fmtEuro, toast, confirmDialog } from '../ui.js';
import { buildLayout, sketchSVG, walkOrder } from '../sketch.js';
import { partInfoFn, paintMax, paintLevel, PAINT_TEXT, defaultDamageCost, damageList, tireStatus } from '../eval.js';
import { DAMAGE_TYPES, MATERIALS, SEVERITIES, WHEELS, damageLabel } from '../data.js';
import { part } from '../store.js';
import { photoStrip } from '../photos.js';

let viewMode = 'all';

export function renderBody(ctx) {
  const { a, s, el } = ctx;
  const layout = buildLayout(a);
  const sketchBox = h('div', { class: 'sketch' });
  const findings = h('div', { class: 'findings' });

  const draw = () => {
    sketchBox.innerHTML = sketchSVG(a, layout, partInfoFn(a, s, viewMode), {
      wheelInfo: (id) => ({ status: tireStatus(a.tires.wheels[id], s) }),
    });
    renderFindings();
  };

  sketchBox.addEventListener('click', (e) => {
    const g = e.target.closest('[data-part]');
    if (g) { openPart(ctx, layout, g.dataset.part, draw); return; }
    const w = e.target.closest('[data-wheel]');
    if (w) ctx.goTab('reifen');
  });

  const renderFindings = () => {
    const rows = [];
    for (const p of walkOrder(layout)) {
      const d = a.parts[p.id];
      if (!d) continue;
      const mx = paintMax(d);
      const lvl = paintLevel(mx, s);
      const dm = d.damages || [];
      if (!dm.length && (!lvl || lvl === 'ok') && !d.note) continue;
      const st = dm.some((x) => x.severity === 'stark') || lvl === 'bad' ? 'bad' : 'warn';
      rows.push(h('button', { type: 'button', class: 'finding', onclick: () => openPart(ctx, layout, p.id, draw) },
        h('span', { class: 'dot s-' + st }),
        h('span', { class: 'finding-main' },
          h('span', { class: 'finding-title' }, p.label),
          h('span', { class: 'finding-sub' }, [
            mx != null ? `${mx} µm (${PAINT_TEXT[lvl]})` : null,
            ...dm.map((x) => `${damageLabel(p.kind, x.type)} ${x.severity}`),
            d.note || null,
          ].filter(Boolean).join(' · '))),
        h('span', { class: 'finding-cost' }, dm.length ? fmtEuro(dm.reduce((sum, x) => sum + (parseInt2(x.cost) || 0), 0)) : ''),
        icon('next', 18, 'muted')));
    }
    const total = damageList(a, layout).reduce((sum, x) => sum + x.cost, 0);
    findings.replaceChildren(
      h('h3', { class: 'group-title' }, 'Befunde'),
      rows.length ? h('div', { class: 'card' }, ...rows,
        h('div', { class: 'finding total' }, h('span', { class: 'finding-main' }, 'Reparaturkosten geschätzt'), h('strong', null, fmtEuro(total))))
        : h('div', { class: 'card pad muted' }, 'Noch keine Befunde. Tippe auf ein Teil in der Skizze.'));
  };

  const unchecked = () => layout.parts.filter((p) => { const d = a.parts[p.id]; return !d || (!d.ok && paintMax(d) == null && !d.damages?.length); });

  el.append(
    h('div', { class: 'body-toolbar' },
      segmented([{ value: 'all', label: 'Gesamt' }, { value: 'paint', label: 'Lack' }, { value: 'damage', label: 'Schäden' }], viewMode, (m) => { viewMode = m; draw(); }, { cls: 'small' })),
    h('div', { class: 'card sketch-card' },
      sketchBox,
      h('div', { class: 'legend' },
        h('span', null, h('i', { class: 'dot s-none' }), 'offen'),
        h('span', null, h('i', { class: 'dot s-ok' }), `i.O. ≤ ${s.paintOkMax}`),
        h('span', null, h('i', { class: 'dot s-warn' }), `lackiert ≤ ${s.paintWarnMax}`),
        h('span', null, h('i', { class: 'dot s-bad' }), 'Spachtel / stark'))),
    h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => paintWalk(ctx, layout, draw) }, icon('walk', 20), 'Lack-Rundgang'),
      h('button', { type: 'button', class: 'btn', onclick: async () => {
        const list = unchecked();
        if (!list.length) { toast('Alle Teile sind bereits erfasst'); return; }
        if (await confirmDialog({ title: 'Restliche Teile i.O.?', message: `${list.length} noch offene Teile als „ohne Befund“ markieren.`, confirmText: 'Markieren' })) {
          list.forEach((p) => { part(a, p.id).ok = true; });
          ctx.save(); draw();
        }
      } }, icon('check', 20), 'Rest i.O.')),
    findings,
    h('button', { type: 'button', class: 'btn primary block next-step', onclick: () => ctx.goTab('reifen') }, 'Weiter zu Reifen', icon('next', 20)));
  draw();
}

// ---------- Teil-Details ----------
function openPart(ctx, layout, partId, onChange) {
  const { a, s } = ctx;
  const def = layout.parts.find((p) => p.id === partId);
  const p = part(a, partId);
  if (p.material == null && def.material) p.material = def.material;
  const changed = () => { ctx.save(); onChange(); };

  openSheet({
    title: def.label,
    onClose: () => { if (!p.damages.length && !p.paint.length && !p.ok && !p.note && !p.photos.length) delete a.parts[partId]; changed(); },
    content: (body) => {
      const okBtn = h('button', { type: 'button', class: 'btn block ok-toggle' + (p.ok ? ' on' : ''), onclick: () => {
        p.ok = !p.ok; okBtn.classList.toggle('on', p.ok); okBtn.lastChild.textContent = p.ok ? 'Ohne Befund ✓' : 'Ohne Befund (i.O.)'; changed();
      } }, icon('check', 20), h('span', null, p.ok ? 'Ohne Befund ✓' : 'Ohne Befund (i.O.)'));

      const blocks = [okBtn];
      if (def.kind === 'paint') blocks.push(paintBlock(p, s, changed));
      blocks.push(damageBlock(def, p, s, changed));
      blocks.push(h('div', { class: 'block' }, h('div', { class: 'block-title' }, 'Fotos'), photoStrip(a, p.photos, changed, partId)));
      blocks.push(h('div', { class: 'block' }, h('div', { class: 'block-title' }, 'Notiz'),
        textarea({ value: p.note, rows: 2, placeholder: 'z. B. Delle ca. 2 cm, Lackierkante sichtbar', onInput: (v) => { p.note = v; ctx.save(); } })));
      body.append(...blocks);
    },
  });
}

function paintBlock(p, s, changed) {
  const chipsBox = h('div', { class: 'paint-chips' });
  const summary = h('div', { class: 'paint-summary' });
  const inp = input({ inputmode: 'numeric', placeholder: 'µm', cls: 'paint-input', enterkeyhint: 'done' });
  const add = () => {
    const n = parseInt2(inp.value);
    if (n == null || n <= 0 || n > 5000) { inp.focus(); return; }
    p.paint.push(n); inp.value = ''; renderChips(); changed();
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  const renderChips = () => {
    chipsBox.replaceChildren(...p.paint.map((v, i) => {
      const lvl = paintLevel(v, s);
      return h('button', { type: 'button', class: 'pchip s-' + lvl, onclick: () => { p.paint.splice(i, 1); renderChips(); changed(); } }, `${v} µm`, icon('x', 14));
    }));
    const mx = paintMax(p);
    const lvl = paintLevel(mx, s);
    summary.className = 'paint-summary s-' + (lvl || 'none');
    summary.textContent = mx != null ? `Max. ${mx} µm · ${PAINT_TEXT[lvl]}` : 'Noch kein Messwert';
  };
  renderChips();
  const quick = [100, 120, 140, 200, 300, 500].map((v) => h('button', { type: 'button', class: 'quick', onclick: () => { p.paint.push(v); renderChips(); changed(); } }, v));
  const matSeg = segmented(MATERIALS, p.material, (m) => { p.material = m; matHint.textContent = hintFor(m); changed(); }, { cls: 'small', allowNone: true });
  const hintFor = (m) => m === 'kunststoff' ? 'Auf Kunststoff misst ein magnetisches Lackmessgerät nicht – nur Sichtprüfung oder Ultraschall.' : m === 'alu' ? 'Alu: Gerät auf NFe-Modus stellen.' : '';
  const matHint = h('div', { class: 'hint' }, hintFor(p.material));
  return h('div', { class: 'block' },
    h('div', { class: 'block-title' }, 'Material'), matSeg, matHint,
    h('div', { class: 'block-title' }, 'Lackschichtdicke'),
    h('div', { class: 'paint-entry' }, inp, h('button', { type: 'button', class: 'btn primary', onclick: add }, icon('plus', 18), 'Wert')),
    h('div', { class: 'quick-row' }, quick),
    chipsBox, summary,
    h('div', { class: 'hint' }, `Mehrere Messpunkte möglich – gewertet wird der höchste. Bis ${s.paintOkMax} µm original, bis ${s.paintWarnMax} µm nachlackiert, darüber Spachtel.`));
}

function damageBlock(def, p, s, changed) {
  const types = DAMAGE_TYPES[def.kind] || DAMAGE_TYPES.paint;
  const list = h('div', { class: 'damage-list' });
  const render = () => {
    list.replaceChildren(...p.damages.map((d, i) => {
      const cost = input({ value: d.cost, inputmode: 'numeric', placeholder: '0', cls: 'cost', onInput: (v) => { d.cost = v; d.costAuto = false; changed(); } });
      return h('div', { class: 'damage' },
        h('div', { class: 'damage-head' },
          h('strong', null, damageLabel(def.kind, d.type)),
          h('button', { type: 'button', class: 'icon-btn small danger', 'aria-label': 'Schaden entfernen', onclick: () => { p.damages.splice(i, 1); render(); changed(); } }, icon('trash', 18))),
        segmented(SEVERITIES, d.severity, (v) => {
          d.severity = v;
          if (d.costAuto !== false) { d.cost = String(defaultDamageCost(v, s)); cost.value = d.cost; }
          changed();
        }, { cls: 'small' }),
        h('div', { class: 'damage-row' },
          h('label', { class: 'mini-field' }, h('span', null, 'Kosten ca.'), cost, h('span', { class: 'unit' }, '€')),
          input({ value: d.note, placeholder: 'Notiz (Größe, Lage …)', cls: 'grow', onInput: (v) => { d.note = v; changed(); } })));
    }));
  };
  render();
  return h('div', { class: 'block' },
    h('div', { class: 'block-title' }, 'Schaden hinzufügen'),
    h('div', { class: 'add-chips' }, types.map((t) => h('button', { type: 'button', class: 'add-chip', onclick: () => {
      p.damages.push({ type: t.id, severity: 'leicht', cost: String(defaultDamageCost('leicht', s)), costAuto: true, note: '' });
      p.ok = false;
      render(); changed();
      list.lastChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } }, '+ ', t.label))),
    list);
}

// ---------- Lack-Rundgang ----------
function paintWalk(ctx, layout, onDone) {
  const { a, s } = ctx;
  const order = walkOrder(layout).filter((d) => d.kind === 'paint');
  let idx = Math.max(0, order.findIndex((d) => paintMax(a.parts[d.id]) == null && !a.parts[d.id]?.ok));
  const mini = h('div', { class: 'sketch mini' });
  const name = h('div', { class: 'walk-name' });
  const step = h('div', { class: 'walk-step' });
  const vals = h('div', { class: 'paint-chips center' });
  const status = h('div', { class: 'paint-summary' });
  const matNote = h('div', { class: 'hint center' });
  const inp = input({ inputmode: 'numeric', placeholder: 'µm', cls: 'walk-input', enterkeyhint: 'next' });

  const cur = () => order[idx];
  const show = () => {
    const d = cur();
    const p = a.parts[d.id];
    name.textContent = d.label;
    step.textContent = `Teil ${idx + 1} von ${order.length}`;
    mini.innerHTML = sketchSVG(a, layout, partInfoFn(a, s, 'paint'), { highlight: d.id });
    const pv = p?.paint || [];
    vals.replaceChildren(...pv.map((v, i) => h('button', { type: 'button', class: 'pchip s-' + paintLevel(v, s), onclick: () => { pv.splice(i, 1); ctx.save(); show(); } }, `${v} µm`, icon('x', 14))));
    const mx = paintMax(p);
    const lvl = paintLevel(mx, s);
    status.className = 'paint-summary s-' + (lvl || 'none');
    status.textContent = mx != null ? `Max. ${mx} µm · ${PAINT_TEXT[lvl]}` : (p?.ok ? 'Ohne Befund' : 'Messwert eingeben');
    const mat = p?.material ?? d.material;
    matNote.textContent = mat === 'kunststoff' ? 'Kunststoffteil – meist nicht messbar, ggf. überspringen.' : '';
    prevBtn.disabled = idx === 0;
    nextBtn.lastChild.textContent = idx === order.length - 1 ? 'Fertig' : 'Weiter';
  };
  const addVal = () => {
    const n = parseInt2(inp.value);
    if (n == null || n <= 0 || n > 5000) return false;
    const p = part(a, cur().id);
    p.paint.push(n);
    inp.value = '';
    ctx.save();
    return true;
  };
  const move = (dir) => {
    addVal();
    if (dir > 0 && idx === order.length - 1) { sheet.close(); return; }
    idx = Math.min(order.length - 1, Math.max(0, idx + dir));
    show();
    inp.focus();
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); move(1); } });

  const prevBtn = h('button', { type: 'button', class: 'btn', onclick: () => move(-1) }, icon('back', 20), h('span', null, 'Zurück'));
  const nextBtn = h('button', { type: 'button', class: 'btn primary grow', onclick: () => move(1) }, h('span', null, 'Weiter'));
  const sheet = openSheet({
    title: 'Lack-Rundgang',
    full: true,
    onClose: () => { addVal(); onDone(); },
    content: h('div', { class: 'walk' },
      mini,
      h('div', { class: 'walk-head' }, step, name),
      vals, status, matNote,
      h('div', { class: 'walk-entry' },
        inp,
        h('button', { type: 'button', class: 'btn', onclick: () => { if (addVal()) show(); inp.focus(); } }, icon('plus', 18), 'Messpunkt')),
      h('div', { class: 'btn-row' }, prevBtn,
        h('button', { type: 'button', class: 'btn', onclick: () => { const p = part(a, cur().id); if (!p.paint.length) p.ok = true; ctx.save(); move(1); } }, 'i.O. / überspringen'),
        nextBtn),
      h('div', { class: 'hint center' }, 'Wert eintippen → „Weiter“. Mit „Messpunkt“ mehrere Werte pro Teil.')),
  });
  show();
  setTimeout(() => inp.focus(), 50);
}
