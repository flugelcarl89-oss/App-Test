// Bewertung: Kopfzeile, Tabs, Menü
import { h, icon, actionSheet, confirmDialog, toast } from '../ui.js';
import { getAssessment, save, state, deleteAssessment, createAssessment, putAssessment } from '../store.js';
import { titleOf } from '../eval.js';
import { typeById } from '../data.js';
import { go } from '../nav.js';
import { renderVehicle } from './tabVehicle.js';
import { renderBody } from './tabBody.js';
import { renderTires } from './tabTires.js';
import { renderChecklist } from './tabChecklist.js';
import { renderPhotos } from './tabPhotos.js';
import { renderResult } from './tabResult.js';

const TABS = [
  { id: 'daten', label: 'Daten', icon: 'data', render: renderVehicle },
  { id: 'karosserie', label: 'Karosserie', icon: 'body', render: renderBody },
  { id: 'reifen', label: 'Reifen', icon: 'tire', render: renderTires },
  { id: 'check', label: 'Checkliste', icon: 'list', render: renderChecklist },
  { id: 'fotos', label: 'Fotos', icon: 'image', render: renderPhotos },
  { id: 'ergebnis', label: 'Ergebnis', icon: 'result', render: renderResult },
];

let cur = null;

export async function renderAssessment(root, id, tabId) {
  const tab = TABS.find((t) => t.id === tabId) || TABS[0];
  if (!cur || cur.a.id !== id || !root.contains(cur.content)) {
    const a = await getAssessment(id);
    if (!a) { toast('Bewertung nicht gefunden'); go('/', { replace: true }); return; }
    cur = buildShell(root, a);
  }
  cur.tab = tab;
  cur.tabbar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab.id));
  renderTab(false);
}

function buildShell(root, a) {
  const title = h('div', { class: 'topbar-title' });
  const sub = h('div', { class: 'topbar-sub' });
  const content = h('main', { class: 'page tabpage' });
  const tabbar = h('nav', { class: 'tabbar' }, TABS.map((t) =>
    h('button', { type: 'button', class: 'tab', dataset: { tab: t.id }, onclick: () => go(`/a/${a.id}/${t.id}`, { replace: true }) },
      icon(t.icon, 22), h('span', null, t.label))));
  const c = { a, content, tabbar, tab: TABS[0] };
  const updateHeader = () => {
    title.textContent = titleOf(a);
    sub.textContent = [typeById(a.type).label, a.v.plate].filter(Boolean).join(' · ');
  };
  c.updateHeader = updateHeader;
  updateHeader();
  root.replaceChildren(
    h('header', { class: 'topbar' },
      h('div', { class: 'topbar-row' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Zur Übersicht', onclick: () => go('/') }, icon('back', 24)),
        h('div', { class: 'topbar-center' }, title, sub),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Menü', onclick: () => menu(c) }, icon('more', 24)))),
    content,
    tabbar);
  return c;
}

function ctxFor(c) {
  return {
    a: c.a,
    s: state.settings,
    el: c.content,
    save: () => { save(c.a); c.updateHeader(); },
    rerender: () => renderTab(true),
    goTab: (id) => go(`/a/${c.a.id}/${id}`, { replace: true }),
  };
}

function renderTab(keepScroll) {
  const c = cur;
  const y = window.scrollY;
  c.content.replaceChildren();
  c.content.dataset.tab = c.tab.id;
  c.tab.render(ctxFor(c));
  if (keepScroll) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
}

async function menu(c) {
  const choice = await actionSheet(titleOf(c.a), [
    { value: 'pdf', label: 'PDF-Protokoll erstellen', icon: 'pdf' },
    { value: 'share', label: 'Fotos teilen', icon: 'share' },
    { value: 'copy', label: 'Als Vorlage kopieren', icon: 'copy' },
    { value: 'delete', label: 'Bewertung löschen', icon: 'trash', danger: true },
  ]);
  if (choice === 'pdf') {
    const { createPDF } = await import('../pdf.js');
    createPDF(c.a);
  } else if (choice === 'share') {
    const { shareAllPhotos } = await import('./tabPhotos.js');
    shareAllPhotos(c.a);
  } else if (choice === 'copy') {
    const n = createAssessment(c.a.type);
    n.doors = c.a.doors;
    n.v = { ...c.a.v, vin: '', plate: '', km: '', sellerName: '', sellerPhone: '', sellerAddress: '', date: n.v.date };
    await putAssessment(n);
    toast('Kopie mit Fahrzeugdaten angelegt');
    go(`/a/${n.id}/daten`);
  } else if (choice === 'delete') {
    const ok = await confirmDialog({ title: 'Bewertung löschen?', message: 'Alle Daten und Fotos dieser Bewertung werden entfernt.', confirmText: 'Löschen', danger: true });
    if (ok) { await deleteAssessment(c.a.id); cur = null; go('/', { replace: true }); toast('Bewertung gelöscht'); }
  }
}
