// Small helpers for the SuperMedo Server pages (/server/ and /server/hunter/). Everything that comes from the server
// (Online IDs, message texts) goes in as text, never as HTML.

export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export const num = (value) => Number(value ?? 0).toLocaleString('en-US');

// Minutes as hours with one decimal ("11.9")
export const hours = (minutes) => (Number(minutes ?? 0) / 60).toFixed(1);

// Unix time in the visitor's own clock: "today 18:42", "yesterday 21:15", "27 Oct, 21:15";
// short: only the time if it was today; dateOnly: "27 Oct"; timeOnly: "18:42"
export function when(seconds, short = false, dateOnly = false, timeOnly = false) {
  if (!seconds) return '–';
  const date = new Date(seconds * 1000);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (timeOnly) return time;
  if (dateOnly) return day;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start.getTime() - date.getTime()) / 86400000) + 1;
  if (date >= start) return short ? time : `today ${time}`;
  if (diff === 1 && !short) return `yesterday ${time}`;
  return `${day}, ${time}`;
}

// Unix time always with date and time, "28 Oct, 20:51" (for "online since": "20:51" alone leaves the day open)
export const stamp = (seconds) => new Date(seconds * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// The opening day from the forum ("2026-10-28", the API has none) as "28 Oct", with the year once it is another one
export function openedDay(iso) {
  const date = new Date(`${iso}T12:00:00Z`);
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year });
}

// The first 30 days after the opening, the pages call the server new
export const isNew = (iso) => Boolean(iso) && Date.now() - Date.parse(`${iso}T00:00:00Z`) < 30 * 86400000;

// "Healing Church Workshop, Upper Cathedral Ward", or just the area when the place has the same name
export function place(item) {
  const spot = item.place || '';
  const area = item.area || '';
  return spot && area && spot !== area ? `${spot}, ${area}` : area || spot;
}

export function hunterLink(base, name, className = '') {
  const a = el('a', className, name || '?');
  a.href = `${base}?id=${encodeURIComponent(name || '')}`;
  return a;
}

// How a hunter died, after their name
export function death(d) {
  switch (d.cause) {
    case 'killed': return d.killer ? `was killed by ${d.killer}` : 'was killed';
    case 'fall': return 'fell';
    case 'poison': return 'died of poison';
    case 'brainsucker': return 'was drained by a Brainsucker';
    default: return 'died';
  }
}
