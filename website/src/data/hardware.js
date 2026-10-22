// Hardware-Check im Install Guide (src/components/HardwareCheck.astro): Listen und Regeln.
//
// Grundlage sind nur veröffentlichte Angaben, keine eigenen Messungen:
// - Systemanforderungen und harte Grenzen aus src/texts/install.md
//   (Minimum: i3-10100 / Ryzen 3 3100, GTX 1050 Ti / GTX 1650 / RX 570 / RX 6500 XT, 16 GB → 720p–1080p, ~30 FPS;
//    Empfohlen: Ryzen 7 5700X / i7-12700, RTX 3060 Ti / RTX 4060 / RX 6700 XT / RX 7600, 32 GB → 1440p, 60–120 FPS;
//    4K und Frame Generation: 12–16 GB Grafikspeicher, RTX 4070 / RTX 5070 / RX 7800 XT / RX 9070)
// - Messwerte aus der README des Ports (RX 7800 XT): ~150 FPS in 1440p mit FSR 4 Quality, ~90 FPS in 4K mit FSR 4 Balanced
// Die Leistungswerte (score) sind grobe Verhältnisse aus öffentlichen Benchmark-Übersichten und dienen nur der
// Einstufung in diese Stufen. Neue Modelle: einfach eine Zeile ergänzen (ähnliche Karte als Maßstab nehmen).

// --- Grafikkarten: Leistung relativ zur RTX 3060 (= 100), Grafikspeicher in GB ---------------------------------
const nvidia = (group, rows) =>
  rows.map(([name, vram, score, extra = {}]) => {
    const series = Number((name.match(/RTX (\d)0/) || [])[1] || 0) * 10;
    return {
      group, vendor: 'nvidia', name, vram, score,
      dlss: series >= 20,
      frameGen: series >= 50 ? 'DLSS Frame Generation up to 4×' : series >= 40 ? 'DLSS Frame Generation 2×' : null,
      ...extra,
    };
  });
const amd = (group, rows) =>
  rows.map(([name, vram, score, extra = {}]) => ({
    group, vendor: 'amd', name, vram, score,
    // FSR 4 nur ab RX 7000/9000 sinnvoll (darunter langsam, siehe Driver notes)
    fsr4: /^RX [79]\d{3}/.test(name),
    // Hinweis zum Treiber 26.8.1 betrifft RX 6000 und RX 9000
    amdDriverNote: /^RX [69]\d{3}/.test(name),
    ...extra,
  }));
const intel = (group, rows) => rows.map(([name, vram, score, extra = {}]) => ({ group, vendor: 'intel', name, vram, score, ...extra }));

const noVk13 = { vulkan13: false };
const igpu = { igpu: true };

