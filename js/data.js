// Stammdaten: Fahrzeugtypen, Teile, Schadenarten, Checkliste, Foto-Positionen, Voreinstellungen

export const APP_VERSION = '1.0.0';

// prop: Längen (Skizzen-Einheiten) für Motorhaube, Dach, Heck, Ladefläche
export const VEHICLE_TYPES = [
  { id: 'kleinwagen', label: 'Kleinwagen', doors: 4, doorOptions: [2, 4], tail: 'hatch', prop: { hood: 84, roof: 150, tail: 54 } },
  { id: 'limousine', label: 'Limousine', doors: 4, doorOptions: [2, 4], tail: 'trunk', prop: { hood: 112, roof: 150, tail: 76 } },
  { id: 'kombi', label: 'Kombi', doors: 4, doorOptions: [4], tail: 'hatch', prop: { hood: 108, roof: 206, tail: 50 } },
  { id: 'suv', label: 'SUV', doors: 4, doorOptions: [2, 4], tail: 'hatch', prop: { hood: 104, roof: 192, tail: 54 } },
  { id: 'coupe', label: 'Coupé', doors: 2, doorOptions: [2], tail: 'trunk', prop: { hood: 124, roof: 116, tail: 78 } },
  { id: 'cabrio', label: 'Cabrio', doors: 2, doorOptions: [2, 4], tail: 'trunk', softtop: true, prop: { hood: 118, roof: 120, tail: 82 } },
  { id: 'van', label: 'Van / Bus', doors: 'sliding', doorOptions: ['sliding', 4], tail: 'hatch', prop: { hood: 70, roof: 246, tail: 44 } },
  { id: 'transporter', label: 'Transporter', doors: 'sliding', doorOptions: ['sliding'], tail: 'barn', prop: { hood: 56, roof: 300, tail: 58 } },
  { id: 'pickup', label: 'Pickup', doors: 4, doorOptions: [2, 4], tail: 'bed', prop: { hood: 112, roof: 118, bed: 150 } },
];

export const typeById = (id) => VEHICLE_TYPES.find((t) => t.id === id) || VEHICLE_TYPES[1];

// Schadenarten je Teileart
export const DAMAGE_TYPES = {
  paint: [
    { id: 'kratzer', label: 'Kratzer' },
    { id: 'delle', label: 'Delle' },
    { id: 'beule', label: 'Beule' },
    { id: 'steinschlag', label: 'Steinschlag' },
    { id: 'lack', label: 'Lackschaden' },
    { id: 'rost', label: 'Rost' },
    { id: 'riss', label: 'Riss' },
    { id: 'hagel', label: 'Hagel' },
    { id: 'defekt', label: 'Defekt / fehlt' },
    { id: 'sonstiges', label: 'Sonstiges' },
  ],
  glass: [
    { id: 'steinschlag', label: 'Steinschlag' },
    { id: 'riss', label: 'Riss' },
    { id: 'kratzer', label: 'Kratzer' },
    { id: 'defekt', label: 'Defekt' },
  ],
  softtop: [
    { id: 'riss', label: 'Riss / Loch' },
    { id: 'verschleiss', label: 'Verschlissen' },
    { id: 'undicht', label: 'Undicht' },
    { id: 'mechanik', label: 'Mechanik defekt' },
    { id: 'sonstiges', label: 'Sonstiges' },
  ],
};

export const damageLabel = (kind, id) =>
  (DAMAGE_TYPES[kind] || DAMAGE_TYPES.paint).find((d) => d.id === id)?.label ||
  DAMAGE_TYPES.paint.find((d) => d.id === id)?.label || id;

export const SEVERITIES = [
  { value: 'leicht', label: 'Leicht' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'stark', label: 'Stark' },
];

export const MATERIALS = [
  { value: 'stahl', label: 'Stahl' },
  { value: 'alu', label: 'Alu' },
  { value: 'kunststoff', label: 'Kunststoff' },
];

export const FUELS = [
  { value: 'benzin', label: 'Benzin' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'phev', label: 'Plug-in' },
  { value: 'elektro', label: 'Elektro' },
  { value: 'gas', label: 'LPG/CNG' },
];

export const GEARBOXES = [
  { value: 'schalter', label: 'Schaltgetriebe' },
  { value: 'automatik', label: 'Automatik' },
];

export const SEASONS = [
  { value: 'sommer', label: 'Sommer' },
  { value: 'winter', label: 'Winter' },
  { value: 'ganzjahr', label: 'Ganzjahr' },
];

