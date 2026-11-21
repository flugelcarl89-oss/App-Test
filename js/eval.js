// Bewertungslogik: Lack-Ampel, Schäden, Reifen, Checkliste, Gesamtnote, Ankaufsrechner
import { CHECK_GROUPS, WHEELS, WMI, PHOTO_SLOTS, damageLabel } from './data.js';
import { buildLayout, walkOrder } from './sketch.js';
import { parseInt2, parseDec, fmtInt, fmtDec, fmtEuro } from './ui.js';

const RANK = { none: 0, ok: 1, warn: 2, bad: 3 };
const worst = (...l) => l.filter(Boolean).reduce((m, x) => (RANK[x] > RANK[m] ? x : m), 'none');

export function paintMax(p) {
  const vals = (p?.paint || []).filter((v) => typeof v === 'number' && !isNaN(v));
  return vals.length ? Math.max(...vals) : null;
}

export function paintLevel(value, s) {
  if (value == null) return null;
  if (value <= s.paintOkMax) return 'ok';
  if (value <= s.paintWarnMax) return 'warn';
  return 'bad';
}

export const PAINT_TEXT = { ok: 'Original', warn: 'Nachlackiert', bad: 'Spachtel / Unfall' };

export function damageLevel(p) {
  const d = p?.damages || [];
  if (!d.length) return null;
  return d.some((x) => x.severity === 'stark') ? 'bad' : 'warn';
}

export function partStatus(p, s, mode = 'all') {
  const pl = paintLevel(paintMax(p), s);
  const dl = damageLevel(p);
  if (mode === 'paint') return pl || (p?.ok ? 'ok' : 'none');
  if (mode === 'damage') return dl || (p?.ok || pl ? 'ok' : 'none');
  const w = worst(pl, dl);
  return w !== 'none' ? w : (p?.ok ? 'ok' : 'none');
}

export function defaultDamageCost(sev, s) {
  return sev === 'stark' ? s.costHeavy : sev === 'mittel' ? s.costMedium : s.costLight;
}

export function partInfoFn(a, s, mode) {
  return (id) => {
    const p = a.parts[id];
    if (!p) return { status: 'none' };
    const mx = paintMax(p);
    const status = partStatus(p, s, mode);
    const value = mode !== 'damage' && mx != null ? `${mx} µm` : null;
    const badge = mode !== 'paint' && p.damages?.length ? p.damages.length : 0;
    return { status, value, badge };
  };
}

// ---------- Reifen ----------
export function dotAge(dot) {
  const m = String(dot || '').replace(/\D/g, '');
  if (m.length !== 4) return null;
  const week = +m.slice(0, 2), yy = +m.slice(2);
  if (week < 1 || week > 53) return null;
  const year = 2000 + yy;
  const made = new Date(year, 0, 1 + (week - 1) * 7);
  const age = (Date.now() - made.getTime()) / (365.25 * 864e5);
  if (age < -0.5) return null;
  return { week, year, age: Math.max(0, age) };
}

export function tireStatus(w, s) {
  const d = parseDec(w?.depth);
  const age = dotAge(w?.dot)?.age;
  let st = null;
  if (d != null) st = d < 1.6 ? 'bad' : d < s.tireMinDepth ? 'warn' : 'ok';
  if (age != null) st = worst(st, age > 10 ? 'bad' : age > 6 ? 'warn' : 'ok');
  if (w?.damage) st = worst(st, 'bad');
  return st || 'none';
}

export function tireCostSuggestion(a, s) {
  let cost = 0;
  const lines = [];
  for (const axle of ['front', 'rear']) {
    const ws = WHEELS.filter((w) => w.axle === axle).map((w) => a.tires.wheels[w.id] || {});
    const need = ws.some((w) => {
      const d = parseDec(w.depth);
      const age = dotAge(w.dot)?.age;
      return (d != null && d < s.tireMinDepth) || (age != null && age > 8) || w.damage;
    });
    if (need) { cost += 2 * s.tirePrice; lines.push(`2 Reifen ${axle === 'front' ? 'vorne' : 'hinten'}`); }
    const b = a.tires.brakes[axle];
    if (b.discs === 'worn') { cost += s.brakePrice; lines.push(`Bremsen ${axle === 'front' ? 'vorne' : 'hinten'}`); }
    else if (b.pads === 'worn') { cost += Math.round(s.brakePrice * 0.45); lines.push(`Beläge ${axle === 'front' ? 'vorne' : 'hinten'}`); }
  }
  return { cost, lines };
}

