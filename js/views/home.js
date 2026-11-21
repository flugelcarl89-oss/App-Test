// Übersicht aller Bewertungen
import { h, icon, input, fmtDate, fmtEuro, fmtKm, parseInt2 } from '../ui.js';
import { listAssessments, state } from '../store.js';
import { evaluate, calcPrice, titleOf } from '../eval.js';
import { typeById } from '../data.js';
import { go } from '../nav.js';
import { typeIcon } from './typeIcons.js';
import { photoURL } from '../photos.js';

const STATUS = { offen: 'Offen', angekauft: 'Angekauft', abgelehnt: 'Abgelehnt' };
let filter = { q: '', status: 'alle' };

export async function renderHome(root) {
  const all = await listAssessments();
  const s = state.settings;
  const list = h('div', { class: 'list' });

  const renderList = () => {
    const q = filter.q.trim().toLowerCase();
    const items = all.filter((a) => {
      if (filter.status !== 'alle' && a.status !== filter.status) return false;
      if (!q) return true;
      return [a.v.make, a.v.model, a.v.variant, a.v.plate, a.v.vin, a.v.sellerName, typeById(a.type).label]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
    if (!all.length) {
      list.replaceChildren(h('div', { class: 'empty' },
        h('div', { class: 'empty-art' }, typeIcon('limousine')),
        h('h2', null, 'Noch keine Bewertungen'),
        h('p', null, 'Tippe auf „Neue Bewertung“, wähle den Fahrzeugtyp und los geht’s.')));
      return;
    }
    if (!items.length) { list.replaceChildren(h('p', { class: 'muted center pad' }, 'Keine Treffer.')); return; }
    list.replaceChildren(...items.map((a) => card(a, s)));
  };

  const search = input({ value: filter.q, placeholder: 'Suchen: Marke, Kennzeichen, FIN …', type: 'search', cls: 'search', onInput: (v) => { filter.q = v; renderList(); } });
  const statusSeg = h('div', { class: 'filter-row' }, ['alle', 'offen', 'angekauft', 'abgelehnt'].map((k) =>
    h('button', { type: 'button', class: 'pill' + (filter.status === k ? ' on' : ''), onclick: (e) => {
      filter.status = k;
      e.currentTarget.parentElement.querySelectorAll('.pill').forEach((p) => p.classList.remove('on'));
      e.currentTarget.classList.add('on');
      renderList();
    } }, k === 'alle' ? `Alle (${all.length})` : `${STATUS[k]} (${all.filter((a) => a.status === k).length})`)));

  root.replaceChildren(
    h('header', { class: 'topbar large' },
      h('div', { class: 'topbar-row' },
        h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, icon('car', 20)), 'Fahrzeugcheck'),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Einstellungen', onclick: () => go('/settings') }, icon('gear', 22)))),
    h('main', { class: 'page' },
      h('button', { type: 'button', class: 'btn primary big block', onclick: () => go('/new') }, icon('plus', 22), 'Neue Bewertung'),
      all.length ? h('div', { class: 'search-wrap' }, icon('search', 18, 'search-ico'), search) : null,
      all.length ? statusSeg : null,
      list));
  renderList();
}

function card(a, s) {
  const ev = evaluate(a, s);
  const price = calcPrice(a, s, ev.layout);
  const t = typeById(a.type);
  const img = h('div', { class: 'card-thumb' }, typeIcon(a.type));
  const firstPhoto = a.photos.slots.front_left || a.photos.slots.front || Object.values(a.photos.slots).find(Boolean);
  if (firstPhoto) photoURL(firstPhoto).then((u) => { if (u) img.replaceChildren(h('img', { src: u, alt: '' })); });
  const km = parseInt2(a.v.km);
  const sub = [t.label, a.v.plate, km != null ? fmtKm(km) : null].filter(Boolean).join(' · ');
  return h('button', { type: 'button', class: 'a-card', onclick: () => go(`/a/${a.id}/${a.v.make || a.v.vin ? 'ergebnis' : 'daten'}`) },
    img,
    h('div', { class: 'a-card-main' },
      h('div', { class: 'a-card-title' }, titleOf(a)),
      h('div', { class: 'a-card-sub' }, sub),
      h('div', { class: 'a-card-meta' },
        h('span', { class: 'tag st-' + a.status }, STATUS[a.status] || a.status),
        h('span', { class: 'muted' }, fmtDate(a.updatedAt)),
        price.agreed != null ? h('span', { class: 'muted' }, 'Preis ' + fmtEuro(price.agreed)) : price.maxPrice != null ? h('span', { class: 'muted' }, 'max. ' + fmtEuro(price.maxPrice)) : null)),
    h('div', { class: 'grade-badge g-' + ev.level, title: ev.gradeText }, h('span', { class: 'grade-num' }, ev.grade), h('span', { class: 'grade-cap' }, 'Note')));
}
