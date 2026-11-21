// Texterkennung (läuft lokal mit Tesseract): FIN, km-Stand, Fahrzeugschein
import { h, icon, pickFiles, openSheet, busy, toast, input } from './ui.js';
import { WMI, BRANDS } from './data.js';
import { vinInfo } from './eval.js';
import { storePhoto } from './photos.js';

let workerP = null;
let onProgress = null;
const abs = (p) => new URL(p, location.href).href;

function loadScript(src) {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Texterkennung konnte nicht geladen werden (offline?)'));
    document.head.append(s);
  });
}

const STATUS_DE = {
  'loading tesseract core': 'Lade Texterkennung …',
  'initializing tesseract': 'Starte Texterkennung …',
  'loading language traineddata': 'Lade Sprachdaten …',
  'loaded language traineddata': 'Sprachdaten geladen',
  'initializing api': 'Initialisiere …',
  'initialized api': 'Bereit',
  'recognizing text': 'Erkenne Text …',
};

async function getWorker() {
  await loadScript(abs('vendor/tesseract/tesseract.min.js'));
  if (!workerP) {
    workerP = window.Tesseract.createWorker('deu', 1, {
      workerPath: abs('vendor/tesseract/worker.min.js'),
      corePath: abs('vendor/tesseract/core'),
      langPath: abs('vendor/tesseract/lang'),
      workerBlobURL: false,
      gzip: true,
      logger: (m) => onProgress?.(m),
      errorHandler: (e) => console.warn('OCR', e),
    }).catch((e) => { workerP = null; throw e; });
  }
  return workerP;
}

export async function prepareOCR() {
  const b = busy('Texterkennung wird geladen …');
  onProgress = (m) => b.set(STATUS_DE[m.status] || m.status, m.progress);
  try {
    await getWorker();
    b.close();
    toast('Texterkennung ist bereit – auch offline');
  } catch (e) {
    b.close();
    toast('Fehler: ' + e.message);
  } finally {
    onProgress = null;
  }
}

async function recognize(canvas, kind, b) {
  onProgress = (m) => b.set(STATUS_DE[m.status] || m.status, m.progress);
  try {
    const w = await getWorker();
    const params = {
      vin: { tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789', tessedit_pageseg_mode: '6' },
      km: { tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '11' },
      doc: { tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' },
    }[kind];
    await w.setParameters({ ...params, preserve_interword_spaces: '1' });
    const { data } = await w.recognize(canvas);
    if (kind !== 'doc') return data.text || '';
    // Formular zusätzlich zeilenweise lesen – hält Feldnummer und Wert zusammen
    await w.setParameters({ tessedit_pageseg_mode: '6' });
    const { data: rows } = await w.recognize(canvas);
    return (rows.text || '') + '\n' + (data.text || '');
  } finally {
    onProgress = null;
  }
}

// ---------- Bild vorbereiten / Ausschnitt wählen ----------
async function fileToCanvas(file, rotate = 0) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(async () => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    return img;
  });
  const max = 2600;
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * f), hh = Math.round(bmp.height * f);
  const c = document.createElement('canvas');
  const rot = ((rotate % 360) + 360) % 360;
  c.width = rot % 180 ? hh : w;
  c.height = rot % 180 ? w : hh;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.rotate((rot * Math.PI) / 180);
  g.drawImage(bmp, -w / 2, -hh / 2, w, hh);
  return c;
}