// ---------- Checkliste ----------
export function checkGroups(a, s) {
  return CHECK_GROUPS.filter((g) => !g.when || g.when(a)).map((g) => ({
    ...g,
    items: [
      ...g.items.filter((i) => !s.hiddenChecks.includes(i.id)),
      ...s.customChecks.filter((c) => c.group === g.id).map((c) => ({ ...c, custom: true })),
    ],
  }));
}

export function checkStats(a, s) {
  let total = 0, done = 0, ok = 0, nok = 0, na = 0, cost = 0;
  const defects = [];
  for (const g of checkGroups(a, s)) {
    for (const i of g.items) {
      total++;
      const c = a.checks[i.id];
      if (!c?.s) continue;
      done++;
      if (c.s === 'ok') ok++;
      if (c.s === 'na') na++;
      if (c.s === 'nok') {
        nok++;
        const k = parseInt2(c.cost) || 0;
        cost += k;
        defects.push({ id: i.id, label: i.label, group: g.label, critical: !!i.critical, note: c.note, cost: k });
      }
    }
  }
  return { total, done, ok, nok, na, cost, defects };
}

// ---------- Fahrzeugdaten ----------
export function ageYears(firstReg) {
  if (!firstReg) return null;
  const d = new Date(firstReg);
  if (isNaN(d)) return null;
  return Math.max(0, (Date.now() - d.getTime()) / (365.25 * 864e5));
}

export function kmPerYear(a) {
  const km = parseInt2(a.v.km);
  const age = ageYears(a.v.firstReg);
  if (km == null || !age || age < 0.25) return null;
  return Math.round(km / age);
}

export function huMonthsLeft(hu) {
  if (!hu) return null;
  const [y, m] = hu.split('-').map(Number);
  if (!y || !m) return null;
  const now = new Date();
  return (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
}

export function vinInfo(vin) {
  const v = String(vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!v) return null;
  const res = { vin: v, valid: v.length === 17 && !/[IOQ]/.test(v), make: WMI[v.slice(0, 3)] || null, checkDigit: null };
  if (v.length === 17) res.checkDigit = vinCheckDigitOk(v);
  return res;
}

function vinCheckDigitOk(v) {
  const map = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const wts = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = v[i];
    const n = /\d/.test(ch) ? +ch : map[ch];
    if (n == null) return false;
    sum += n * wts[i];
  }
  const r = sum % 11;
  return (r === 10 ? 'X' : String(r)) === v[8];
}

export const psFromKw = (kw) => (kw ? Math.round(kw * 1.35962) : null);

// ---------- Kosten ----------
export function damageList(a, layout) {
  const list = [];
  for (const p of walkOrder(layout)) {
    const d = a.parts[p.id]?.damages || [];
    for (const x of d) list.push({ part: p, ...x, cost: parseInt2(x.cost) || 0, typeLabel: damageLabel(p.kind, x.type) });
  }
  return list;
}

export function costs(a, s, layout = buildLayout(a)) {
  const dmg = damageList(a, layout).reduce((sum, d) => sum + d.cost, 0);
  const chk = checkStats(a, s).cost;
  const sugg = tireCostSuggestion(a, s);
  const tiresOverride = parseInt2(a.tires.costOverride);
  const tires = tiresOverride != null ? tiresOverride : sugg.cost;
  const c = a.calc;
  const prep = parseInt2(c.prep) || 0;
  const service = parseInt2(c.service) || 0;
  const other = parseInt2(c.other) || 0;
  const risk = parseInt2(c.risk) || 0;
  const total = dmg + chk + tires + prep + service + other + risk;
  return { dmg, chk, tires, tiresSuggested: sugg, prep, service, other, risk, total };
}

