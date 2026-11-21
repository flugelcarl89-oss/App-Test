// Fotos: aufnehmen, verkleinern, speichern, anzeigen
import { dbPut, dbGet, dbDelete } from './db.js';
import { uid, pickFiles, h, icon, openSheet, confirmDialog, toast } from './ui.js';

const urlCache = new Map(); // id → {full, thumb}

async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* Fallback */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
    img.src = URL.createObjectURL(file);
  });
}

function resize(bmp, max, quality) {
  const w0 = bmp.width, h0 = bmp.height;
  const f = Math.min(1, max / Math.max(w0, h0));
  const w = Math.round(w0 * f), hh = Math.round(h0 * f);
  const c = document.createElement('canvas');
  c.width = w; c.height = hh;
  c.getContext('2d').drawImage(bmp, 0, 0, w, hh);
  return new Promise((resolve) => c.toBlob((b) => resolve({ blob: b, w, h: hh }), 'image/jpeg', quality));
}

export async function storePhoto(file, assessmentId, label = '') {
  const bmp = await loadBitmap(file);
  const full = await resize(bmp, 1800, 0.82);
  const thumb = await resize(bmp, 360, 0.7);
  bmp.close?.();
  const rec = { id: uid(), assessmentId, label, blob: full.blob, thumb: thumb.blob, w: full.w, h: full.h, createdAt: new Date().toISOString() };
  await dbPut('photos', rec);
  return rec.id;
}

export async function capturePhotos(assessmentId, { multiple = false, label = '', camera = true } = {}) {
  const files = await pickFiles({ accept: 'image/*', capture: camera, multiple });
  const ids = [];
  for (const f of files) {
    try { ids.push(await storePhoto(f, assessmentId, label)); } catch (e) { toast('Foto konnte nicht gespeichert werden'); console.error(e); }
  }
  return ids;
}

export async function getPhoto(id) {
  return dbGet('photos', id);
}

export async function photoURL(id, kind = 'thumb') {
  let c = urlCache.get(id);
  if (!c) {
    const rec = await dbGet('photos', id);
    if (!rec) return null;
    c = { full: URL.createObjectURL(rec.blob), thumb: URL.createObjectURL(rec.thumb || rec.blob) };
    urlCache.set(id, c);
  }
  return c[kind];
}

export async function deletePhoto(id) {
  const c = urlCache.get(id);
  if (c) { URL.revokeObjectURL(c.full); URL.revokeObjectURL(c.thumb); urlCache.delete(id); }
  await dbDelete('photos', id);
}

export function thumb(id, { onClick, cls = '' } = {}) {
  const img = h('img', { alt: '', class: 'thumb-img', loading: 'lazy', decoding: 'async' });
  photoURL(id).then((u) => { if (u) img.src = u; });
  return h('button', { type: 'button', class: 'thumb ' + cls, onclick: onClick }, img);
}

// Vollbild-Ansicht mit Löschen / Neu aufnehmen
export function viewPhoto(id, { title = 'Foto', onDelete, onReplace } = {}) {
  const img = h('img', { class: 'photo-full', alt: title });
  photoURL(id, 'full').then((u) => { if (u) img.src = u; });
  const sheet = openSheet({
    title,
    full: true,
    content: h('div', { class: 'photo-view' }, img,
      h('div', { class: 'row-actions' },
        onReplace ? h('button', { type: 'button', class: 'btn', onclick: async () => { sheet.close(); onReplace(); } }, icon('camera', 18), 'Neu aufnehmen') : null,
        onDelete ? h('button', { type: 'button', class: 'btn danger', onclick: async () => {
          if (await confirmDialog({ title: 'Foto löschen?', confirmText: 'Löschen', danger: true })) {
            await deletePhoto(id);
            sheet.close();
            onDelete();
          }
        } }, icon('trash', 18), 'Löschen') : null)),
  });
}

// Fotoleiste für Teile / Räder / Checkpunkte: ids-Array wird direkt verändert
export function photoStrip(a, ids, onChange, label = '') {
  const wrap = h('div', { class: 'photo-strip' });
  const render = () => {
    wrap.replaceChildren(
      h('button', { type: 'button', class: 'thumb add', onclick: async () => {
        const n = await capturePhotos(a.id, { label });
        if (n.length) { ids.push(...n); onChange(); render(); }
      } }, icon('camera', 22), h('span', null, 'Foto')),
      ...ids.map((pid) => thumb(pid, { onClick: () => viewPhoto(pid, {
        title: 'Foto',
        onDelete: () => { ids.splice(ids.indexOf(pid), 1); onChange(); render(); },
      }) })));
  };
  render();
  return wrap;
}

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function dataURLToBlob(url) {
  const [head, b64] = url.split(',');
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
