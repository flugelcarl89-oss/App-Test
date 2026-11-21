// Kleine UI-Bibliothek: DOM-Helfer, Icons, Sheets, Dialoge, Formatierung

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'multiple', 'readOnly', 'indeterminate']);

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.append(c);
    else el.append(document.createTextNode(String(c)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);

// ---------- Icons (eigene, schlichte Strichgrafiken) ----------
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  car: '<path d="M5 17h14M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v4a1 1 0 0 1-1 1h-1M4 18H3v-5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  data: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  body: '<path d="M7 3h10l2 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"/><path d="M7 9h10M8 15h8"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  result: '<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  pen: '<path d="M3 21c3-1 5-3 7-6l7-7a2.1 2.1 0 0 0-3-3l-7 7c-3 2-5 4-6 7z"/><path d="M14 21h7"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  walk: '<path d="M4 12a8 8 0 1 0 8-8"/><path d="M12 4l-3-2M12 4l-3 2"/><circle cx="12" cy="12" r="2"/>',
};

export function icon(name, size = 22, cls = '') {
  const span = document.createElement('span');
  span.className = 'ico ' + cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}

// ---------- Formatierung ----------
const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

export const fmtInt = (n) => (n == null || n === '' || isNaN(n) ? '–' : nf0.format(n));
export const fmtDec = (n) => (n == null || n === '' || isNaN(n) ? '–' : nf1.format(n));
export const fmtEuro = (n) => (n == null || n === '' || isNaN(n) ? '–' : nf0.format(Math.round(n)) + '\u00a0€');
export const fmtKm = (n) => (n == null || n === '' || isNaN(n) ? '–' : nf0.format(n) + '\u00a0km');

// Ganzzahl (Punkte = Tausendertrenner)
export function parseInt2(v) {
  if (v == null) return null;
  const s = String(v).replace(/[\s.€kmµ]/g, '').replace(',', '.');
  if (s === '') return null;
  const n = Math.round(parseFloat(s));
  return isNaN(n) ? null : n;
}

