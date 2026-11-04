// What the forum answers under /api/bb-server (flarum/server-stats.php), as fixed samples. With them the checks don't
// depend on who is online right now, nor on the forum answering at all: it updates itself every 5 minutes, and a check
// that met it in the middle of one ran out of time on /server/ (4.11.2026).
export const CORS = { 'Access-Control-Allow-Origin': '*' };

// The overview for /server/
export const SERVER_SAMPLE = {
  server: {
    status: 'online', awake_since: 1793213799, registration: 'open', online: 2, counting_since: 1793104933,
    bells: { helpers: 0, hosts_searching: 1, invaders: 0 }, hunters: { registered: 27, played_online: 23, new_this_week: 27 },
    peak_online: { today: { online: 3, at: 1793145605 }, ever: { online: 3, at: 1793138885 } },
    last_24h: { bells_rung: 11, deaths: 44, hunter_minutes: 715, messages: 6, ratings: 4, summons: 1, summons_joined: 1 },
    totals: { bells_rung: 19, deaths: 118, hunter_minutes: 1066, messages: 18, ratings: 6, summons: 3, summons_joined: 3 },
    deaths_by_cause: { killed: 82, fall: 30, other: 6, poison: 0, brainsucker: 0 },
  },
  areas: [
    { name: "Hunter's Dream", online: 1, hunter_minutes: 229, deaths: 0, bells_rung: 0, messages: 1, footsteps: 283 },
    { name: "Yahar'gul, Unseen Village", online: 1, hunter_minutes: 38, deaths: 13, bells_rung: 0, messages: 1, footsteps: 124 },
  ],
  history: [{ date: '2026-10-28', hunters: 13, new_hunters: 7, peak_online: 3, peak_at: 1793145605, hunter_minutes: 495,
    deaths: 35, messages: 6, ratings: 4, bells_rung: 5, summons: 0, summons_joined: 0 }],
  killers: [{ name: 'Orphan of Kos', deaths: 3 }],
  deaths: [{ player: 'rowl666', cause: 'killed', killer: 'Father Gascoigne', place: 'Central Yharnam', area: 'Central Yharnam', time: 1793209156 }],
  messages: [{ text: 'remember Thrust attack', author: 'medo1986', place: 'Old Yharnam', area: 'Old Yharnam', good: 0, poor: 0, written: 1792954957 }],
  leaderboards: { minutes_played: [{ rank: 1, name: 'rowl666', value: 667 }] },
  week: {},
  hunters: [{ name: '<b>x</b>', level: 114, minutes_played: 667, deaths: 40, summoned_to_help: 0, summons_hosted: 1, invasions: 1,
    messages: 9, last_seen: 1793210233, online: false }],
  huntersTotal: 1,
  chalices: [{ glyph: 'bpahczp9', depth: 1, visits: 0, maker: null, made: 1793204375 }],
  // Counted since 1.11.2026, still empty here: the page says "Coming soon"
  online: [{ hour: 1793210400, average: 2.5, peak: 3 }, { hour: 1793214000, average: 1.5, peak: 2 }],
  pvp: { counting_since: 1793552819, hunters_slain: 0, results: { host_died: 0, invader_died: 0, invader_left: 0 },
    boards: { hunters_slain: [], invaders_repelled: [], invasions_won: [] }, recent: [] },
  deeds: { beasts_slain: 0, by_area: [], by_enemy: [], counting_since: 1793552819, deeds: { parry: 0, visceral: 0 } },
  bosses: [],
  maps: [{ code: 'm24_01', name: 'Central Yharnam', online: 2 }],
  // Hunt of the week: bells, three and a half days to go
  hunt: { what: 'bells_rung', now: 15009, last: 24690, ends: Math.floor(Date.now() / 1000 + 3.5 * 86400) },
  updatedAt: 1793220298,
};

// The home page band (/api/bb-server/summary)
export const SUMMARY_SAMPLE = { status: 'online', opened: '2026-10-28', awakeSince: 1793213799, online: 583, peakEver: 766,
  registered: 27000, bells: { helpers: 0, hosts_searching: 0, invaders: 0 }, playedToday: 2521, peakToday: 583, fastest: null,
  hunt: SERVER_SAMPLE.hunt, updatedAt: 1793220298 };

// One area of the map without the hunters online now (SuperMedo Server doesn't send them yet)
export const MAP_SAMPLE = { code: 'm24_01', name: 'Central Yharnam', grid: 2, online: 2, floor: [[0, 0], [2, 0], [2, 2]], now: null, updatedAt: 1793220298 };
// Every area at a glance (the small maps under the big one), as the forum answers /api/bb-server/maps
export const tilesOf = (...areas) => ({ areas: areas.map((a) => ({ grid: 8, floor: [[0, 0], [8, 0], [8, 8]], now: null, ...a })), updatedAt: 1793220298 });

// A 1×1 PNG for an area's picture
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// Every call a page makes to the forum's server statistics, answered from the samples above. Anything else gets a 404:
// when a page starts asking the forum for something new, add a sample here.
export const answerForum = (page) => page.route('**/api/bb-server**', (route) => {
  const path = new URL(route.request().url()).pathname.split('/api/bb-server')[1].replace(/\/$/, '');
  if (path === '') return route.fulfill({ json: SERVER_SAMPLE, headers: CORS });
  if (path === '/summary') return route.fulfill({ json: SUMMARY_SAMPLE, headers: CORS });
  if (path === '/maps') return route.fulfill({ json: tilesOf(...SERVER_SAMPLE.maps), headers: CORS });
  if (/^\/map\/[^/]+\/image$/.test(path)) return route.fulfill({ body: PNG, contentType: 'image/png', headers: CORS });
  if (/^\/map\/[^/]+$/.test(path)) return route.fulfill({ json: MAP_SAMPLE, headers: CORS });
  return route.fulfill({ status: 404, json: { error: 'no sample for this' }, headers: CORS });
});
