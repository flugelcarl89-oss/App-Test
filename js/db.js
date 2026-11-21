// IndexedDB: Bewertungen, Fotos, Einstellungen – alles bleibt auf dem Gerät

const DB_NAME = 'fahrzeugcheck';
const DB_VERSION = 1;
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('assessments')) db.createObjectStore('assessments', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id' });
        s.createIndex('assessmentId', 'assessmentId');
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbp = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Datenbank blockiert – bitte App neu öffnen.'));
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    const r = fn(s);
    if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Abgebrochen'));
  });
}

export const dbGet = (store, key) => tx(store, 'readonly', (s) => s.get(key));
export const dbGetAll = (store) => tx(store, 'readonly', (s) => s.getAll());
export const dbPut = (store, val) => tx(store, 'readwrite', (s) => s.put(val));
export const dbDelete = (store, key) => tx(store, 'readwrite', (s) => s.delete(key));
export const dbClear = (store) => tx(store, 'readwrite', (s) => s.clear());
export const dbByIndex = (store, index, value) => tx(store, 'readonly', (s) => s.index(index).getAll(value));
export const dbKeysByIndex = (store, index, value) => tx(store, 'readonly', (s) => s.index(index).getAllKeys(value));

export async function dbDeleteMany(store, keys) {
  if (!keys.length) return;
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    keys.forEach((k) => s.delete(k));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* egal */ }
}

export async function storageEstimate() {
  try { return await navigator.storage.estimate(); } catch { return null; }
}
