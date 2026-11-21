// Tab „Fotos“: geführte Foto-Runde, weitere Fotos, Teilen
import { h, icon, toast, busy, openSheet, offerShare } from '../ui.js';
import { PHOTO_SLOTS } from '../data.js';
import { capturePhotos, photoURL, viewPhoto, thumb, getPhoto } from '../photos.js';
import { photoRefs } from '../store.js';
import { buildLayout } from '../sketch.js';

export function renderPhotos(ctx) {
  const { a, el } = ctx;
  const P = a.photos;
  const done = PHOTO_SLOTS.filter((sl) => P.slots[sl.id]).length;

  const take = async (slot) => {
    const [id] = await capturePhotos(a.id, { label: slot.label });
    if (!id) return false;
    P.slots[slot.id] = id;
    ctx.save();
    return true;
  };

  const slotTile = (slot) => {
    const id = P.slots[slot.id];
    const tile = h('button', { type: 'button', class: 'slot' + (id ? ' has' : ''), onclick: async () => {
      if (id) {
        viewPhoto(id, {
          title: slot.label,
          onDelete: () => { delete P.slots[slot.id]; ctx.save(); ctx.rerender(); },
          onReplace: async () => { if (await take(slot)) ctx.rerender(); },
        });
      } else if (await take(slot)) ctx.rerender();
    } });
    if (id) {
      const img = h('img', { alt: slot.label });
      photoURL(id).then((u) => { if (u) img.src = u; });
      tile.append(img);
    } else tile.append(icon('camera', 24));
    tile.append(h('span', { class: 'slot-label' }, slot.label));
    return tile;
  };

  // Geführte Runde: nach jedem Foto direkt das nächste anbieten
  const tour = () => {
    const missing = PHOTO_SLOTS.filter((sl) => !P.slots[sl.id]);
    if (!missing.length) { toast('Alle Positionen fotografiert'); return; }
    let i = 0;
    const label = h('div', { class: 'tour-label' });
    const count = h('div', { class: 'muted' });
    const last = h('div', { class: 'tour-last' });
    const upd = () => {
      label.textContent = missing[i].label;
      count.textContent = `Position ${i + 1} von ${missing.length}`;
    };
    const sheet = openSheet({
      title: 'Foto-Runde',
      onClose: () => ctx.rerender(),
      content: h('div', { class: 'tour' },
        count, label, last,
        h('button', { type: 'button', class: 'btn primary big block', onclick: async () => {
          const ok = await take(missing[i]);
          if (!ok) return;
          const pid = P.slots[missing[i].id];
          photoURL(pid).then((u) => last.replaceChildren(h('img', { src: u, alt: '' })));
          i++;
          if (i >= missing.length) { sheet.close(); toast('Foto-Runde abgeschlossen'); return; }
          upd();
        } }, icon('camera', 22), 'Foto aufnehmen'),
        h('button', { type: 'button', class: 'btn block', onclick: () => {
          i++;
          if (i >= missing.length) { sheet.close(); return; }
          upd();
        } }, 'Position überspringen')),
    });
    upd();
  };

  const extra = h('div', { class: 'photo-grid' },
    h('button', { type: 'button', class: 'thumb add', onclick: async () => {
      const ids = await capturePhotos(a.id, { multiple: true, camera: false, label: 'Weitere' });
      if (ids.length) { P.extra.push(...ids); ctx.save(); ctx.rerender(); }
    } }, icon('plus', 22), h('span', null, 'Galerie')),
    h('button', { type: 'button', class: 'thumb add', onclick: async () => {
      const ids = await capturePhotos(a.id, { label: 'Weitere' });
      if (ids.length) { P.extra.push(...ids); ctx.save(); ctx.rerender(); }
    } }, icon('camera', 22), h('span', null, 'Kamera')),
    ...P.extra.map((id) => thumb(id, { onClick: () => viewPhoto(id, { onDelete: () => { P.extra.splice(P.extra.indexOf(id), 1); ctx.save(); ctx.rerender(); } }) })));

  const layout = buildLayout(a);
  const partPhotos = layout.parts.flatMap((p) => (a.parts[p.id]?.photos || []).map((id) => ({ id, label: p.label })));

  el.append(
    h('div', { class: 'card pad tour-card' },
      h('div', null, h('strong', null, `${done} von ${PHOTO_SLOTS.length} Positionen`), h('div', { class: 'muted small' }, 'Die Fotos eignen sich auch fürs Inserat.')),
      h('button', { type: 'button', class: 'btn primary', onclick: tour }, icon('camera', 20), done ? 'Weiter fotografieren' : 'Foto-Runde starten')),
    h('h3', { class: 'group-title' }, 'Positionen'),
    h('div', { class: 'slot-grid' }, PHOTO_SLOTS.map(slotTile)),
    h('h3', { class: 'group-title' }, 'Weitere Fotos'),
    extra,
    partPhotos.length ? [
      h('h3', { class: 'group-title' }, 'Schadensfotos (aus Karosserie)'),
      h('div', { class: 'photo-grid' }, partPhotos.map((p) => h('div', { class: 'cap-thumb' }, thumb(p.id, { onClick: () => viewPhoto(p.id, { title: p.label }) }), h('span', null, p.label)))),
    ] : null,
    h('button', { type: 'button', class: 'btn block', onclick: () => shareAllPhotos(a) }, icon('share', 20), 'Alle Fotos teilen / sichern'),
    h('button', { type: 'button', class: 'btn primary block next-step', onclick: () => ctx.goTab('ergebnis') }, 'Weiter zum Ergebnis', icon('next', 20)));
}

export async function shareAllPhotos(a) {
  const refs = photoRefs(a);
  if (!refs.length) { toast('Noch keine Fotos'); return; }
  const b = busy('Fotos werden vorbereitet …');
  try {
    const base = [a.v.make, a.v.model, a.v.plate].filter(Boolean).join('_').replace(/[^\wäöüÄÖÜß-]+/g, '_') || 'Fahrzeug';
    const files = [];
    let n = 1;
    for (const r of refs) {
      const rec = await getPhoto(r.id);
      if (!rec) continue;
      files.push(new File([rec.blob], `${base}_${String(n++).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }));
    }
    b.close();
    await offerShare({ title: `${files.length} Fotos bereit`, message: 'Über „Teilen“ kannst du sie in Fotos sichern, per Mail senden oder in Dateien ablegen.', files });
  } catch (e) {
    b.close();
    toast('Teilen nicht möglich: ' + e.message);
  }
}