function cropToCanvas(src, r) {
  const sx = Math.round(r.x * src.width), sy = Math.round(r.y * src.height);
  const sw = Math.max(8, Math.round(r.w * src.width)), sh = Math.max(8, Math.round(r.h * src.height));
  // Kleine Ausschnitte vergrößern (bessere Erkennung)
  const scale = Math.min(3, Math.max(1, 1400 / sw));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  // Graustufen + Kontrast strecken
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let min = 255, max = 0;
  const gray = new Uint8ClampedArray(d.length / 4);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[j] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = Math.max(1, max - min);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = ((gray[j] - min) * 255) / range;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const DEFAULT_SEL = {
  vin: { x: 0.04, y: 0.36, w: 0.92, h: 0.28 },
  km: { x: 0.15, y: 0.3, w: 0.7, h: 0.4 },
  doc: { x: 0, y: 0, w: 1, h: 1 },
};
const TITLES = { vin: 'FIN markieren', km: 'km-Stand markieren', doc: 'Fahrzeugschein' };

function cropDialog(file, kind) {
  return new Promise(async (resolve) => {
    let rotation = 0;
    let src = await fileToCanvas(file, 0);
    let sel = { ...DEFAULT_SEL[kind] };
    const stage = h('div', { class: 'crop-stage' });
    const view = h('canvas', { class: 'crop-img' });
    const box = h('div', { class: 'crop-box' });
    stage.append(view, box);
    const drawView = () => {
      const maxW = Math.min(window.innerWidth - 32, 720);
      const f = maxW / src.width;
      view.width = src.width; view.height = src.height;
      view.style.width = maxW + 'px';
      view.style.height = Math.round(src.height * f) + 'px';
      view.getContext('2d').drawImage(src, 0, 0);
      placeBox();
    };
    const placeBox = () => {
      Object.assign(box.style, { left: sel.x * 100 + '%', top: sel.y * 100 + '%', width: sel.w * 100 + '%', height: sel.h * 100 + '%' });
    };
    let start = null;
    stage.addEventListener('pointerdown', (e) => {
      const r = view.getBoundingClientRect();
      start = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      stage.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!start) return;
      const r = view.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      sel = { x: Math.min(start.x, x), y: Math.min(start.y, y), w: Math.abs(x - start.x), h: Math.abs(y - start.y) };
      placeBox();
      e.preventDefault();
    });
    const end = () => {
      if (start && (sel.w < 0.04 || sel.h < 0.02)) { sel = { ...DEFAULT_SEL[kind] }; placeBox(); }
      start = null;
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    let result = null;
    const sheet = openSheet({
      title: TITLES[kind],
      full: true,
      doneLabel: 'Abbrechen',
      onClose: () => resolve(result),
      content: h('div', { class: 'crop' },
        h('div', { class: 'hint center' }, kind === 'doc' ? 'Optional: Bereich mit dem Finger aufziehen.' : 'Mit dem Finger einen Rahmen um den Text ziehen.'),
        stage,
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', onclick: async () => { rotation += 90; src = await fileToCanvas(file, rotation); drawView(); } }, '↻ Drehen'),
          h('button', { type: 'button', class: 'btn', onclick: () => { sel = { x: 0, y: 0, w: 1, h: 1 }; placeBox(); } }, 'Ganzes Bild'),
          h('button', { type: 'button', class: 'btn primary grow', onclick: () => { result = cropToCanvas(src, sel); sheet.close(); } }, icon('scan', 18), 'Erkennen'))),
    });
    requestAnimationFrame(drawView);
  });
}

// ---------- Auswertung ----------
function vinCheck(v) {
  return vinInfo(v)?.checkDigit === true;
}

export function vinCandidates(text) {
  const up = String(text).toUpperCase();
  const cands = new Map();
  const consider = (raw, bonus) => {
    const s = raw.replace(/[^A-Z0-9]/g, '').replace(/[OQ]/g, '0').replace(/I/g, '1');
    if (s.length < 17) return;
    for (let i = 0; i + 17 <= s.length; i++) {
      const v = s.slice(i, i + 17);
      let score = bonus + (s.length === 17 ? 3 : 0);
      if (WMI[v.slice(0, 3)]) score += 5;
      if (/^\d{4}$/.test(v.slice(13))) score += 1;
      if (/^[A-Z]/.test(v)) score += 1;
      if (vinCheck(v)) score += 2;
      const digits = (v.match(/\d/g) || []).length;
      if (digits < 3 || digits > 14) score -= 3;
      if (!cands.has(v) || cands.get(v) < score) cands.set(v, score);
    }
  };
  up.split(/\n/).forEach((l) => consider(l, 0));
  consider(up.replace(/\n/g, ' '), -3);
  const list = [...cands.entries()].sort((a, b) => b[1] - a[1]);
  const best = list[0]?.[1] ?? 0;
  return list.filter(([, sc], i) => i === 0 || sc >= Math.max(2, best - 4)).slice(0, 4).map(([vin, score]) => ({ vin, score, make: WMI[vin.slice(0, 3)] || null }));
}

