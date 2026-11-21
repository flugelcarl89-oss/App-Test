// Neue Bewertung: Fahrzeugtyp wählen
import { h, icon } from '../ui.js';
import { VEHICLE_TYPES } from '../data.js';
import { createAssessment, putAssessment } from '../store.js';
import { go } from '../nav.js';
import { typeIcon } from './typeIcons.js';

export function renderNew(root) {
  const pick = async (t) => {
    const a = createAssessment(t.id);
    await putAssessment(a);
    go(`/a/${a.id}/daten`, { replace: true });
  };
  root.replaceChildren(
    h('header', { class: 'topbar' },
      h('div', { class: 'topbar-row' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Zurück', onclick: () => history.length > 1 ? history.back() : go('/') }, icon('back', 24)),
        h('div', { class: 'topbar-title' }, 'Fahrzeugtyp'),
        h('span', { class: 'icon-btn placeholder' }))),
    h('main', { class: 'page' },
      h('p', { class: 'lead' }, 'Welche Art von Fahrzeug bewertest du?'),
      h('div', { class: 'type-grid' }, VEHICLE_TYPES.map((t) =>
        h('button', { type: 'button', class: 'type-tile', onclick: () => pick(t) }, typeIcon(t.id), h('span', { class: 'type-label' }, t.label)))),
      h('p', { class: 'muted small center' }, 'Türen und Typ lassen sich später unter „Daten“ noch ändern.')));
}