export function calcPrice(a, s, layout) {
  const k = costs(a, s, layout);
  const vk = parseInt2(a.calc.vk);
  const reduction = parseInt2(a.calc.reduction) || 0;
  if (!vk) return { ...k, vk: null, maxPrice: null };
  const vkEff = vk - reduction;
  const margin = a.calc.marginMode === 'pct' ? Math.round(vkEff * (parseDec(a.calc.marginPct) || 0) / 100) : (parseInt2(a.calc.marginEur) || 0);
  let maxPrice, vat = 0;
  if (s.vat25a) {
    // Differenzbesteuerung: USt = (VK − EK) × 19/119 → EK = VK − 1,19 × (Gewinn + Kosten netto)
    maxPrice = vkEff - 1.19 * (margin + k.total);
    vat = (vkEff - maxPrice) * 19 / 119;
  } else {
    maxPrice = vkEff - k.total - margin;
  }
  maxPrice = Math.floor(maxPrice / 10) * 10;
  const offer = Math.floor((maxPrice * (1 - s.negotiationPct / 100)) / 50) * 50;
  const ask = parseInt2(a.calc.ask);
  const agreed = parseInt2(a.calc.agreed);
  const ref = agreed ?? null;
  const profit = ref != null ? (s.vat25a ? (vkEff - ref) * 100 / 119 - k.total : vkEff - ref - k.total) : null;
  return { ...k, vk, vkEff, reduction, margin, vat: Math.round(vat), maxPrice, offer, ask, agreed, profit: profit != null ? Math.round(profit) : null };
}

// ---------- Gesamtbewertung ----------
const STRUCTURAL = ['roof', 'sill_l', 'sill_r', 'quarter_rl', 'quarter_rr'];

