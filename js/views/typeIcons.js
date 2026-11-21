// Seitenansichten als Symbol für die Fahrzeugtypen (Front rechts)
const SHAPES = {
  kleinwagen: {
    body: 'M18,41V29Q18,21 23,17.5L33,12.5Q36,11 41,11L61,11Q66,11 70,15L80,25L95,28Q101,29 101,34V41Z',
    win: 'M25,25.5L33.5,16Q35.5,14 39,14L60,14Q64,14 67,17L74,25.5Z',
    lines: 'M52,14V38', wheels: [32, 87],
  },
  limousine: {
    body: 'M8,41V31Q8,28 12,28L28,27L40,16Q43,13.5 48,13.5L72,13.5Q77,13.5 81,17L91,26L108,29Q113,30 113,35V41Z',
    win: 'M33,26L42,17.5Q44,16.5 47,16.5L71,16.5Q75,16.5 78,19L84.5,26Z',
    lines: 'M60,17V38', wheels: [25, 97],
  },
  kombi: {
    body: 'M8,41V24Q8,15 16,14.5L72,13.5Q77,13.5 81,17L91,26L108,29Q113,30 113,35V41Z',
    win: 'M14,25V19Q14,17 17,17L71,16.5Q75,16.5 78,19L84.5,25.5Z',
    lines: 'M58,17V38M36,17V25', wheels: [25, 97],
  },
  suv: {
    body: 'M10,41V20Q10,10 19,9.5L74,9Q79,9 83,13L92,22L107,25Q112,26 112,31V41Z',
    win: 'M16,21V15Q16,12.5 19,12.5L73,12.5Q77,12.5 80,15.5L86,21Z',
    lines: 'M58,13V37M38,13V21', wheels: [27, 95], r: 8,
  },
  coupe: {
    body: 'M10,41V31Q10,28 14,27.5L28,26Q38,14 52,14L70,14Q76,14 80,18L90,26L108,29Q113,30 113,35V41Z',
    win: 'M34,25.5Q42,17 52,17L69,17Q73,17 76,20L82,25.5Z',
    lines: 'M64,26V37', wheels: [26, 97],
  },
  cabrio: {
    body: 'M10,41V33Q10,28.5 16,28L77,27L92,27.5L108,29.5Q113,30.5 113,35V41Z',
    win: 'M74.5,27.4L65.5,16.6L68,16.2L78,27.4Z',
    extra: 'M49,27.2L50.5,20.5Q51,18.8 53,18.9L55,19.1Q56.8,19.4 56.4,21.2L55.2,27.2ZM33,27.4L34.3,21.8Q34.8,20.2 36.6,20.3L38.4,20.5Q40,20.8 39.7,22.4L38.8,27.4ZM13.5,28.3Q14.5,23.6 20.5,23.6L26.5,23.6Q29.5,23.6 29.5,27.8Z',
    lines: 'M64,28V37', wheels: [26, 97],
  },
  van: {
    body: 'M10,41V14Q10,7 18,7L80,7Q86,7 89,12L96,22L107,25Q112,26 112,31V41Z',
    win: 'M16,20V13Q16,10.5 19,10.5L79,10.5Q83,10.5 85,13.5L90,20Z',
    lines: 'M60,10.5V37M38,10.5V20', wheels: [27, 95],
  },
  transporter: {
    body: 'M6,41V10Q6,5 12,5L88,5Q94,5 97,10L104,22L111,25Q114,26 114,31V41Z',
    win: 'M84,20V10Q84,8.5 86,8.5L89,8.5Q92,8.5 94,12L99,20Z',
    lines: 'M80,8V38M56,8V38', wheels: [23, 98],
  },
  pickup: {
    body: 'M6,41V27L52,27V16Q52,12 57,12L74,12Q79,12 83,16L91,25L108,28Q113,29 113,34V41Z',
    win: 'M57,25V17Q57,15.5 59,15.5L73,15.5Q76.5,15.5 79,18L85,25Z',
    lines: 'M69,15.5V37', wheels: [23, 96],
  },
};

export function typeIcon(id) {
  const s = SHAPES[id] || SHAPES.limousine;
  const r = s.r || 7.5;
  const span = document.createElement('span');
  span.className = 'type-icon';
  span.innerHTML = `<svg viewBox="0 0 120 52" aria-hidden="true">
    <path class="ti-shadow" d="M6,46.5H114" />
    <path class="ti-body" d="${s.body}" />
    <path class="ti-win" d="${s.win}" />
    <path class="ti-line" d="${s.lines}" />
    ${s.extra ? `<path class="ti-dark" d="${s.extra}" />` : ''}
    ${s.wheels.map((x) => `<circle class="ti-wheel" cx="${x}" cy="41" r="${r}"/><circle class="ti-hub" cx="${x}" cy="41" r="${r * 0.38}"/>`).join('')}
  </svg>`;
  return span;
}
