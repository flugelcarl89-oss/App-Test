// Einstellungen: Grenzwerte, Kosten, Checkliste, Backup
import { h, icon, input, section, toggle, segmented, field, toast, confirmDialog, busy, pickFiles, offerShare, uid, fmtInt } from '../ui.js';
import { state, saveSettings, listAssessments, putAssessment } from '../store.js';
import { CHECK_GROUPS, APP_VERSION, DEFAULT_SETTINGS } from '../data.js';
import { dbGetAll, dbPut, dbClear, storageEstimate } from '../db.js';
import { blobToDataURL, dataURLToBlob } from '../photos.js';
import { go } from '../nav.js';

export function renderSettings(root) {
  const s = state.settings;
  const saveS = () => saveSettings();

  const num = (key, label, unit, opts = {}) => h('label', { class: 'field row' },
    h('span', { class: 'field-label' }, label),
    h('span', { class: 'field-control' },
      input({ value: s[key], inputmode: opts.decimal ? 'decimal' : 'numeric', cls: 'right', onInput: (v) => {
        const n = parseFloat(String(v).replace(',', '.'));
        if (!isNaN(n)) { s[key] = n; saveS(); }
      } }), unit ? h('span', { class: 'unit' }, unit) : null));

  const text = (key, label, ph) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label),
    input({ value: s[key], placeholder: ph, autocap: 'words', onInput: (v) => { s[key] = v; saveS(); } }));

  // Eigene Prüfpunkte
  const customBox = h('div');
  const renderCustom = () => {
    const sel = h('select', { class: 'inp' }, CHECK_GROUPS.map((g) => h('option', { value: g.id }, g.label)));
    const inp = input({ placeholder: 'Neuer Prüfpunkt …' });
    customBox.replaceChildren(
      ...s.customChecks.map((c) => h('div', { class: 'custom-row' },
        h('div', null, h('div', null, c.label), h('div', { class: 'muted small' }, CHECK_GROUPS.find((g) => g.id === c.group)?.label)),
        h('button', { type: 'button', class: 'icon-btn small danger', 'aria-label': 'Entfernen', onclick: () => {
          s.customChecks = s.customChecks.filter((x) => x.id !== c.id); saveS(); renderCustom();
        } }, icon('trash', 18)))),
      h('div', { class: 'custom-add' }, sel, inp,
        h('button', { type: 'button', class: 'btn primary', onclick: () => {
          const label = inp.value.trim();
          if (!label) return;
          s.customChecks.push({ id: 'c_' + uid().slice(0, 8), group: sel.value, label });
          saveS(); renderCustom();
        } }, icon('plus', 18), 'Hinzufügen')));
  };
  renderCustom();

  // Standardpunkte ausblenden
  const hiddenBox = h('details', { class: 'hidden-checks' },
    h('summary', null, `Standardpunkte ausblenden (${s.hiddenChecks.length} ausgeblendet)`),
    ...CHECK_GROUPS.map((g) => h('div', { class: 'hc-group' },
      h('div', { class: 'muted small hc-title' }, g.label),
      ...g.items.map((it) => toggle(!s.hiddenChecks.includes(it.id), (on) => {
        s.hiddenChecks = on ? s.hiddenChecks.filter((x) => x !== it.id) : [...s.hiddenChecks, it.id];
        saveS();
        hiddenBox.querySelector('summary').textContent = `Standardpunkte ausblenden (${s.hiddenChecks.length} ausgeblendet)`;
      }, it.label)))));

  const storage = h('div', { class: 'muted small' });
  storageEstimate().then((e) => { if (e) storage.textContent = `Belegt: ${fmtInt(Math.round(e.usage / 1048576))} MB`; });

  root.replaceChildren(
    h('header', { class: 'topbar' },
      h('div', { class: 'topbar-row' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Zurück', onclick: () => go('/') }, icon('back', 24)),
        h('div', { class: 'topbar-title' }, 'Einstellungen'),
        h('span', { class: 'icon-btn placeholder' }))),
    h('main', { class: 'page' },
      section('PDF-Kopfzeile',
        text('companyName', 'Firma / Name', 'z. B. Autohaus Muster'),
        text('inspectorName', 'Prüfer', 'Dein Name')),
      section('Lackschichtdicke',
        num('paintOkMax', 'Original bis', 'µm'),
        num('paintWarnMax', 'Nachlackiert bis', 'µm'),
        h('div', { class: 'hint pad-x' }, 'Darüber gilt: Spachtel / Unfallreparatur. Werte je nach Hersteller anpassen.')),
      section('Kosten-Vorschläge Schäden',
        num('costLight', 'Leicht', '€'), num('costMedium', 'Mittel', '€'), num('costHeavy', 'Stark', '€')),
      section('Reifen & Bremsen',
        num('tireMinDepth', 'Reifen tauschen unter', 'mm', { decimal: true }),
        num('tirePrice', 'Preis je Reifen', '€'),
        num('brakePrice', 'Bremsen je Achse', '€')),
      section('Ankaufsrechner – Standardwerte',
        num('prep', 'Aufbereitung', '€'),
        num('risk', 'Risiko / Gewährleistung', '€'),
        field('Gewinn als', segmented([{ value: 'eur', label: 'Betrag €' }, { value: 'pct', label: 'Prozent' }], s.marginMode, (v) => { s.marginMode = v; saveS(); })),
        num('marginEur', 'Gewinn (Betrag)', '€'),
        num('marginPct', 'Gewinn (Prozent vom VK)', '%', { decimal: true }),
        num('negotiationPct', 'Verhandlungspuffer Einstiegsangebot', '%', { decimal: true }),
        toggle(s.vat25a, (v) => { s.vat25a = v; saveS(); }, 'Differenzbesteuerung (§ 25a UStG) einrechnen'),
        h('div', { class: 'hint pad-x' }, 'Mit § 25a wird die Umsatzsteuer auf die Marge berücksichtigt (Kosten dann netto eingeben). Die Standardwerte gelten für neue Bewertungen.')),
      section('Eigene Prüfpunkte', customBox, hiddenBox),
      section('Datensicherung',
        h('div', { class: 'hint pad-x' }, 'Alle Daten liegen nur auf diesem Gerät. Sichere regelmäßig ein Backup (z. B. in iCloud Drive).'),
        h('div', { class: 'btn-row pad-x' },
          h('button', { type: 'button', class: 'btn', onclick: exportBackup }, icon('download', 18), 'Backup erstellen'),
          h('button', { type: 'button', class: 'btn', onclick: importBackup }, icon('upload', 18), 'Backup laden')),
        h('div', { class: 'pad-x' }, storage)),
      section('Texterkennung',
        h('div', { class: 'hint pad-x' }, 'Die Texterkennung läuft komplett auf dem iPhone. Einmal vorbereiten, dann funktioniert sie auch ohne Internet.'),
        h('div', { class: 'pad-x' }, h('button', { type: 'button', class: 'btn', onclick: async () => {
          const { prepareOCR } = await import('../ocr.js');
          prepareOCR();
        } }, icon('scan', 18), 'Texterkennung offline bereitstellen'))),
      section('Zurücksetzen',
        h('div', { class: 'btn-row pad-x' },
          h('button', { type: 'button', class: 'btn', onclick: async () => {
            if (await confirmDialog({ title: 'Einstellungen zurücksetzen?', confirmText: 'Zurücksetzen' })) {
              state.settings = { ...DEFAULT_SETTINGS }; await saveSettings(); renderSettings(root); toast('Zurückgesetzt');
            }
          } }, 'Einstellungen'),
          h('button', { type: 'button', class: 'btn danger', onclick: async () => {
            if (await confirmDialog({ title: 'Alle Bewertungen löschen?', message: 'Alle Bewertungen und Fotos werden unwiderruflich gelöscht.', confirmText: 'Alles löschen', danger: true })) {
              await dbClear('assessments'); await dbClear('photos'); toast('Alle Daten gelöscht'); go('/');
            }
          } }, 'Alle Daten löschen'))),
      h('p', { class: 'muted small center pad' }, `Fahrzeugcheck ${APP_VERSION} · Daten bleiben lokal auf dem Gerät`)));
}