// Dezimalzahl (Komma oder Punkt als Dezimaltrenner)
export function parseDec(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function fmtDate(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtMonth(ym) {
  if (!ym) return '–';
  const [y, m] = ym.split('-');
  return m ? `${m}/${y}` : ym;
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function debounce(fn, ms) {
  let t;
  const d = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  d.flush = (...args) => { clearTimeout(t); fn(...args); };
  return d;
}

// ---------- Formularbausteine ----------
export function segmented(options, current, onChange, { cls = '', allowNone = false } = {}) {
  const wrap = h('div', { class: 'seg ' + cls, role: 'radiogroup' });
  const btns = options.map((o) => {
    const b = h('button', {
      type: 'button', class: 'seg-btn' + (o.value === current ? ' on' : ''), role: 'radio',
      'aria-checked': o.value === current ? 'true' : 'false',
      onclick: () => {
        const was = b.classList.contains('on');
        btns.forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        if (was && allowNone) { onChange(null); return; }
        b.classList.add('on'); b.setAttribute('aria-checked', 'true');
        onChange(o.value);
      },
    }, o.label);
    return b;
  });
  wrap.append(...btns);
  return wrap;
}

export function chips(options, current, onChange, { allowNone = true } = {}) {
  return segmented(options, current, onChange, { cls: 'chips', allowNone });
}

export function field(label, control, { hint, cls = '', after } = {}) {
  const isInput = control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement;
  return h(isInput ? 'label' : 'div', { class: 'field ' + cls },
    h('span', { class: 'field-label' }, label),
    h('span', { class: 'field-control' }, control, after),
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function input({ value = '', placeholder = '', type = 'text', inputmode, onInput, onChange, cls = '', autocap, maxlength, enterkeyhint, autocomplete = 'off' } = {}) {
  const el = h('input', {
    type, value: value ?? '', placeholder, class: 'inp ' + cls, inputmode,
    autocapitalize: autocap, maxlength, enterkeyhint, autocomplete, spellcheck: 'false', autocorrect: 'off',
  });
  if (onInput) el.addEventListener('input', () => onInput(el.value, el));
  if (onChange) el.addEventListener('change', () => onChange(el.value, el));
  return el;
}

export function textarea({ value = '', placeholder = '', onInput, rows = 3 } = {}) {
  const el = h('textarea', { class: 'inp', placeholder, rows });
  el.value = value || '';
  if (onInput) el.addEventListener('input', () => onInput(el.value));
  return el;
}

export function toggle(checked, onChange, label) {
  const inp = h('input', { type: 'checkbox', checked: !!checked, onchange: () => onChange(inp.checked) });
  return h('label', { class: 'toggle' }, h('span', { class: 'toggle-label' }, label), inp, h('span', { class: 'toggle-ui' }));
}

export function section(title, ...children) {
  return h('section', { class: 'group' },
    title ? h('h3', { class: 'group-title' }, title) : null,
    h('div', { class: 'card' }, ...children));
}

// ---------- Overlays ----------
let sheetStack = 0;

export function openSheet({ title, content, onClose, doneLabel = 'Fertig', full = false, headerExtra }) {
  const backdrop = h('div', { class: 'backdrop' });
  const body = h('div', { class: 'sheet-body' });
  const sheet = h('div', { class: 'sheet' + (full ? ' full' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-head' },
      h('div', { class: 'sheet-title' }, title),
      headerExtra || null,
      h('button', { type: 'button', class: 'btn-text strong', onclick: () => close() }, doneLabel)),
    body);
  if (typeof content === 'function') content(body, () => close());
  else if (content) body.append(content);
  document.body.append(backdrop, sheet);
  sheetStack++;
  document.documentElement.classList.add('locked');
  requestAnimationFrame(() => { backdrop.classList.add('open'); sheet.classList.add('open'); });
  backdrop.addEventListener('click', () => close());
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (document.activeElement && sheet.contains(document.activeElement)) document.activeElement.blur();
    backdrop.classList.remove('open'); sheet.classList.remove('open');
    sheetStack = Math.max(0, sheetStack - 1);
    if (!sheetStack) document.documentElement.classList.remove('locked');
    setTimeout(() => { backdrop.remove(); sheet.remove(); }, 260);
    onClose?.();
  }
  return { close, sheet, body };
}

export function confirmDialog({ title, message, confirmText = 'OK', cancelText = 'Abbrechen', danger = false }) {
  return new Promise((resolve) => {
    const backdrop = h('div', { class: 'backdrop open dialog-backdrop' });
    const done = (v) => { backdrop.remove(); resolve(v); };
    const dlg = h('div', { class: 'dialog', role: 'alertdialog' },
      h('div', { class: 'dialog-title' }, title),
      message ? h('div', { class: 'dialog-msg' }, message) : null,
      h('div', { class: 'dialog-actions' },
        cancelText ? h('button', { type: 'button', class: 'dialog-btn', onclick: () => done(false) }, cancelText) : null,
        h('button', { type: 'button', class: 'dialog-btn strong' + (danger ? ' danger' : ''), onclick: () => done(true) }, confirmText)));
    backdrop.append(dlg);
    document.body.append(backdrop);
  });
}

export function actionSheet(title, actions) {
  return new Promise((resolve) => {
    const backdrop = h('div', { class: 'backdrop open dialog-backdrop bottom' });
    const done = (v) => { backdrop.remove(); resolve(v); };
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) done(null); });
    backdrop.append(h('div', { class: 'action-sheet' },
      h('div', { class: 'action-group' },
        title ? h('div', { class: 'action-title' }, title) : null,
        actions.map((a) => h('button', { type: 'button', class: 'action-btn' + (a.danger ? ' danger' : ''), onclick: () => done(a.value) },
          a.icon ? icon(a.icon, 20) : null, a.label))),
      h('button', { type: 'button', class: 'action-btn cancel', onclick: () => done(null) }, 'Abbrechen')));
    document.body.append(backdrop);
  });
}

let toastTimer;
export function toast(msg, { action, onAction, ms = 2600 } = {}) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast', role: 'status' }, h('span', null, msg),
    action ? h('button', { type: 'button', class: 'toast-btn', onclick: () => { t.remove(); onAction?.(); } }, action) : null);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

export function busy(text = 'Bitte warten …') {
  const label = h('div', { class: 'busy-text' }, text);
  const bar = h('div', { class: 'busy-bar' }, h('div', { class: 'busy-fill' }));
  const el = h('div', { class: 'busy' }, h('div', { class: 'busy-box' }, h('div', { class: 'spinner' }), label, bar));
  document.body.append(el);
  return {
    set(text, progress) {
      if (text) label.textContent = text;
      if (progress != null) { bar.classList.add('on'); bar.firstChild.style.width = Math.round(progress * 100) + '%'; }
    },
    close() { el.remove(); },
  };
}

// Datei auswählen / Kamera öffnen. Gibt FileList-Array zurück.
export function pickFiles({ accept = 'image/*', capture = false, multiple = false } = {}) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept, multiple, class: 'hidden-input' });
    if (capture) inp.setAttribute('capture', 'environment');
    inp.addEventListener('change', () => { resolve([...(inp.files || [])]); inp.remove(); }, { once: true });
    inp.addEventListener('cancel', () => { resolve([]); inp.remove(); }, { once: true });
    document.body.append(inp);
    inp.click();
  });
}

// Fertige Dateien anbieten (Teilen braucht auf dem iPhone einen frischen Tipp)
export function offerShare({ title, message, files, preview = false }) {
  const canShare = !!navigator.canShare?.({ files });
  return new Promise((resolve) => {
    const backdrop = h('div', { class: 'backdrop open dialog-backdrop' });
    const done = (v) => { backdrop.remove(); resolve(v); };
    const share = async () => {
      if (canShare) {
        try { await navigator.share({ files, title }); done('shared'); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      for (const f of files) downloadBlob(f, f.name);
      done('downloaded');
    };
    backdrop.append(h('div', { class: 'dialog', role: 'alertdialog' },
      h('div', { class: 'dialog-title' }, title),
      message ? h('div', { class: 'dialog-msg' }, message) : null,
      h('div', { class: 'dialog-actions vertical' },
        h('button', { type: 'button', class: 'dialog-btn strong', onclick: share }, canShare ? 'Teilen / Sichern …' : 'Herunterladen'),
        preview && files.length === 1 ? h('button', { type: 'button', class: 'dialog-btn', onclick: () => {
          const u = URL.createObjectURL(files[0]);
          window.open(u, '_blank');
          setTimeout(() => URL.revokeObjectURL(u), 120000);
        } }, 'Ansehen') : null,
        h('button', { type: 'button', class: 'dialog-btn', onclick: () => done(null) }, 'Schließen'))));
    document.body.append(backdrop);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Teilen oder herunterladen
export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'aborted';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}

// Tastatur-Höhe (iOS) für Sheets
if (window.visualViewport) {
  const upd = () => {
    const kb = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
    document.documentElement.style.setProperty('--kb', kb + 'px');
  };
  window.visualViewport.addEventListener('resize', upd);
  window.visualViewport.addEventListener('scroll', upd);
}