export function evaluate(a, s) {
  const layout = buildLayout(a);
  const flags = [];
  let score = 100;
  const paint = { ok: 0, warn: 0, bad: 0, measured: 0 };
  const warnParts = [], badParts = [];
  let inspected = 0;
  const paintable = layout.parts.filter((p) => p.kind === 'paint');

  for (const p of layout.parts) {
    const d = a.parts[p.id];
    if (!d) continue;
    const mx = paintMax(d);
    const pl = paintLevel(mx, s);
    if (d.ok || mx != null || d.damages?.length) inspected++;
    if (pl) {
      paint.measured++;
      paint[pl]++;
      if (pl === 'warn') { score -= STRUCTURAL.includes(p.id) ? 7 : 4; warnParts.push(`${p.label} (${mx} µm)`); }
      if (pl === 'bad') { score -= STRUCTURAL.includes(p.id) ? 14 : 10; badParts.push(`${p.label} (${mx} µm)`); }
    }
    for (const x of d.damages || []) score -= x.severity === 'stark' ? 8 : x.severity === 'mittel' ? 4 : 1.5;
  }

  if (badParts.length) flags.push({ level: 'bad', title: 'Spachtel / Unfallreparatur', text: badParts.join(', ') });
  const structWarn = layout.parts.filter((p) => STRUCTURAL.includes(p.id) && paintLevel(paintMax(a.parts[p.id]), s) === 'warn').map((p) => p.label);
  if (!badParts.length && (warnParts.length >= 3 || structWarn.length)) {
    flags.push({ level: 'bad', title: 'Unfallverdacht', text: structWarn.length ? `Nicht verschraubte Teile nachlackiert: ${structWarn.join(', ')}` : `${warnParts.length} Teile nachlackiert` });
  }
  if (warnParts.length && !(warnParts.length >= 3 || structWarn.length)) flags.push({ level: 'warn', title: 'Nachlackiert', text: warnParts.join(', ') });

  const dmg = damageList(a, layout);
  const heavy = dmg.filter((d) => d.severity === 'stark');
  if (heavy.length) flags.push({ level: 'bad', title: 'Starke Schäden', text: heavy.map((d) => `${d.part.label}: ${d.typeLabel}`).join(', ') });

  // Reifen
  const tireBad = [], tireWarn = [], tireOld = [];
  let tiresMeasured = 0;
  for (const w of WHEELS) {
    const t = a.tires.wheels[w.id] || {};
    const d = parseDec(t.depth);
    if (d != null) {
      tiresMeasured++;
      if (d < 1.6) { tireBad.push(w.short); score -= 5; }
      else if (d < s.tireMinDepth) { tireWarn.push(w.short); score -= 1.5; }
    }
    const age = dotAge(t.dot)?.age;
    if (age != null && age > 8) { tireOld.push(w.short); score -= 1; }
    if (t.damage) score -= 2;
  }
  if (tireBad.length) flags.push({ level: 'bad', title: 'Reifen unter 1,6 mm', text: tireBad.join(', ') });
  if (tireWarn.length) flags.push({ level: 'warn', title: `Reifen unter ${fmtDec(s.tireMinDepth)} mm`, text: tireWarn.join(', ') });
  if (tireOld.length) flags.push({ level: 'warn', title: 'Reifen älter als 8 Jahre', text: tireOld.join(', ') });
  const worn = [];
  for (const ax of ['front', 'rear']) {
    const b = a.tires.brakes[ax];
    if (b.discs === 'worn' || b.pads === 'worn') { worn.push(ax === 'front' ? 'vorne' : 'hinten'); score -= 2.5; }
  }
  if (worn.length) flags.push({ level: 'warn', title: 'Bremsen verschlissen', text: worn.join(' und ') });

  // Checkliste
  const cs = checkStats(a, s);
  for (const d of cs.defects) {
    score -= d.critical ? 9 : 2.5;
  }
  const crit = cs.defects.filter((d) => d.critical);
  if (crit.length) flags.push({ level: 'bad', title: 'Kritische Mängel', text: crit.map((d) => d.label).join(' · ') });
  const minor = cs.defects.filter((d) => !d.critical);
  if (minor.length) flags.push({ level: 'warn', title: `${minor.length} weitere Mängel`, text: minor.map((d) => d.label).join(' · ') });

  // Fahrzeugdaten
  const hu = huMonthsLeft(a.v.hu);
  if (hu != null && hu < 0) { flags.push({ level: 'bad', title: 'HU abgelaufen', text: `seit ${-hu} Monat(en)` }); score -= 4; }
  else if (hu != null && hu <= 3) flags.push({ level: 'warn', title: 'HU läuft bald ab', text: hu === 0 ? 'diesen Monat' : `in ${hu} Monat(en)` });
  const kpy = kmPerYear(a);
  if (kpy != null && kpy < 3000) flags.push({ level: 'warn', title: 'Sehr geringe Laufleistung', text: `≈ ${fmtInt(kpy)} km/Jahr – km-Stand prüfen` });
  if (kpy != null && kpy > 35000) flags.push({ level: 'info', title: 'Hohe Laufleistung', text: `≈ ${fmtInt(kpy)} km/Jahr` });
  const vi = vinInfo(a.v.vin);
  if (vi && !vi.valid) flags.push({ level: 'warn', title: 'FIN unvollständig', text: `${vi.vin.length} von 17 Zeichen` });

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 90 ? 1 : score >= 78 ? 2 : score >= 62 ? 3 : score >= 45 ? 4 : 5;
  const GRADE_TEXT = { 1: 'Sehr gut', 2: 'Gut', 3: 'Befriedigend', 4: 'Ausreichend', 5: 'Mangelhaft' };

  // Vollständigkeit
  const parts = layout.parts.length;
  const progress = {
    parts: { done: inspected, total: parts },
    paint: { done: paint.measured, total: paintable.length },
    checks: { done: cs.done, total: cs.total },
    tires: { done: tiresMeasured, total: 4 },
    photos: { done: Object.values(a.photos.slots).filter(Boolean).length, total: PHOTO_SLOTS.length },
  };
  const completeness = Math.round(100 * (
    0.35 * (inspected / parts) + 0.4 * (cs.total ? cs.done / cs.total : 1) + 0.15 * (tiresMeasured / 4) +
    0.1 * (a.v.make || a.v.vin ? 1 : 0)));

  const order = { bad: 0, warn: 1, info: 2 };
  flags.sort((x, y) => order[x.level] - order[y.level]);

  return {
    score, grade, gradeText: GRADE_TEXT[grade], flags, paint, damages: dmg, checks: cs, layout, progress, completeness,
    level: grade <= 2 ? 'ok' : grade === 3 ? 'warn' : 'bad',
  };
}

export function titleOf(a) {
  const t = [a.v.make, a.v.model].filter(Boolean).join(' ');
  return t || 'Neue Bewertung';
}

export { fmtEuro };
