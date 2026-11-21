// Tab „Checkliste“: i.O. / Mangel / n.v. je Punkt
import { h, icon, input, toast } from '../ui.js';
import { checkGroups, checkStats } from '../eval.js';
import { check } from '../store.js';
import { photoStrip } from '../photos.js';

const collapsed = new Set();

export function renderChecklist(ctx) {
  const { a, s, el } = ctx;
  const groups = checkGroups(a, s);
  const progress = h('div', { class: 'progress' }, h('div', { class: 'progress-fill' }));
  const progText = h('div', { class: 'progress-text' });
  const counters = new Map();

  const upd = () => {
    const st = checkStats(a, s);
    progress.firstChild.style.width = (st.total ? (100 * st.done) / st.total : 0) + '%';
    progText.textContent = `${st.done} von ${st.total} geprüft · ${st.nok} Mängel`;
    for (const g of groups) {
      const done = g.items.filter((i) => a.checks[i.id]?.s).length;
      const nok = g.items.filter((i) => a.checks[i.id]?.s === 'nok').length;
      const c = counters.get(g.id);
      if (c) { c.textContent = `${done}/${g.items.length}`; c.className = 'grp-count' + (nok ? ' bad' : done === g.items.length ? ' ok' : ''); }
    }
  };

  const itemRow = (it) => {
    const row = h('div', { class: 'chk' });
    const details = h('div', { class: 'chk-details' });
    const setState = (val) => {
      const cc = check(a, it.id);
      cc.s = cc.s === val ? null : val;
      paint();
      ctx.save(); upd();
    };
    const btn = (val, ic, label) => h('button', { type: 'button', class: 'chk-btn v-' + val, 'aria-label': label, onclick: () => setState(val) }, ic ? icon(ic, 18) : h('span', { class: 'na' }, 'n.v.'));
    const bOk = btn('ok', 'check', 'In Ordnung');
    const bNok = btn('nok', 'x', 'Mangel');
    const bNa = btn('na', null, 'Nicht vorhanden');
    const paint = () => {
      const cc = a.checks[it.id];
      const v = cc?.s || null;
      row.className = 'chk' + (v ? ' st-' + v : '');
      [bOk, bNok, bNa].forEach((b) => b.classList.toggle('on', b.classList.contains('v-' + v)));
      if (v === 'nok') {
        if (!details.childElementCount) {
          cc.photos = cc.photos || [];
          details.append(
            h('div', { class: 'chk-fields' },
              input({ value: cc.note, placeholder: 'Was genau? (Notiz)', cls: 'grow', onInput: (x) => { cc.note = x; ctx.save(); } }),
              h('label', { class: 'mini-field' }, input({ value: cc.cost, placeholder: 'Kosten', inputmode: 'numeric', cls: 'cost', onInput: (x) => { cc.cost = x; ctx.save(); upd(); } }), h('span', { class: 'unit' }, '€'))),
            photoStrip(a, cc.photos, () => ctx.save(), it.id));
        }
      } else details.replaceChildren();
    };
    row.append(
      h('div', { class: 'chk-main' },
        h('div', { class: 'chk-label' }, it.label, it.critical ? h('span', { class: 'crit', title: 'Wichtiger Punkt' }, '!') : null),
        h('div', { class: 'chk-btns' }, bOk, bNok, bNa)),
      details);
    paint();
    return row;
  };

  el.append(
    h('div', { class: 'card pad progress-card' }, progText, progress),
    ...groups.map((g) => {
      const counter = h('span', { class: 'grp-count' });
      counters.set(g.id, counter);
      const list = h('div', { class: 'card' + (collapsed.has(g.id) ? ' hidden' : '') }, g.items.map(itemRow),
        h('button', { type: 'button', class: 'chk-all', onclick: () => {
          let n = 0;
          for (const it of g.items) { const cc = check(a, it.id); if (!cc.s) { cc.s = 'ok'; n++; } }
          if (!n) { toast('Alle Punkte bereits bewertet'); return; }
          ctx.save(); ctx.rerender();
        } }, icon('check', 16), 'Offene Punkte dieser Gruppe i.O.'));
      return h('section', { class: 'group' },
        h('button', { type: 'button', class: 'grp-head', onclick: (e) => {
          if (collapsed.has(g.id)) collapsed.delete(g.id); else collapsed.add(g.id);
          list.classList.toggle('hidden');
          e.currentTarget.classList.toggle('closed');
        } }, h('span', { class: 'grp-title' }, g.label), counter, icon('down', 18, 'chev')),
        list);
    }),
    h('p', { class: 'hint pad' }, 'Eigene Prüfpunkte kannst du in den Einstellungen ergänzen. „!“ = wichtiger Punkt, fließt stärker in die Note ein.'),
    h('button', { type: 'button', class: 'btn primary block next-step', onclick: () => ctx.goTab('fotos') }, 'Weiter zu Fotos', icon('next', 20)));
  // Pfeil-Zustand setzen
  el.querySelectorAll('.grp-head').forEach((hd, i) => hd.classList.toggle('closed', collapsed.has(groups[i].id)));
  upd();
}