export const WHEELS = [
  { id: 'fl', label: 'Vorne links', short: 'VL', axle: 'front' },
  { id: 'fr', label: 'Vorne rechts', short: 'VR', axle: 'front' },
  { id: 'rl', label: 'Hinten links', short: 'HL', axle: 'rear' },
  { id: 'rr', label: 'Hinten rechts', short: 'HR', axle: 'rear' },
];

// Checkliste: s = kritisch (fließt stark in Bewertung ein und erscheint als Warnung)
export const CHECK_GROUPS = [
  {
    id: 'docs', label: 'Unterlagen & Schlüssel', items: [
      { id: 'zb1', label: 'Zulassungsbescheinigung Teil I (Fahrzeugschein)', critical: true },
      { id: 'zb2', label: 'Zulassungsbescheinigung Teil II (Brief) vorhanden', critical: true },
      { id: 'halter', label: 'Verkäufer ist Halter bzw. verfügungsberechtigt', critical: true },
      { id: 'fin_match', label: 'FIN am Fahrzeug stimmt mit Papieren überein', critical: true },
      { id: 'finanz', label: 'Keine laufende Finanzierung / Leasing', critical: true },
      { id: 'unfall_angabe', label: 'Laut Verkäufer unfallfrei', critical: true },
      { id: 'service', label: 'Serviceheft / Wartungsnachweise lückenlos' },
      { id: 'invoices', label: 'Rechnungen / Reparaturnachweise vorhanden' },
      { id: 'hu', label: 'HU/AU gültig (Plakette & Bericht)' },
      { id: 'keys', label: 'Alle Schlüssel vorhanden & funktionieren' },
      { id: 'coc', label: 'COC-Papier / Bordmappe vorhanden' },
    ],
  },
  {
    id: 'ext', label: 'Außen & Karosserie', items: [
      { id: 'gaps', label: 'Spaltmaße gleichmäßig', critical: true },
      { id: 'frame', label: 'Keine Richt- oder Schweißspuren (Längsträger, Radhaus)', critical: true },
      { id: 'underbody', label: 'Unterboden ohne starken Rost', critical: true },
      { id: 'overspray', label: 'Kein Farbnebel / Lackkanten an Dichtungen' },
      { id: 'lights', label: 'Scheinwerfer & Rückleuchten i.O. (kein Kondenswasser)' },
      { id: 'mirrors', label: 'Außenspiegel i.O.' },
      { id: 'seals', label: 'Dichtungen & Zierleisten i.O.' },
      { id: 'exhaust', label: 'Auspuffanlage dicht & fest' },
      { id: 'towbar', label: 'Anhängerkupplung i.O. (falls vorhanden)' },
    ],
  },
  {
    id: 'int', label: 'Innenraum', items: [
      { id: 'airbag', label: 'Airbag-Leuchte geht nach dem Start aus', critical: true },
      { id: 'wear', label: 'Abnutzung (Lenkrad, Pedale, Sitz) passt zum km-Stand', critical: true },
      { id: 'smell', label: 'Kein Rauch-, Tier- oder Feuchtigkeitsgeruch' },
      { id: 'seats', label: 'Sitze & Polster ohne Schäden' },
      { id: 'headliner', label: 'Dachhimmel sauber & trocken' },
      { id: 'carpet', label: 'Teppich & Fußraum trocken' },
      { id: 'trunk_dry', label: 'Kofferraum & Reserveradmulde trocken, ohne Unfallspuren' },
      { id: 'belts', label: 'Sicherheitsgurte i.O.' },
    ],
  },
  {
    id: 'elec', label: 'Elektrik & Komfort', items: [
      { id: 'warn_lights', label: 'Keine Warnleuchten im Kombiinstrument', critical: true },
      { id: 'ac', label: 'Klimaanlage kühlt' },
      { id: 'heating', label: 'Heizung / Sitzheizung' },
      { id: 'windows', label: 'Fensterheber & Schiebedach' },
      { id: 'central_lock', label: 'Zentralverriegelung & Funkschlüssel' },
      { id: 'infotainment', label: 'Radio / Navi / Display / Bluetooth' },
      { id: 'park', label: 'Einparkhilfe / Kamera' },
      { id: 'lighting', label: 'Beleuchtung innen & außen, Blinker' },
      { id: 'wipers', label: 'Scheibenwischer & Waschanlage' },
      { id: 'horn', label: 'Hupe' },
    ],
  },
  {
    id: 'engine', label: 'Motorraum', items: [
      { id: 'oil_cap', label: 'Kein Schaum („Mayonnaise“) am Öldeckel', critical: true },
      { id: 'cold_start', label: 'Kaltstart unauffällig (kein Rauch, keine Geräusche)', critical: true },
      { id: 'oil_level', label: 'Ölstand & Ölzustand i.O.' },
      { id: 'coolant', label: 'Kühlmittelstand i.O., kein Ölfilm' },
      { id: 'leaks', label: 'Keine Undichtigkeiten / Ölverlust' },
      { id: 'belt', label: 'Zahnriemen / Steuerkette – Wechsel nachgewiesen' },
      { id: 'battery', label: 'Batterie i.O.' },
      { id: 'engine_wash', label: 'Motorraum nicht frisch gewaschen' },
    ],
  },
  {
    id: 'drive', label: 'Probefahrt', items: [
      { id: 'engine_run', label: 'Motor läuft rund, zieht sauber durch', critical: true },
      { id: 'gearbox', label: 'Getriebe schaltet sauber & geräuschlos', critical: true },
      { id: 'clutch', label: 'Kupplung trennt sauber, greift nicht zu hoch' },
      { id: 'brakes_drive', label: 'Bremsen: kein Ziehen, kein Rubbeln' },
      { id: 'steering', label: 'Lenkung: Geradeauslauf, kein Spiel' },
      { id: 'suspension', label: 'Fahrwerk: keine Klopf- oder Poltergeräusche' },
      { id: 'turbo', label: 'Kein Pfeifen / Leistungsverlust (Turbo)' },
      { id: 'noises', label: 'Keine ungewöhnlichen Geräusche (Lager, Antrieb)' },
      { id: 'assist', label: 'Tempomat & Assistenzsysteme funktionieren' },
    ],
  },
  {
    id: 'diag', label: 'Diagnose & Historie', items: [
      { id: 'obd', label: 'Fehlerspeicher ausgelesen – keine relevanten Einträge', critical: true },
      { id: 'km_plaus', label: 'km-Stand plausibel (Service, HU-Berichte)', critical: true },
      { id: 'recalls', label: 'Rückrufe / Serviceaktionen erledigt' },
      { id: 'history', label: 'Fahrzeughistorie geprüft (z. B. Hersteller, Car-Pass)' },
    ],
  },
  {
    id: 'ev', label: 'Elektro / Hybrid', when: (a) => ['elektro', 'hybrid', 'phev'].includes(a.v.fuel), items: [
      { id: 'hv_warn', label: 'Keine Warnmeldungen zum Hochvoltsystem', critical: true },
      { id: 'soh', label: 'Batteriezustand (SoH) geprüft / Zertifikat' },
      { id: 'charging', label: 'Laden AC / DC funktioniert' },
      { id: 'charge_cable', label: 'Ladekabel vorhanden' },
      { id: 'range', label: 'Reichweite plausibel' },
    ],
  },
];