export function kmCandidates(text) {
  const found = new Map();
  for (const m of String(text).matchAll(/\d[\d .]*\d|\d/g)) {
    const raw = m[0].trim();
    const groups = raw.split(/\s+/);
    for (const g of [raw, ...groups]) {
      const n = g.replace(/[ .]/g, '');
      if (n.length < 2 || n.length > 7) continue;
      const v = parseInt(n, 10);
      if (!v) continue;
      found.set(v, Math.max(found.get(v) || 0, n.length));
    }
  }
  return [...found.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, 6).map(([v]) => v);
}

const COLORS = ['SCHWARZ', 'WEISS', 'WEIß', 'SILBER', 'GRAU', 'BLAU', 'ROT', 'GRÜN', 'GRUEN', 'GELB', 'BRAUN', 'BEIGE', 'ORANGE', 'VIOLETT', 'GOLD', 'BRONZE', 'ANTHRAZIT'];

function isoFromDE(d) {
  const m = d.match(/(\d{2})[.,](\d{2})[.,](\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const dt = new Date(+yyyy, +mm - 1, +dd);
  if (dt.getMonth() !== +mm - 1 || +yyyy < 1950 || dt > new Date()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDoc(text) {
  const t = String(text).replace(/\r/g, '');
  const up = t.toUpperCase();
  const res = [];
  const add = (key, label, value) => { if (value && !res.some((r) => r.key === key)) res.push({ key, label, value: String(value).trim() }); };

  // FIN
  const vins = vinCandidates(up).filter((c) => c.score >= 4);
  if (vins[0]) add('vin', 'FIN', vins[0].vin);

  // Erstzulassung (Feld B), sonst früheste Datumsangabe
  const b = up.match(/(?:^|\s|\()B\)?[\s.:]*?(\d{2}[.,]\d{2}[.,]\d{4})/m);
  const ezB = b && isoFromDE(b[1]);
  const dates = [...up.matchAll(/\d{2}[.,]\d{2}[.,]\d{4}/g)].map((m) => isoFromDE(m[0])).filter(Boolean).sort();
  add('firstReg', 'Erstzulassung', ezB || dates[0]);

  // HSN / TSN
  const hsn = up.match(/2[.,]\s?1\)?[\s.:]*(\d{4})\b/);
  const tsn = up.match(/2[.,]\s?2\)?[\s.:]*([A-Z0-9]{3})/);
  if (hsn) add('hsn', 'HSN', hsn[1]);
  if (tsn) add('tsn', 'TSN', tsn[1]);
  if (!hsn || !tsn) {
    const pair = up.match(/\b(\d{4})\s+([A-Z0-9]{3})[A-Z0-9]{3,7}\b/);
    if (pair) { add('hsn', 'HSN', pair[1]); add('tsn', 'TSN', pair[2]); }
  }

  // Marke (D.1) bzw. bekannte Marken im Text
  const d1 = up.match(/D[.,]\s?1\)?[\s.:]+([A-ZÄÖÜ][A-ZÄÖÜ-]+(?:[ -][A-ZÄÖÜ]+)?)/);
  const brand = [...BRANDS].sort((x, y) => y.length - x.length).find((br) => new RegExp(`\\b${br.toUpperCase().replace(/[-]/g, '[- ]?')}\\b`).test(up));
  const make = brand || (d1 && d1[1]);
  if (make) add('make', 'Marke', niceBrand(make));

  // Handelsbezeichnung (D.3)
  const d3 = t.match(/D[.,]\s?3\)?[\s.:]+([^\n]{2,30})/i);
  if (d3) add('model', 'Modell', titleCase(d3[1].replace(/\s{2,}.*/, '')));

  // Leistung kW (P.2) und Hubraum (P.1)
  const p2 = up.match(/P[.,]\s?2[^\d\n]{0,10}(\d{2,3})\s?[/|]\s?\d{3,5}/) || up.match(/\b(\d{2,3})\s?\/\s?([3-9]\d{3})\b/);
  if (p2 && +p2[1] >= 20 && +p2[1] <= 800) add('kw', 'Leistung (kW)', p2[1]);
  const p1 = up.match(/P[.,]\s?1\)?[\s.:]+(\d{3,4})\b/);
  if (p1 && +p1[1] >= 500) add('ccm', 'Hubraum (cm³)', p1[1]);

  // Kraftstoff
  const fuel = /ELEKTR/.test(up) && /BENZIN|DIESEL/.test(up) ? 'hybrid' : /ELEKTR/.test(up) ? 'elektro' : /DIESEL/.test(up) ? 'diesel' : /BENZIN|SUPER/.test(up) ? 'benzin' : null;
  if (fuel) add('fuel', 'Kraftstoff', fuel);

  // Farbe (R)
  const color = COLORS.find((c) => new RegExp(`\\b${c}`).test(up));
  if (color) add('color', 'Farbe', titleCase(color.replace('WEISS', 'WEIß').replace('GRUEN', 'GRÜN')));

  // Kennzeichen (A)
  const plate = up.match(/(?:^|\n)\s*\(?A\)?[\s.:]+([A-ZÄÖÜ]{1,3}[\s-]+[A-Z]{1,2}[\s-]?\d{1,4}[EH]?)\b/);
  if (plate) add('plate', 'Kennzeichen', plate[1].replace(/\s+/g, ' ').replace(/^([A-ZÄÖÜ]{1,3}) /, '$1-'));

  return res;
}