async function exportBackup() {
  const b = busy('Backup wird erstellt …');
  try {
    const assessments = await listAssessments();
    const photos = await dbGetAll('photos');
    const out = { app: 'fahrzeugcheck', version: 1, exportedAt: new Date().toISOString(), settings: state.settings, assessments, photos: [] };
    let i = 0;
    for (const p of photos) {
      b.set(`Fotos ${++i}/${photos.length}`, i / photos.length);
      out.photos.push({ ...p, blob: await blobToDataURL(p.blob), thumb: p.thumb ? await blobToDataURL(p.thumb) : null });
    }
    const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
    const d = new Date();
    const name = `fahrzeugcheck-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    b.close();
    await offerShare({ title: 'Backup bereit', message: `${assessments.length} Bewertungen, ${photos.length} Fotos · ${fmtInt(Math.round(blob.size / 1024))} KB. Am besten in „Dateien“ sichern.`, files: [new File([blob], name, { type: 'application/json' })] });
  } catch (e) {
    b.close();
    toast('Backup fehlgeschlagen: ' + e.message);
  }
}

async function importBackup() {
  const [file] = await pickFiles({ accept: 'application/json,.json' });
  if (!file) return;
  const b = busy('Backup wird geladen …');
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'fahrzeugcheck') throw new Error('Keine Fahrzeugcheck-Sicherung');
    const existing = new Set((await listAssessments()).map((x) => x.id));
    let n = 0, skipped = 0;
    for (const a of data.assessments || []) {
      if (existing.has(a.id)) { skipped++; continue; }
      await putAssessment(a); n++;
    }
    let i = 0;
    for (const p of data.photos || []) {
      b.set(`Fotos ${++i}/${data.photos.length}`, i / data.photos.length);
      if (existing.has(p.assessmentId)) continue;
      await dbPut('photos', { ...p, blob: dataURLToBlob(p.blob), thumb: p.thumb ? dataURLToBlob(p.thumb) : null });
    }
    b.close();
    if (data.settings && await confirmDialog({ title: 'Einstellungen übernehmen?', message: 'Das Backup enthält auch Einstellungen.', confirmText: 'Übernehmen', cancelText: 'Behalten' })) {
      state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
      await saveSettings();
    }
    toast(`${n} Bewertungen importiert${skipped ? `, ${skipped} schon vorhanden` : ''}`);
  } catch (e) {
    b.close();
    toast('Import fehlgeschlagen: ' + e.message);
  }
}