// Geführte Foto-Runde
export const PHOTO_SLOTS = [
  { id: 'front_left', label: 'Front schräg links' },
  { id: 'front', label: 'Front' },
  { id: 'front_right', label: 'Front schräg rechts' },
  { id: 'side_right', label: 'Seite rechts' },
  { id: 'rear_right', label: 'Heck schräg rechts' },
  { id: 'rear', label: 'Heck' },
  { id: 'rear_left', label: 'Heck schräg links' },
  { id: 'side_left', label: 'Seite links' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'odometer', label: 'Tacho / km-Stand' },
  { id: 'interior_front', label: 'Innenraum vorne' },
  { id: 'interior_rear', label: 'Innenraum hinten' },
  { id: 'trunk', label: 'Kofferraum' },
  { id: 'engine', label: 'Motorraum' },
  { id: 'vin', label: 'FIN / Typschild' },
  { id: 'docs', label: 'Fahrzeugschein' },
  { id: 'service_book', label: 'Serviceheft' },
  { id: 'keys', label: 'Schlüssel' },
  { id: 'wheels', label: 'Reifen / Felgen' },
  { id: 'underbody', label: 'Unterboden' },
];

export const DEFAULT_SETTINGS = {
  companyName: '',
  inspectorName: '',
  paintOkMax: 160,
  paintWarnMax: 300,
  costLight: 120,
  costMedium: 350,
  costHeavy: 800,
  tirePrice: 120,
  brakePrice: 280,
  tireMinDepth: 3,
  prep: 250,
  risk: 300,
  marginMode: 'eur',
  marginEur: 1000,
  marginPct: 10,
  negotiationPct: 8,
  vat25a: false,
  customChecks: [], // {id, group, label}
  hiddenChecks: [],
};