const FUEL_LABEL = { benzin: 'Benzin', diesel: 'Diesel', hybrid: 'Hybrid', elektro: 'Elektro' };

function niceBrand(s) {
  const up = s.toUpperCase();
  const found = BRANDS.find((b) => b.toUpperCase() === up);
  if (found === 'VW') return 'Volkswagen';
  if (found === 'Mercedes') return 'Mercedes-Benz';
  if (found === 'Skoda') return 'Škoda';
  if (found === 'Citroen') return 'Citroën';
  return found || titleCase(s);
}

function titleCase(s) {
  return String(s).trim().toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
}

// ---------- Ergebnis prüfen ----------
function reviewSheet(title, rows, rawText) {
  return new Promise((resolve) => {
    let result = null;
    const items = rows.map((r) => {
      const cb = h('input', { type: 'checkbox', checked: true });
      const shown = r.key === 'fuel' ? (FUEL_LABEL[r.value] || r.value) : r.key === 'firstReg' ? r.value.split('-').reverse().join('.') : r.value;
      const inp = input({ value: shown, cls: r.key === 'vin' ? 'mono' : '' });
      if (r.key === 'fuel') inp.readOnly = true;
      return { r, cb, inp, el: h('label', { class: 'review-row' }, cb, h('span', { class: 'review-label' }, r.label), inp) };
    });
    const sheet = openSheet({
      title,
      doneLabel: 'Abbrechen',
      onClose: () => resolve(result),
      content: h('div', { class: 'review' },
        rows.length ? h('div', { class: 'card' }, items.map((i) => i.el)) : h('div', { class: 'card pad muted' }, 'Leider nichts Eindeutiges erkannt. Tipp: Näher heran, gerade halten, Spiegelungen vermeiden – oder den Text-Scanner der iPhone-Tastatur nutzen.'),
        rawText ? h('details', { class: 'raw' }, h('summary', null, 'Erkannter Rohtext'), h('pre', null, rawText)) : null,
        rows.length ? h('button', { type: 'button', class: 'btn primary block', onclick: () => {
          result = items.filter((i) => i.cb.checked).map((i) => ({
            key: i.r.key,
            value: i.r.key === 'fuel' ? i.r.value : i.r.key === 'firstReg' ? (isoFromDE(i.inp.value.trim()) || i.r.value) : i.inp.value.trim(),
          }));
          sheet.close();
        } }, icon('check', 18), 'Übernehmen') : null),
    });
  });
}

