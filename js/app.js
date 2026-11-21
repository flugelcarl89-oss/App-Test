// Einstieg: Router, Service Worker, Start
import { loadSettings } from './store.js';
import { requestPersistence } from './db.js';
import { h, toast } from './ui.js';
import { go } from './nav.js';
import { renderHome } from './views/home.js';
import { renderNew } from './views/new.js';
import { renderAssessment } from './views/assessment.js';
import { renderSettings } from './views/settings.js';

const root = document.getElementById('app');
let lastRoute = '';


async function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const sameAssessment = lastRoute.startsWith('/a/') && parts[0] === 'a' && lastRoute.split('/')[2] === parts[1];
  lastRoute = path;
  if (!sameAssessment) window.scrollTo(0, 0);
  try {
    if (parts[0] === 'new') return renderNew(root);
    if (parts[0] === 'settings') return renderSettings(root);
    if (parts[0] === 'a' && parts[1]) return await renderAssessment(root, parts[1], parts[2] || 'daten');
    return await renderHome(root);
  } catch (e) {
    console.error(e);
    root.replaceChildren(h('div', { class: 'empty' }, h('p', null, 'Fehler: ' + e.message), h('button', { class: 'btn', onclick: () => go('/') }, 'Zur Übersicht')));
  }
}

async function start() {
  document.documentElement.classList.toggle('standalone', !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches));
  await loadSettings();
  window.addEventListener('hashchange', route);
  await route();
  requestPersistence();
  registerSW();
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const promptUpdate = (w) => toast('Neue Version verfügbar', {
      action: 'Aktualisieren', ms: 15000,
      onAction: () => w.postMessage('skipWaiting'),
    });
    if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(w);
      });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch((e) => console.warn('SW', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

start();
