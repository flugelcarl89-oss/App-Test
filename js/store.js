// Zustand & Persistenz
import { dbGet, dbPut, dbGetAll, dbDelete, dbKeysByIndex, dbDeleteMany } from './db.js';
import { DEFAULT_SETTINGS, typeById } from './data.js';
import { uid, todayISO, debounce } from './ui.js';

export const state = { settings: { ...DEFAULT_SETTINGS } };

export async function loadSettings() {
  const row = await dbGet('kv', 'settings');
  state.settings = { ...DEFAULT_SETTINGS, ...(row?.value || {}) };
  return state.settings;
}

export async function saveSettings() {
  await dbPut('kv', { key: 'settings', value: state.settings });
}

export function createAssessment(typeId) {
  const s = state.settings;
  const t = typeById(typeId);
  const now = new Date().toISOString();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    status: 'offen',
    type: t.id,
    doors: t.doors,
    v: {
      make: '', model: '', variant: '', vin: '', plate: '', firstReg: '', km: '', fuel: '', gearbox: '',
      kw: '', ccm: '', color: '', hsn: '', tsn: '', hu: '', owners: '', keys: '', equipment: '',
      sellerName: '', sellerPhone: '', sellerAddress: '', sellerType: 'privat', location: '', date: todayISO(),
    },
    parts: {},
    tires: {
      wheels: { fl: {}, fr: {}, rl: {}, rr: {} },
      season: '', size: '', brand: '', rims: '', rimState: '',
      second: { has: false, season: '', depth: '', onRims: false, note: '' },
      spare: '',
      brakes: { front: { discs: '', pads: '' }, rear: { discs: '', pads: '' } },
      costOverride: '',
      note: '',
    },
    checks: {},
    photos: { slots: {}, extra: [] },
    calc: {
      vk: '', prep: String(s.prep), service: '', other: '', reduction: '', risk: String(s.risk),
      marginMode: s.marginMode, marginEur: String(s.marginEur), marginPct: String(s.marginPct),
      ask: '', agreed: '',
    },
    notes: '',
    signature: null,
  };
}

// Fehlende Felder bei älteren Datensätzen ergänzen
export function normalize(a) {
  const base = createAssessment(a.type);
  const merge = (t, d) => {
    for (const k of Object.keys(d)) {
      if (t[k] === undefined) t[k] = d[k];
      else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && t[k] && typeof t[k] === 'object') merge(t[k], d[k]);
    }
  };
  merge(a, base);
  return a;
}

export function part(a, id) {
  if (!a.parts[id]) a.parts[id] = { paint: [], material: null, ok: false, damages: [], photos: [], note: '' };
  return a.parts[id];
}

export function check(a, id) {
  if (!a.checks[id]) a.checks[id] = { s: null, note: '', cost: '' };
  return a.checks[id];
}

const pending = new Map();
const flushSave = debounce(async () => {
  const items = [...pending.values()];
  pending.clear();
  for (const a of items) await dbPut('assessments', a);
}, 350);

export function save(a) {
  a.updatedAt = new Date().toISOString();
  pending.set(a.id, a);
  flushSave();
}

export function saveNow() {
  if (pending.size) flushSave.flush();
}

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

export async function getAssessment(id) {
  if (pending.has(id)) return pending.get(id);
  const a = await dbGet('assessments', id);
  return a ? normalize(a) : null;
}

export async function listAssessments() {
  saveNow();
  const all = await dbGetAll('assessments');
  return all.map(normalize).sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || ''));
}

export async function putAssessment(a) {
  await dbPut('assessments', a);
}

export async function deleteAssessment(id) {
  pending.delete(id);
  const keys = await dbKeysByIndex('photos', 'assessmentId', id);
  await dbDeleteMany('photos', keys);
  await dbDelete('assessments', id);
}

// Alle Foto-IDs, die in einer Bewertung referenziert sind
export function photoRefs(a) {
  const ids = [];
  for (const [slot, pid] of Object.entries(a.photos.slots)) if (pid) ids.push({ id: pid, label: slot, kind: 'slot' });
  for (const pid of a.photos.extra) ids.push({ id: pid, label: 'extra', kind: 'extra' });
  for (const [pId, p] of Object.entries(a.parts)) for (const pid of p.photos || []) ids.push({ id: pid, label: pId, kind: 'part' });
  for (const w of Object.keys(a.tires.wheels)) for (const pid of a.tires.wheels[w].photos || []) ids.push({ id: pid, label: w, kind: 'wheel' });
  for (const [cId, c] of Object.entries(a.checks)) for (const pid of c.photos || []) ids.push({ id: pid, label: cId, kind: 'check' });
  return ids;
}