function pickSheet(title, options, rawText, { mono = false, unit = '' } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const custom = input({ placeholder: 'Oder selbst eingeben', cls: mono ? 'mono' : '', inputmode: unit ? 'numeric' : undefined });
    const sheet = openSheet({
      title,
      doneLabel: 'Abbrechen',
      onClose: () => resolve(result),
      content: h('div', { class: 'review' },
        options.length ? h('div', { class: 'card' }, options.map((o) => h('button', { type: 'button', class: 'pick-row', onclick: () => { result = o.value; sheet.close(); } },
          h('span', { class: mono ? 'mono strong' : 'strong' }, o.label), o.sub ? h('span', { class: 'muted small' }, o.sub) : null, icon('next', 18, 'muted'))))
          : h('div', { class: 'card pad muted' }, 'Nichts erkannt. Rahmen enger um den Text ziehen und erneut versuchen.'),
        h('div', { class: 'custom-add' }, custom, h('button', { type: 'button', class: 'btn primary', onclick: () => { if (custom.value.trim()) { result = custom.value.trim(); sheet.close(); } } }, 'OK')),
        rawText ? h('details', { class: 'raw' }, h('summary', null, 'Erkannter Rohtext'), h('pre', null, rawText)) : null),
    });
  });
}

// ---------- Ablauf ----------
const SLOT = { vin: 'vin', km: 'odometer', doc: 'docs' };

export async function scan(kind, a) {
  const [file] = await pickFiles({ accept: 'image/*', capture: true });
  if (!file) return false;
  const canvas = await cropDialog(file, kind);
  if (!canvas) return false;
  const b = busy('Texterkennung startet …');
  let text = '';
  try {
    text = await recognize(canvas, kind, b);
  } catch (e) {
    b.close();
    toast('Texterkennung fehlgeschlagen: ' + e.message);
    return false;
  }
  b.close();

  let changed = false;
  // Aufnahme als Foto ablegen, falls Position noch leer
  if (!a.photos.slots[SLOT[kind]]) {
    try { a.photos.slots[SLOT[kind]] = await storePhoto(file, a.id, SLOT[kind]); changed = true; } catch { /* egal */ }
  }

  if (kind === 'vin') {
    const c = vinCandidates(text);
    const val = await pickSheet('Erkannte FIN', c.map((x) => ({ value: x.vin, label: x.vin, sub: x.make ? `Hersteller: ${x.make}` : 'Hersteller unbekannt' })), text, { mono: true });
    if (val) {
      a.v.vin = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
      const mk = WMI[a.v.vin.slice(0, 3)];
      if (mk && !a.v.make) a.v.make = mk.replace(/ \(.*\)$/, '').replace('VW Nutzfahrzeuge', 'Volkswagen');
      changed = true;
      toast('FIN übernommen');
    }
  } else if (kind === 'km') {
    const c = kmCandidates(text);
    const val = await pickSheet('Erkannter km-Stand', c.map((n) => ({ value: String(n), label: n.toLocaleString('de-DE') + ' km' })), text, { unit: 'km' });
    if (val) { a.v.km = String(parseInt(String(val).replace(/\D/g, ''), 10) || ''); changed = true; toast('km-Stand übernommen'); }
  } else {
    const rows = parseDoc(text);
    const res = await reviewSheet('Erkannte Daten', rows, text);
    if (res?.length) {
      for (const { key, value } of res) a.v[key] = key === 'vin' || key === 'tsn' || key === 'plate' ? value.toUpperCase() : value;
      changed = true;
      toast(`${res.length} Felder übernommen`);
    }
  }
  return changed;
}