// Hersteller-Kennungen (WMI, erste 3 Stellen der FIN)
export const WMI = {
  WVW: 'Volkswagen', WVG: 'Volkswagen', WV1: 'VW Nutzfahrzeuge', WV2: 'VW Nutzfahrzeuge', WV3: 'VW Nutzfahrzeuge',
  WAU: 'Audi', WA1: 'Audi', WUA: 'Audi', TRU: 'Audi',
  WBA: 'BMW', WBS: 'BMW M', WBX: 'BMW', WBY: 'BMW i', WMW: 'MINI',
  WDB: 'Mercedes-Benz', WDD: 'Mercedes-Benz', WDC: 'Mercedes-Benz', WDF: 'Mercedes-Benz', W1K: 'Mercedes-Benz', W1N: 'Mercedes-Benz', W1V: 'Mercedes-Benz', W1W: 'Mercedes-Benz', WME: 'smart',
  W0L: 'Opel', W0V: 'Opel', VXK: 'Opel',
  WF0: 'Ford', WF1: 'Ford', WFO: 'Ford',
  WP0: 'Porsche', WP1: 'Porsche',
  TMB: 'Škoda', VSS: 'SEAT / Cupra',
  VF1: 'Renault', VF3: 'Peugeot', VF7: 'Citroën', VR3: 'Peugeot', VR7: 'Citroën', VR1: 'DS', UU1: 'Dacia', VF6: 'Renault Trucks',
  ZFA: 'Fiat', ZFF: 'Ferrari', ZAR: 'Alfa Romeo', ZCF: 'Iveco', ZHW: 'Lamborghini', ZAM: 'Maserati', ZLA: 'Lancia', ZDF: 'Ferrari',
  JTD: 'Toyota', JTE: 'Toyota', JTN: 'Toyota', JTM: 'Toyota', SB1: 'Toyota', NMT: 'Toyota', VNK: 'Toyota', JTH: 'Lexus',
  JHM: 'Honda', SHH: 'Honda', SHS: 'Honda',
  JMZ: 'Mazda', JM1: 'Mazda',
  JN1: 'Nissan', SJN: 'Nissan', VSK: 'Nissan', JN8: 'Nissan',
  KMH: 'Hyundai', TMA: 'Hyundai', NLH: 'Hyundai', KMC: 'Hyundai',
  KNA: 'Kia', KNE: 'Kia', U5Y: 'Kia', U6Y: 'Kia',
  JSA: 'Suzuki', TSM: 'Suzuki', JS2: 'Suzuki',
  JMB: 'Mitsubishi', XMC: 'Mitsubishi', JA4: 'Mitsubishi',
  YV1: 'Volvo', YV4: 'Volvo', LYV: 'Volvo', YS3: 'Saab',
  SAL: 'Land Rover', SAJ: 'Jaguar', SCC: 'Lotus', SCF: 'Aston Martin', SCB: 'Bentley', SCA: 'Rolls-Royce',
  '5YJ': 'Tesla', '7SA': 'Tesla', LRW: 'Tesla', XP7: 'Tesla',
  JF1: 'Subaru', JF2: 'Subaru',
  LSJ: 'MG', SDP: 'MG', LJ1: 'NIO', LGX: 'BYD', LC0: 'BYD',
  WMA: 'MAN', YS2: 'Scania', VWV: 'Volkswagen (Spanien)',
  '1FA': 'Ford USA', '1FT': 'Ford USA', '1G1': 'Chevrolet', '1C4': 'Jeep / Chrysler', '1J4': 'Jeep', ZAC: 'Jeep',
};

export const BRANDS = [
  'Volkswagen', 'VW', 'Audi', 'BMW', 'Mercedes-Benz', 'Mercedes', 'Opel', 'Ford', 'Škoda', 'Skoda', 'Seat', 'Cupra',
  'Renault', 'Dacia', 'Peugeot', 'Citroën', 'Citroen', 'DS', 'Fiat', 'Alfa Romeo', 'Jeep', 'Toyota', 'Lexus', 'Honda',
  'Mazda', 'Nissan', 'Hyundai', 'Kia', 'Suzuki', 'Mitsubishi', 'Volvo', 'Porsche', 'MINI', 'smart', 'Tesla', 'Land Rover',
  'Jaguar', 'Subaru', 'MG', 'BYD', 'Iveco', 'MAN', 'Lancia', 'Maserati', 'Ferrari', 'Polestar', 'Cupra',
];
