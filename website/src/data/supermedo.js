// Supermedo's projects for the /supermedo/ page and the note on the home page.
// Sources: nativeretro.com (his page with all ports) and github.com/Supermedo. No numbers (downloads,
// number of ports) that would go stale; add new ports here. "code" is the short terminal-style name (max. 12 characters).

export const NATIVERETRO = {
  url: 'https://nativeretro.com/',
  requests: 'https://nativeretro.com/requests',
};

const game = (slug) => `${NATIVERETRO.url}game/${slug}`;
const repo = (name) => `https://github.com/Supermedo/${name}`;

// What the monitor at the top of the page shows (decoration only, the cards below carry the content)
export const screen = [
  ['BLOODBORNE', 'PS4', 2015],
  ['UNCHARTED', 'PS4', 2015],
  ['WET', 'X360', 2009],
  ['BLACKTHORNE', 'DOS', 1994],
  ['POP2', 'DOS', 1993],
  ['POP', 'DOS', 1989],
  ['KEEN1-7', 'DOS', 1990],
];

// Major ports: their own card with text and links. "here" marks bbport (this site).
export const ports = [
  {
    code: 'BLOODBORNE',
    title: 'Bloodborne for Windows',
    system: 'PS4',
    year: 2015,
    studio: 'FromSoftware',
    text: 'The port this site is about. A launcher in 12 languages, DLSS and FSR 3.1/4, unlocked frame rates, mods, online co-op and one-click updates.',
    here: true,
    links: [
      { label: 'Install guide', href: 'install/', internal: true },
      { label: 'GitHub', href: repo('bloodborne_pc') },
    ],
  },
  {
    code: 'UNCHARTED',
    title: 'Uncharted: The Nathan Drake Collection',
    system: 'PS4',
    year: 2015,
    studio: 'Bluepoint Games',
    text: "Bluepoint's PS4 collection, rebuilt to run natively on Windows.",
    links: [
      { label: 'NativeRetro', href: game('uncharted-the-nathan-drake-collection') },
      { label: 'GitHub', href: repo('uncharted_pc') },
    ],
  },
  {
    code: 'WET',
    title: 'WET',
    system: 'X360',
    year: 2009,
    studio: 'Artificial Mind & Movement',
    text: 'A fan PC port of the Xbox 360 shooter, built with ReXGlue. The game files come from your own copy.',
    links: [
      { label: 'NativeRetro', href: game('wet-pc-port') },
      { label: 'GitHub', href: repo('wet-recomp') },
    ],
  },
];

// Classics: as a directory listing in terminal style, each line leads to its page on NativeRetro
export const classics = [
  { code: 'BLACKTHORNE', title: 'Blackthorne', year: 1994, studio: 'Blizzard Entertainment', href: game('blackthorne') },
  { code: 'POP2', title: 'Prince of Persia 2', year: 1993, studio: 'Broderbund', href: game('prince-of-persia-2'), source: repo('prince-of-persia-2-windows') },
  { code: 'POP2-MAC', title: 'Prince of Persia 2 (Macintosh)', year: 1993, studio: 'Broderbund', href: game('prince-of-persia-2-macintosh') },
  { code: 'POP', title: 'Prince of Persia', year: 1989, studio: 'Broderbund', href: game('prince-of-persia-windows') },
  { code: 'KEEN1', title: 'Commander Keen 1: Marooned on Mars', year: 1990, studio: 'id Software', href: game('commander-keen-1-marooned-on-mars') },
  { code: 'KEEN2', title: 'Commander Keen 2: The Earth Explodes', year: 1990, studio: 'id Software', href: game('commander-keen-2-the-earth-explodes') },
  { code: 'KEEN3', title: 'Commander Keen 3: Keen Must Die!', year: 1990, studio: 'id Software', href: game('commander-keen-3-keen-must-die') },
  { code: 'KEEN4', title: 'Commander Keen 4', year: 1991, studio: 'id Software', href: game('commander-keen-4') },
  { code: 'KEEN5', title: 'Commander Keen 5: The Armageddon Machine', year: 1991, studio: 'id Software', href: game('commander-keen-5-the-armageddon-machine') },
  { code: 'KEEN6', title: 'Commander Keen 6: Aliens Ate My Baby Sitter!', year: 1991, studio: 'id Software', href: game('commander-keen-6-aliens-ate-my-baby-sitter') },
  { code: 'KEEN7', title: 'Commander Keen 7', year: 2006, href: game('commander-keen-7') },
];

// Tools: not ports, but also by him
export const tools = [
  {
    title: 'KytyPS5 – SuperMedo version',
    tags: ['PS5', 'Emulator'],
    text: "A Windows build of the KytyPS5 emulator with its own launcher, a DLSS frame generation fix, audio fixes and game fixes for Demon's Souls and God of War: Sons of Sparta.",
    href: repo('KytyPS5-SuperMedo'),
  },
  {
    title: 'X360 Manager',
    tags: ['X360', 'Game manager'],
    text: 'A modern Xbox 360 game manager with Xenia emulator built in.',
    href: repo('x360-manager'),
  },
];
