// Tab „Daten“: Fahrzeug, Technik, Verkäufer + Scannen
import { h, icon, field, input, textarea, segmented, chips, section, fmtInt, fmtDec, parseInt2 } from '../ui.js';
import { VEHICLE_TYPES, typeById, FUELS, GEARBOXES, BRANDS } from '../data.js';
import { vinInfo, ageYears, kmPerYear, huMonthsLeft, psFromKw } from '../eval.js';
import { typeIcon } from './typeIcons.js';
import { scan as ocrScan } from '../ocr.js';

export function renderVehicle(ctx) {
  const { a, el } = ctx;
  const v = a.v;

  const bind = (key, opts = {}, hintFn) => {
    const hint = h('span', { class: 'field-hint live' });
    const upd = () => { if (hintFn) { const t = hintFn(v[key]); hint.textContent = t?.text || ''; hint.className = 'field-hint live ' + (t?.cls || ''); } };
    const inp = input({
      value: v[key], ...opts,
      onInput: (val, e) => {
        if (opts.upper) { const p = e.selectionStart; e.value = val.toUpperCase(); e.setSelectionRange(p, p); val = e.value; }
        v[key] = val; upd(); ctx.save();
      },
    });
    upd();
    return h('label', { class: 'field' }, h('span', { class: 'field-label' }, opts.label), h('span', { class: 'field-control' }, inp, opts.unit ? h('span', { class: 'unit' }, opts.unit) : null), hint);
  };

  // Scannen
  const scan = async (kind) => {
    const changed = await ocrScan(kind, a);
    if (changed) { ctx.save(); ctx.rerender(); }
  };
  const scanCard = h('div', { class: 'scan-card' },
    h('div', { class: 'scan-title' }, icon('scan', 20), 'Daten per Kamera erfassen'),
    h('div', { class: 'scan-row' },
      h('button', { type: 'button', class: 'scan-btn', onclick: () => scan('doc') }, icon('data', 22), h('span', null, 'Fahrzeugschein')),
      h('button', { type: 'button', class: 'scan-btn', onclick: () => scan('vin') }, icon('scan', 22), h('span', null, 'FIN')),
      h('button', { type: 'button', class: 'scan-btn', onclick: () => scan('km') }, icon('gauge', 22), h('span', null, 'km-Stand'))),
    h('div', { class: 'scan-tip' }, 'Tipp: In jedem Feld funktioniert auch „Text scannen“ der iPhone-Tastatur.'));

  // Fahrzeugtyp & Türen
  const t = typeById(a.type);
  const typeRow = h('div', { class: 'type-scroller' }, VEHICLE_TYPES.map((x) =>
    h('button', { type: 'button', class: 'type-mini' + (x.id === a.type ? ' on' : ''), onclick: () => {
      a.type = x.id;
      if (!x.doorOptions.includes(a.doors)) a.doors = x.doors;
      ctx.save(); ctx.rerender();
    } }, typeIcon(x.id), h('span', null, x.label))));
  const doorOpts = t.doorOptions.map((d) => ({ value: d, label: d === 'sliding' ? 'Schiebetüren' : `${d} Türen` }));
  const doorsCtl = doorOpts.length > 1 ? field('Türen', segmented(doorOpts, a.doors, (d) => { a.doors = d; ctx.save(); })) : null;

  const brandList = h('datalist', { id: 'brands' }, BRANDS.map((b) => h('option', { value: b })));
  const make = bind('make', { label: 'Marke', placeholder: 'z. B. Volkswagen', autocap: 'words' });
  make.querySelector('input').setAttribute('list', 'brands');

  el.append(
    scanCard,
    section('Fahrzeugtyp', typeRow, doorsCtl),
    section('Fahrzeug',
      make, brandList,
      bind('model', { label: 'Modell', placeholder: 'z. B. Golf', autocap: 'words' }),
      bind('variant', { label: 'Ausführung', placeholder: 'z. B. 1.5 TSI Style', autocap: 'words' }),
      bind('vin', { label: 'FIN', placeholder: '17 Zeichen', upper: true, maxlength: 17, autocap: 'characters', cls: 'mono' }, (val) => {
        const i = vinInfo(val);
        if (!i) return null;
        const parts = [`${i.vin.length}/17`];
        if (i.make) parts.push(i.make);
        if (/[IOQ]/.test(i.vin)) parts.push('I, O, Q kommen in FIN nicht vor');
        return { text: parts.join(' · '), cls: i.valid ? 'ok' : 'warn' };
      }),
      bind('plate', { label: 'Kennzeichen', placeholder: 'z. B. M-AB 1234', upper: true, autocap: 'characters' }),
      bind('firstReg', { label: 'Erstzulassung', type: 'date' }, (val) => {
        const y = ageYears(val);
        return y != null ? { text: `Alter: ${fmtDec(y)} Jahre` } : null;
      }),
      bind('km', { label: 'Kilometerstand', inputmode: 'numeric', placeholder: '0', unit: 'km' }, () => {
        const k = kmPerYear(a);
        return k != null ? { text: `≈ ${fmtInt(k)} km pro Jahr`, cls: k < 3000 || k > 35000 ? 'warn' : '' } : null;
      }),
      bind('hu', { label: 'HU gültig bis', type: 'month' }, (val) => {
        const m = huMonthsLeft(val);
        if (m == null) return null;
        if (m < 0) return { text: 'HU abgelaufen', cls: 'bad' };
        return { text: m === 0 ? 'Läuft diesen Monat ab' : `Noch ${m} Monat(e)`, cls: m <= 3 ? 'warn' : 'ok' };
      }),
      bind('color', { label: 'Farbe', placeholder: 'z. B. Schwarz Metallic', autocap: 'words' })),
    section('Technik',
      field('Kraftstoff', chips(FUELS, v.fuel, (val) => { v.fuel = val || ''; ctx.save(); })),
      field('Getriebe', chips(GEARBOXES, v.gearbox, (val) => { v.gearbox = val || ''; ctx.save(); })),
      bind('kw', { label: 'Leistung', inputmode: 'numeric', placeholder: '0', unit: 'kW' }, (val) => {
        const kw = parseInt2(val);
        return kw ? { text: `${psFromKw(kw)} PS` } : null;
      }),
      bind('ccm', { label: 'Hubraum', inputmode: 'numeric', placeholder: '0', unit: 'cm³' }),
      h('div', { class: 'field-pair' },
        bind('hsn', { label: 'HSN', inputmode: 'numeric', maxlength: 4, placeholder: '0000' }),
        bind('tsn', { label: 'TSN', upper: true, maxlength: 9, placeholder: 'ABC', autocap: 'characters' }))),
    section('Historie',
      h('div', { class: 'field-pair' },
        bind('owners', { label: 'Vorbesitzer', inputmode: 'numeric', placeholder: '0' }),
        bind('keys', { label: 'Schlüssel', inputmode: 'numeric', placeholder: '0' })),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Ausstattung / Extras'),
        textarea({ value: v.equipment, placeholder: 'z. B. Navi, AHK, Panoramadach, Sitzheizung …', onInput: (val) => { v.equipment = val; ctx.save(); } }))),
    section('Verkäufer',
      field('Art', segmented([{ value: 'privat', label: 'Privat' }, { value: 'haendler', label: 'Händler' }, { value: 'inzahlung', label: 'Inzahlungnahme' }], v.sellerType, (val) => { v.sellerType = val; ctx.save(); })),
      bind('sellerName', { label: 'Name', placeholder: 'Vor- und Nachname', autocap: 'words', autocomplete: 'off' }),
      bind('sellerPhone', { label: 'Telefon', type: 'tel', inputmode: 'tel', placeholder: '+49 …' }),
      bind('sellerAddress', { label: 'Adresse', placeholder: 'Straße, PLZ Ort', autocap: 'words' }),
      h('div', { class: 'field-pair' },
        bind('location', { label: 'Besichtigungsort', autocap: 'words' }),
        bind('date', { label: 'Datum', type: 'date' }))),
    section('Notizen',
      h('label', { class: 'field' }, textarea({ value: a.notes, rows: 4, placeholder: 'Allgemeine Notizen zum Fahrzeug …', onInput: (val) => { a.notes = val; ctx.save(); } }))),
    h('button', { type: 'button', class: 'btn primary block next-step', onclick: () => ctx.goTab('karosserie') }, 'Weiter zur Karosserie', icon('next', 20)));
}
