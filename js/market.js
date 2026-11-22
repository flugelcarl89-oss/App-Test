// Marktvergleich: ähnliche Fahrzeuge bei mobile.de / AutoScout24 suchen, Vergleichspreise notieren
import { h, icon, input, parseInt2, fmtEuro, fmtInt, toggle } from './ui.js';

const FUEL_MOBILE = { benzin: 'PETROL', diesel: 'DIESEL', elektro: 'ELECTRICITY', hybrid: 'HYBRID', phev: 'HYBRID', gas: 'LPG' };
const FUEL_AS24 = { benzin: 'B', diesel: 'D', elektro: 'E', hybrid: '2', phev: '2', gas: 'L' };
const GEAR_MOBILE = { schalter: 'MANUAL_GEAR', automatik: 'AUTOMATIC_GEAR' };
const GEAR_AS24 = { schalter: 'M', automatik: 'A' };
const MAKE_ALIAS = { vw: 'volkswagen', mercedes: 'mercedes-benz', 'mercedes benz': 'mercedes-benz', 'vw nutzfahrzeuge': 'volkswagen', 'skoda': 'skoda' };

export function slug(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const makeSlug = (make) => {
  const k = String(make || '').trim().toLowerCase();
  return slug(MAKE_ALIAS[k] || k);
};

const round = (n, step) => Math.round(n / step) * step;

// Standardkriterien aus den Fahrzeugdaten
export function defaults(a) {
  const year = a.v.firstReg ? +a.v.firstReg.slice(0, 4) : null;
  const km = parseInt2(a.v.km);
  const kw = parseInt2(a.v.kw);
  return {
    model: a.v.model || '',
    yFrom: year ? String(year - 1) : '',
    yTo: year ? String(year + 1) : '',
    kmFrom: km != null ? String(Math.max(0, round(km * 0.75, 5000))) : '',
    kmTo: km != null ? String(round(km * 1.25, 5000) || 10000) : '',
    kwFrom: kw ? String(Math.round(kw * 0.9)) : '',
    kwTo: kw ? String(Math.round(kw * 1.1)) : '',
  };
}

export function criteria(a) {
  const m = a.market;
  const d = defaults(a);
  const pick = (k) => (m[k] !== '' && m[k] != null ? m[k] : d[k]);
  return {
    make: a.v.make,
    model: pick('model'),
    yFrom: parseInt2(pick('yFrom')), yTo: parseInt2(pick('yTo')),
    kmFrom: parseInt2(pick('kmFrom')), kmTo: parseInt2(pick('kmTo')),
    kwFrom: parseInt2(pick('kwFrom')), kwTo: parseInt2(pick('kwTo')),
    fuel: m.useFuel ? a.v.fuel : '',
    gear: m.useGear ? a.v.gearbox : '',
    power: m.usePower,
  };
}

const range = (x, y) => (x != null || y != null ? `${x ?? ''}:${y ?? ''}` : null);

export function mobileUrl(c) {
  const path = [makeSlug(c.make), slug(c.model)].filter(Boolean).join('-');
  const p = new URLSearchParams({ isSearchRequest: 'true', s: 'Car', vc: 'Car', dam: 'false', sb: 'p', od: 'up' });
  const fr = range(c.yFrom, c.yTo); if (fr) p.set('fr', fr);
  const ml = range(c.kmFrom, c.kmTo); if (ml) p.set('ml', ml);
  if (FUEL_MOBILE[c.fuel]) p.set('ft', FUEL_MOBILE[c.fuel]);
  if (GEAR_MOBILE[c.gear]) p.set('tr', GEAR_MOBILE[c.gear]);
  if (c.power) { const pw = range(c.kwFrom, c.kwTo); if (pw) p.set('pw', pw); }
  return `https://suchen.mobile.de/auto/${path || 'gebrauchtwagen'}.html?${p.toString().replace(/%3A/g, ':')}`;
}

export function as24Url(c) {
  const parts = [makeSlug(c.make), slug(c.model)].filter(Boolean).join('/');
  const p = new URLSearchParams({ atype: 'C', cy: 'D', damaged_listing: 'exclude', desc: '0', sort: 'price', ustate: 'N,U' });
  if (c.yFrom) p.set('fregfrom', c.yFrom);
  if (c.yTo) p.set('fregto', c.yTo);
  if (c.kmFrom != null) p.set('kmfrom', c.kmFrom);
  if (c.kmTo != null) p.set('kmto', c.kmTo);
  if (FUEL_AS24[c.fuel]) p.set('fuel', FUEL_AS24[c.fuel]);
  if (GEAR_AS24[c.gear]) p.set('gear', GEAR_AS24[c.gear]);
  if (c.power && (c.kwFrom || c.kwTo)) { p.set('powertype', 'kw'); if (c.kwFrom) p.set('powerfrom', c.kwFrom); if (c.kwTo) p.set('powerto', c.kwTo); }
  return `https://www.autoscout24.de/lst/${parts}?${p.toString()}`;
}

export function priceStats(prices) {
  const v = (prices || []).map(Number).filter((n) => n > 0).sort((x, y) => x - y);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
  const avg = Math.round(v.reduce((s, n) => s + n, 0) / v.length);
  return { n: v.length, min: v[0], max: v[v.length - 1], median, avg };
}

const FUEL_TXT = { benzin: 'Benzin', diesel: 'Diesel', hybrid: 'Hybrid', phev: 'Plug-in', elektro: 'Elektro', gas: 'LPG/CNG' };
const GEAR_TXT = { schalter: 'Schaltgetriebe', automatik: 'Automatik' };

// Karte im Ergebnis-Tab
export function marketCard(ctx, onTakeVk) {
  const { a } = ctx;
  const M = a.market;
  const summary = h('div', { class: 'mk-summary' });
  const linkMobile = h('a', { class: 'btn primary grow', target: '_blank', rel: 'noopener' }, icon('search', 18), 'Bei mobile.de suchen');
  const linkAs24 = h('a', { class: 'btn grow', target: '_blank', rel: 'noopener' }, icon('search', 18), 'Bei AutoScout24 suchen');
  const hint = h('div', { class: 'hint' });

  const upd = () => {
    const c = criteria(a);
    const ok = !!c.make;
    const parts = [
      [c.make, c.model].filter(Boolean).join(' ') || 'Marke fehlt',
      c.yFrom || c.yTo ? `EZ ${c.yFrom ?? ''}–${c.yTo ?? ''}` : null,
      c.kmFrom != null || c.kmTo != null ? `${fmtInt(c.kmFrom)}–${fmtInt(c.kmTo)} km` : null,
      c.fuel ? FUEL_TXT[c.fuel] : null,
      c.gear ? GEAR_TXT[c.gear] : null,
      c.power && (c.kwFrom || c.kwTo) ? `${c.kwFrom}–${c.kwTo} kW` : null,
    ].filter(Boolean);
    summary.textContent = parts.join(' · ');
    for (const [el, url] of [[linkMobile, mobileUrl(c)], [linkAs24, as24Url(c)]]) {
      if (ok) { el.href = url; el.removeAttribute('aria-disabled'); el.classList.remove('disabled'); }
      else { el.removeAttribute('href'); el.setAttribute('aria-disabled', 'true'); el.classList.add('disabled'); }
    }
    hint.textContent = ok ? 'Sortiert nach Preis, ohne Unfallfahrzeuge. Passt die Modellbezeichnung nicht, unten unter „Suche anpassen“ ändern.' : 'Zuerst Marke und Modell im Tab „Daten“ eintragen.';
  };

  // Suche anpassen
  const d = defaults(a);
  const num = (key, ph) => input({ value: M[key], placeholder: ph || d[key] || '', inputmode: 'numeric', cls: 'mk-inp', onInput: (v) => { M[key] = v; ctx.save(); upd(); } });
  const adjust = h('details', { class: 'mk-adjust' },
    h('summary', null, 'Suche anpassen'),
    h('div', { class: 'mk-grid' },
      h('label', { class: 'mk-field wide' }, h('span', null, 'Modell (wie im Portal)'), input({ value: M.model, placeholder: d.model || 'z. B. Golf', cls: 'mk-inp', autocap: 'words', onInput: (v) => { M.model = v; ctx.save(); upd(); } })),
      h('label', { class: 'mk-field' }, h('span', null, 'Baujahr von'), num('yFrom')),
      h('label', { class: 'mk-field' }, h('span', null, 'bis'), num('yTo')),
      h('label', { class: 'mk-field' }, h('span', null, 'km von'), num('kmFrom')),
      h('label', { class: 'mk-field' }, h('span', null, 'km bis'), num('kmTo')),
      h('label', { class: 'mk-field' }, h('span', null, 'kW von'), num('kwFrom')),
      h('label', { class: 'mk-field' }, h('span', null, 'kW bis'), num('kwTo'))),
    toggle(M.useFuel, (v) => { M.useFuel = v; ctx.save(); upd(); }, 'Gleicher Kraftstoff'),
    toggle(M.useGear, (v) => { M.useGear = v; ctx.save(); upd(); }, 'Gleiches Getriebe'),
    toggle(M.usePower, (v) => { M.usePower = v; ctx.save(); upd(); }, 'Ähnliche Leistung (kW)'));

  // Vergleichspreise
  const chipsBox = h('div', { class: 'paint-chips' });
  const stats = h('div', { class: 'mk-stats' });
  const priceInp = input({ placeholder: 'Preis eines Angebots', inputmode: 'numeric', cls: 'grow', enterkeyhint: 'done' });
  const renderPrices = () => {
    chipsBox.replaceChildren(...M.prices.map((p, i) => h('button', { type: 'button', class: 'pchip', onclick: () => { M.prices.splice(i, 1); ctx.save(); renderPrices(); } }, fmtEuro(p), icon('x', 14))));
    const st = priceStats(M.prices);
    stats.replaceChildren(st ? h('div', { class: 'mk-stats-row' },
      h('span', null, `${st.n} Angebote · Median `, h('strong', null, fmtEuro(st.median)), ` · Ø ${fmtEuro(st.avg)}`),
      h('button', { type: 'button', class: 'btn-text strong', onclick: () => onTakeVk(st.median) }, 'Median als Verkaufspreis')) : h('span', { class: 'muted small' }, 'Preise passender Angebote notieren – der Median hilft beim Verkaufspreis.'));
  };
  const addPrice = () => {
    const n = parseInt2(priceInp.value);
    if (!n || n < 100) return;
    M.prices.push(n); priceInp.value = ''; ctx.save(); renderPrices();
  };
  priceInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPrice(); } });
  renderPrices();
  upd();

  return h('div', { class: 'card mk' },
    h('div', { class: 'mk-head' }, icon('search', 18), 'Marktpreis prüfen'),
    summary,
    h('div', { class: 'btn-row' }, linkMobile, linkAs24),
    hint,
    adjust,
    h('div', { class: 'mk-prices' },
      h('div', { class: 'block-title' }, 'Vergleichspreise'),
      h('div', { class: 'paint-entry' }, priceInp, h('button', { type: 'button', class: 'btn primary', onclick: addPrice }, icon('plus', 18), '€')),
      chipsBox, stats));
}