export const gpus = [
  ...nvidia('NVIDIA GeForce', [
    ['RTX 5090', 32, 430], ['RTX 5080', 16, 300], ['RTX 5070 Ti', 16, 270], ['RTX 5070', 12, 215],
    ['RTX 5060 Ti 8 GB', 8, 160], ['RTX 5060 Ti 16 GB', 16, 165], ['RTX 5060', 8, 140], ['RTX 5050', 8, 112],
    ['RTX 4090', 24, 360], ['RTX 4080 Super', 16, 285], ['RTX 4080', 16, 275], ['RTX 4070 Ti Super', 16, 240],
    ['RTX 4070 Ti', 12, 220], ['RTX 4070 Super', 12, 205], ['RTX 4070', 12, 175],
    ['RTX 4060 Ti 8 GB', 8, 140], ['RTX 4060 Ti 16 GB', 16, 142], ['RTX 4060', 8, 115],
    ['RTX 3090 Ti', 24, 215], ['RTX 3090', 24, 198], ['RTX 3080 Ti', 12, 192], ['RTX 3080 10 GB', 10, 175],
    ['RTX 3080 12 GB', 12, 182], ['RTX 3070 Ti', 8, 148], ['RTX 3070', 8, 140], ['RTX 3060 Ti', 8, 125],
    ['RTX 3060 12 GB', 12, 100], ['RTX 3060 8 GB', 8, 90], ['RTX 3050 8 GB', 8, 75], ['RTX 3050 6 GB', 6, 62],
    ['RTX 2080 Ti', 11, 155], ['RTX 2080 Super', 8, 133], ['RTX 2080', 8, 127], ['RTX 2070 Super', 8, 118],
    ['RTX 2070', 8, 106], ['RTX 2060 Super', 8, 100], ['RTX 2060', 6, 88], ['RTX 2060 12 GB', 12, 92],
    ['GTX 1660 Ti', 6, 78], ['GTX 1660 Super', 6, 76], ['GTX 1660', 6, 68], ['GTX 1650 Super', 4, 60],
    ['GTX 1650', 4, 48], ['GTX 1630', 4, 30],
    ['GTX 1080 Ti', 11, 118], ['GTX 1080', 8, 92], ['GTX 1070 Ti', 8, 86], ['GTX 1070', 8, 77],
    ['GTX 1060 6 GB', 6, 60], ['GTX 1060 3 GB', 3, 55], ['GTX 1050 Ti', 4, 38], ['GTX 1050', 2, 30],
    ['GTX 980 Ti', 6, 72], ['GTX 980', 4, 60], ['GTX 970', 4, 52], ['GTX 960 2 GB', 2, 36], ['GTX 960 4 GB', 4, 36],
    ['GTX 950', 2, 30],
    ['GTX 780 Ti', 3, 50, noVk13], ['GTX 780', 3, 45, noVk13], ['GTX 770', 2, 38, noVk13], ['GTX 760', 2, 30, noVk13],
  ]),
  ...nvidia('NVIDIA GeForce (laptop)', [
    ['RTX 5090 Laptop', 24, 260], ['RTX 5080 Laptop', 16, 220], ['RTX 5070 Ti Laptop', 12, 175],
    ['RTX 5070 Laptop', 8, 130], ['RTX 5060 Laptop', 8, 115], ['RTX 5050 Laptop', 8, 95],
    ['RTX 4090 Laptop', 16, 230], ['RTX 4080 Laptop', 12, 195], ['RTX 4070 Laptop', 8, 125],
    ['RTX 4060 Laptop', 8, 112], ['RTX 4050 Laptop', 6, 92],
    ['RTX 3080 Ti Laptop', 16, 150], ['RTX 3080 Laptop', 8, 135], ['RTX 3070 Ti Laptop', 8, 125],
    ['RTX 3070 Laptop', 8, 115], ['RTX 3060 Laptop', 6, 95], ['RTX 3050 Ti Laptop', 4, 58], ['RTX 3050 Laptop', 4, 52],
    ['RTX 2080 Laptop', 8, 100], ['RTX 2070 Laptop', 8, 88], ['RTX 2060 Laptop', 6, 75],
    ['GTX 1660 Ti Laptop', 6, 65], ['GTX 1650 Ti Laptop', 4, 45], ['GTX 1650 Laptop', 4, 40], ['GTX 1050 Ti Laptop', 4, 33],
  ].map((row) => [row[0], row[1], row[2], { laptop: true }])),
  ...amd('AMD Radeon', [
    ['RX 9070 XT', 16, 275], ['RX 9070', 16, 245], ['RX 9060 XT 8 GB', 8, 160], ['RX 9060 XT 16 GB', 16, 165],
    ['RX 7900 XTX', 24, 290], ['RX 7900 XT', 20, 255], ['RX 7900 GRE', 16, 220], ['RX 7800 XT', 16, 205],
    ['RX 7700 XT', 12, 170], ['RX 7600 XT', 16, 128], ['RX 7600', 8, 120],
    ['RX 6950 XT', 16, 225], ['RX 6900 XT', 16, 215], ['RX 6800 XT', 16, 200], ['RX 6800', 16, 175],
    ['RX 6750 XT', 12, 152], ['RX 6700 XT', 12, 145], ['RX 6700', 10, 130], ['RX 6650 XT', 8, 120],
    ['RX 6600 XT', 8, 115], ['RX 6600', 8, 100], ['RX 6500 XT', 4, 50], ['RX 6400', 4, 40],
    ['RX 5700 XT', 8, 112], ['RX 5700', 8, 100], ['RX 5600 XT', 6, 88], ['RX 5500 XT 8 GB', 8, 64], ['RX 5500 XT 4 GB', 4, 60],
    ['Radeon VII', 16, 115], ['RX Vega 64', 8, 95], ['RX Vega 56', 8, 85],
    ['RX 590', 8, 70], ['RX 580 8 GB', 8, 64], ['RX 580 4 GB', 4, 62], ['RX 570 4 GB', 4, 58], ['RX 570 8 GB', 8, 58],
    ['RX 480', 8, 60], ['RX 470', 4, 55], ['RX 560', 4, 32], ['RX 550', 2, 20],
    ['R9 390 / 390X', 8, 60, noVk13], ['R9 290 / 290X', 4, 52, noVk13], ['R9 380 / 285', 4, 42, noVk13],
    ['R9 280 / 280X / HD 7970', 3, 40, noVk13],
  ]),
  ...amd('AMD Radeon (laptop)', [
    ['RX 7600M XT', 8, 110], ['RX 6800M', 12, 140], ['RX 6700M', 10, 115], ['RX 6600M', 8, 95],
    ['RX 6500M', 4, 45], ['RX 5500M', 4, 50],
  ].map((row) => [row[0], row[1], row[2], { laptop: true }])),
  ...intel('Intel Arc', [
    ['Arc B580', 12, 135], ['Arc B570', 10, 120], ['Arc A770 16 GB', 16, 115], ['Arc A770 8 GB', 8, 112],
    ['Arc A750', 8, 105], ['Arc A580', 8, 95], ['Arc A380', 6, 50], ['Arc A310', 4, 30],
    ['Arc A770M (laptop)', 16, 95, { laptop: true }], ['Arc A730M (laptop)', 12, 80, { laptop: true }],
    ['Arc A370M (laptop)', 4, 40, { laptop: true }],
  ]),
  // Grafik im Prozessor: nutzt den Arbeitsspeicher als Grafikspeicher (vram 0 = geteilt)
  ...amd('Integrated graphics (AMD)', [
    ['Radeon 890M (Ryzen AI 300)', 0, 60, igpu], ['Radeon 880M (Ryzen AI 300)', 0, 52, igpu],
    ['Radeon 780M (Ryzen 7040, 8040, 8000G)', 0, 50, igpu], ['Radeon 760M', 0, 42, igpu],
    ['Radeon 680M (Ryzen 6000)', 0, 40, igpu], ['Radeon 660M', 0, 30, igpu],
    ['Radeon Vega 8 / Vega 11 (Ryzen 2000–5000 G and U)', 0, 15, igpu],
    ['Radeon Graphics 2 CU (Ryzen 7000/9000 desktop)', 0, 7, igpu],
  ]).map((g) => ({ ...g, fsr4: false, amdDriverNote: false })),
  ...intel('Integrated graphics (Intel)', [
    // Wie im Launcher (launcher/bbport_hardware.py, PR #122): Ein Tester mit Core Ultra 5 125H hat 40–55 FPS bei
    // 1080p nativ gemessen; der Arc der 200V ist schneller
    ['Arc 140V / 130V (Core Ultra 200V)', 0, 85, igpu], ['Arc graphics (Core Ultra 100H)', 0, 70, igpu],
    ['Iris Xe (11th–13th gen laptops)', 0, 20, igpu], ['UHD 770 / 730 (12th gen+ desktop)', 0, 10, igpu],
    ['UHD 620 / 630', 0, 6, igpu],
  ]),
].map((g) => ({ vulkan13: true, ...g, id: `${g.vendor}-${g.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '') }));

// --- Prozessoren: Serie und Generation; Leistung relativ zum i3-10100 (= 100) ---------------------------------
// support: ok | compat (läuft im Kompatibilitätsmodus, Fehler zu erwarten) | none (fehlende Befehlssätze)
const intelGens = {
  14: [142, 192, 222, 235], 13: [138, 188, 215, 230], 12: [132, 168, 195, 205], 11: [105, 135, 145, 148],
  10: [100, 120, 132, 140], 9: [95, 112, 122, 130], 8: [92, 108, 118, null], 7: [78, 92, 105, 120],
  6: [72, 88, 98, null], 5: [62, 78, 88, null], 4: [62, 78, 88, null], 3: [45, 60, 68, null], 2: [42, 56, 64, null],
};
const ordinal = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const coreLine = (i, label) => ({
  id: `intel-core-${label.slice(-2).toLowerCase()}`,
  brand: 'Intel', label: `Core ${label}`,
  gens: Object.entries(intelGens).reverse()
    .filter(([, scores]) => scores[i] !== null)
    .map(([gen, scores]) => ({
      id: gen, label: `${ordinal(Number(gen))} gen (${label}-${gen}xxx)`, score: scores[i],
      support: Number(gen) <= 3 ? 'compat' : 'ok',
    }))
    .concat([{ id: '1', label: '1st gen (3 digits, e.g. i7-920)', score: 0, support: 'none' }]),
});
const ryzenGens = {
  9000: [null, 215, 235, 242], 8000: [140, 172, 185, null], 7000: [150, 200, 222, 228], 6000: [null, 140, 155, 160],
  5000: [118, 160, 180, 188], 4000: [85, 105, 115, 118], 3000: [100, 120, 130, 138], 2000: [72, 92, 102, null],
  1000: [68, 85, 95, null],
};
const ryzenLine = (i, n) => ({
  id: `amd-ryzen-${n}`, brand: 'AMD', label: `Ryzen ${n}`,
  gens: Object.entries(ryzenGens).reverse()
    .filter(([, scores]) => scores[i] !== null)
    .map(([gen, scores]) => ({ id: gen, label: `${gen} series (Ryzen ${n} ${gen.slice(0, 1)}xxx)`, score: scores[i], support: 'ok' })),
});

export const cpuLines = [
  coreLine(0, 'i3'), coreLine(1, 'i5'), coreLine(2, 'i7'), coreLine(3, 'i9'),
  { id: 'intel-core-ultra', brand: 'Intel', label: 'Core Ultra 5 / 7 / 9', gens: [
    { id: 'u2-5', label: 'Series 2: Core Ultra 5 2xx', score: 188, support: 'ok' },
    { id: 'u2-7', label: 'Series 2: Core Ultra 7 2xx', score: 215, support: 'ok' },
    { id: 'u2-9', label: 'Series 2: Core Ultra 9 2xx', score: 228, support: 'ok' },
    { id: 'u1-5', label: 'Series 1 (laptops): Core Ultra 5 1xx', score: 125, support: 'ok' },
    { id: 'u1-7', label: 'Series 1 (laptops): Core Ultra 7 1xx', score: 140, support: 'ok' },
    { id: 'u1-9', label: 'Series 1 (laptops): Core Ultra 9 1xx', score: 148, support: 'ok' },
  ] },
  { id: 'intel-core-100', brand: 'Intel', label: 'Core 3 / 5 / 7 (no "i", e.g. Core 5 120F)', gens: [
    { id: '3', label: 'Core 3 1xx', score: 135, support: 'ok' },
    { id: '5', label: 'Core 5 1xx', score: 165, support: 'ok' },
    { id: '7', label: 'Core 7 1xx', score: 195, support: 'ok' },
  ] },
  { id: 'intel-pentium', brand: 'Intel', label: 'Pentium / Celeron / Intel N-series', gens: [
    { id: 'new', label: '12th gen or newer (e.g. Pentium G7400, N100)', score: 50, support: 'ok' },
    { id: 'old', label: 'Older (before 12th gen)', score: 0, support: 'none' },
  ] },
  { id: 'intel-core2', brand: 'Intel', label: 'Core 2 / Xeon / other older', gens: [
    { id: 'old', label: 'Core 2 Duo, Core 2 Quad, older Xeon', score: 0, support: 'none' },
  ] },
  ryzenLine(0, 3), ryzenLine(1, 5), ryzenLine(2, 7), ryzenLine(3, 9),
  { id: 'amd-ryzen-ai', brand: 'AMD', label: 'Ryzen AI (laptops)', gens: [
    { id: '300', label: 'Ryzen AI 300 series', score: 185, support: 'ok' },
  ] },
  { id: 'amd-athlon', brand: 'AMD', label: 'Athlon', gens: [
    { id: 'zen', label: 'Athlon 200GE, 3000G and other Ryzen-based', score: 50, support: 'ok' },
    { id: 'old', label: 'Athlon II, Athlon X4 and older', score: 0, support: 'none' },
  ] },
  { id: 'amd-fx', brand: 'AMD', label: 'FX / A-series / Phenom', gens: [
    { id: 'all', label: 'All models', score: 0, support: 'none' },
  ] },
];

export const ramOptions = [8, 12, 16, 24, 32];

// --- Bewertung ------------------------------------------------------------------------------------------
// Stufen der erwarteten Bildrate; die Texte stehen hier, damit Liste und Regeln zusammenbleiben
export const LEVELS = [
  { id: 0, label: 'Not recommended' }, // ganz ohne Chance ("Not supported") gibt es keine Tabelle
  { id: 1, label: 'Under 30 FPS' },
  { id: 2, label: 'About 30 FPS' },
  { id: 3, label: '30–60 FPS' },
  { id: 4, label: '60–120 FPS' },
  { id: 5, label: '120+ FPS' },
];
export const TIERS = ['Not supported', 'Below minimum', 'Minimum', 'Above minimum', 'Recommended', '4K-ready'];

function gpuTier(g) {
  if (!g.vulkan13 || (!g.igpu && g.vram < 4) || g.score < 25) return 0;
  if (g.score < 35) return 1;
  if (g.score < 70) return 2;
  if (g.score < 112) return 3;
  if (g.score < 170 || g.vram < 12) return 4;
  return 5;
}

// Erwartete Stufe je Auflösung aus der Grafikkarte (ohne Prozessor)
function gpuLevels(g, tier) {
  const table = {
    0: [0, 0, 0], 1: [1, 1, 0], 2: [2, 1, 0], 3: [3, 2, 1], 4: [4, 4, 3], 5: [5, 5, 4],
  }[tier];
  let [p1080, p1440, p4k] = table;
  if (tier === 4 && g.score >= 170) [p1080, p1440] = [5, 5];
  // Grafikspeicher: 4 GB nur bis 1080p, 6 GB kein 4K, 8–10 GB knapp für 4K
  if (g.igpu) { p1440 = Math.min(p1440, 2); p4k = 0; }
  else if (g.vram <= 4) { p1440 = Math.min(p1440, 1); p4k = 0; }
  else if (g.vram <= 6) p4k = Math.min(p4k, 1);
  else if (g.vram < 12) p4k = Math.min(p4k, 2);
  // Intel ohne Upscaler (bekanntes Problem): höhere Auflösungen eine Stufe niedriger
  if (g.vendor === 'intel') { p1440 = Math.max(Math.min(p1440, 1), p1440 - 1); p4k = Math.max(Math.min(p4k, 1), p4k - 1); }
  return [p1080, p1440, p4k];
}

function cpuTier(gen) {
  if (gen.support === 'none') return 0;
  if (gen.score < 85) return 1;
  if (gen.score < 125) return 2;
  if (gen.score < 160) return 3;
  return 4;
}
// Höchste Stufe, die der Prozessor zulässt (unabhängig von der Auflösung)
const CPU_CAP = [0, 1, 3, 4, 5];

// Arbeitsspeicher entscheidet über Abstürze (code 3), nicht über die Bildrate: unter 16 GB stuft er herab,
// ab 16 GB begrenzt er nichts (Hinweis auf 32 GB steht bei den Prüfungen)
function ramTier(gb) {
  if (gb < 12) return 0;
  if (gb < 16) return 1;
  return 5;
}

function upscaler(g) {
  if (g.vendor === 'intel') return null; // bekanntes Problem: verzerrte Polygone mit Upscaler
  if (g.dlss) return 'DLSS';
  if (g.fsr4) return 'FSR 4';
  return 'FSR 3.1';
}

function settingsFor(g, level, res) {
  if (level === 0) return '';
  const up = upscaler(g);
  if (!up) return level <= 2 ? 'Upscaler off, lower details' : 'Upscaler off';
  const mode = level <= 2 ? 'Performance' : res === '4K' ? (level >= 4 ? 'Balanced' : 'Performance') : level === 3 ? 'Balanced' : 'Quality';
  return `${up} ${mode}`;
}

export function evaluate(gpu, line, gen, ram) {
  const tiers = { gpu: gpuTier(gpu), cpu: cpuTier(gen), ram: ramTier(ram) };
  // Gesamtstufe = schwächstes Teil; ein empfohlener Prozessor (4) begrenzt nicht unter "4K-ready"
  const effective = { gpu: tiers.gpu, cpu: tiers.cpu === 4 ? 5 : tiers.cpu, ram: tiers.ram };
  const tier = Math.min(effective.gpu, effective.cpu, effective.ram);
  const limit = tier === 5 ? null : Object.keys(effective).find((k) => effective[k] === tier);
  const cap = Math.min(CPU_CAP[tiers.cpu], tiers.ram === 0 ? 0 : 5);
  const res = ['1080p', '1440p', '4K'];
  const rows = gpuLevels(gpu, tiers.gpu).map((lvl, i) => {
    const level = Math.min(lvl, cap);
    return { res: res[i], level, label: LEVELS[level].label, settings: settingsFor(gpu, level, res[i]) };
  });

  const checks = [];
  const notes = [];
  // Prozessor
  if (gen.support === 'none') checks.push(['bad', 'Processor', 'Not supported: the port needs AVX, BMI1, MOVBE and LZCNT (Intel 4th gen or newer, or any Ryzen).']);
  else if (gen.support === 'compat') checks.push(['warn', 'Processor', 'Intel 2nd/3rd gen runs in compatibility mode, so expect bugs. It is also below the minimum (Core i3-10100).']);
  else checks.push([['bad', 'warn', 'ok', 'ok', 'ok'][tiers.cpu], 'Processor', [
    '', 'Below the minimum (Core i3-10100 / Ryzen 3 3100): expect low frame rates and stutter.',
    'Meets the minimum (Core i3-10100 / Ryzen 3 3100).', 'Above the minimum.',
    'Meets the recommendation (Ryzen 7 5700X / Core i7-12700).'][tiers.cpu]]);
  // Grafikkarte
  if (!gpu.vulkan13) checks.push(['bad', 'Graphics card', 'Not supported: no Vulkan 1.3 driver for this card.']);
  else if (!gpu.igpu && gpu.vram < 4) checks.push(['bad', 'Graphics card', `Not supported: ${gpu.vram} GB of video memory, the port needs at least 4 GB.`]);
  else checks.push([['bad', 'warn', 'ok', 'ok', 'ok', 'ok'][tiers.gpu], 'Graphics card', [
    'Too slow for the port.', 'Below the minimum (GTX 1050 Ti / GTX 1650 / RX 570).',
    'Meets the minimum (GTX 1050 Ti / GTX 1650 / RX 570 / RX 6500 XT).', 'Above the minimum.',
    'Meets the recommendation (RTX 3060 Ti / RTX 4060 / RX 6700 XT / RX 7600).',
    'Enough for 4K (RTX 4070 / RTX 5070 / RX 7800 XT / RX 9070 class).'][tiers.gpu]
    + (gpu.igpu ? ' Integrated graphics use your RAM as video memory.' : '')]);
  // Arbeitsspeicher
  if (ram < 12) checks.push(['bad', 'Memory', `${ram} GB is not enough: the game will likely close right after PLAY (code 3).`]);
  else if (ram < 16) checks.push(['warn', 'Memory', `${ram} GB is below the minimum of 16 GB: the game may close right after PLAY (code 3).`]);
  else if (ram < 32) checks.push(['ok', 'Memory', `${ram} GB meets the minimum (32 GB recommended). Keep the page file on "System managed".`]);
  else checks.push(['ok', 'Memory', `${ram} GB meets the recommendation.`]);

  if (tier > 0) {
    if (!gpu.igpu && gpu.vram === 4) notes.push('Use the settings for 4 GB cards above: 720p/1080p, FSR 3.1 Performance, Model detail Default, Object motion vectors off, frame generation off, a 60 FPS cap.');
    if (gpu.vendor === 'intel') notes.push('Intel graphics: keep the upscaler off, stretched polygons can still appear with it on (known issue in 1.9.2).');
    if (gpu.amdDriverNote) notes.push('AMD driver 26.8.1: if the game crashes or shows broken graphics, clear the shader cache (Advanced) or try another driver.');
    const fps1440 = rows[1].level;
    if (gpu.frameGen && fps1440 >= 4) notes.push(`${gpu.frameGen} is available on your card for even higher frame rates.`);
    else if (fps1440 >= 4 && gpu.vram >= 12) notes.push('FSR 3.1 frame generation works on your card; it works best from about 60 base FPS.');
    else if (gpu.igpu || gpu.vram > 4) notes.push('Leave frame generation off: it needs about 60 base FPS and 12–16 GB of video memory to work well.');
    if (gpu.laptop || gpu.igpu) notes.push('Laptops: plug in the charger, set Windows to best performance, and make sure the game runs on the dedicated graphics card if you have one. Laptop parts vary a lot with cooling and power.');
    if (gpu.igpu) notes.push('Integrated graphics share your RAM: 16 GB or more is a must.');
  }
  return { tier, tierLabel: TIERS[tier], limit, tiers, rows, checks, notes };
}

// Grafikkarte aus dem Namen erkennen, den der Browser meldet (z. B. "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti ...)")
// Kleinbuchstaben, nur Wörter und Zahlen, ohne Füllwörter; mit Leerzeichen an den Rändern zum Wortvergleich
const words = (text) => ` ${text.toLowerCase().replace(/\((r|tm)\)/g, ' ').replace(/[^a-z0-9]+/g, ' ')} `
  .replace(/ (graphics|gpu|laptop)(?= )/g, ' ').replace(/ +/g, ' ');

// Vergleichsnamen einer Karte: ohne Speicherangabe und Klammerzusatz; "UHD 620 / 630" ergibt "uhd 620" und "uhd 630"
function gpuKeys(g) {
  const parts = g.name.replace(/\(.*?\)/g, '').replace(/\b\d+ GB\b/g, '').split('/').map((p) => words(p).trim());
  const prefix = parts[0].split(' ').slice(0, -1).join(' ');
  return parts.filter(Boolean).map((p, i) => (i > 0 && /^\d/.test(p) ? `${prefix} ${p}` : p));
}

export function matchGpu(renderer) {
  const norm = words(renderer);
  const laptop = /laptop|mobile|max q/i.test(renderer);
  let best = null;
  for (const g of gpus) {
    for (const key of gpuKeys(g)) {
      if (!norm.includes(` ${key} `)) continue;
      const score = key.length + (!!g.laptop === laptop ? 0.5 : 0);
      if (!best || score > best.score) best = { gpu: g, score };
    }
  }
  return best ? best.gpu : null;
}
