// Small helpers for the SuperMedo Server pages (/server/, /server/hunter/ and the band on the home page). Everything that comes from the server
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

// A part SuperMedo Server doesn't fill yet: a "Coming soon" tag and what will be there
export function soon(text, tag = 'p') {
  const node = el(tag, 'sm-soon');
  node.append(el('span', 'wip-tag', 'Coming soon'), ` ${text}`);
  return node;
}

// Hunt of the week (the forum's `hunt`, Nick, 4.11.2026): what everyone does together, and the word for the numbers
const HUNTS = {
  summons: ['Play more co-op than last week', 'summons'],
  bells_rung: ['Ring more bells than last week', 'bells'],
  messages: ['Leave more messages than last week', 'messages'],
  ratings: ['Rate more messages than last week', 'ratings'],
};

// Fills a hunt-of-the-week box (its parts marked data-hunt="goal|bar|count|left") and shows it; hidden without a hunt
export function showHunt(box, h) {
  const words = h && HUNTS[h.what];
  box.hidden = !words || !h.last;
  if (box.hidden) return;
  const part = (name) => box.querySelector(`[data-hunt="${name}"]`);
  const beaten = h.now > h.last;
  const days = Math.max(1, Math.ceil((h.ends * 1000 - Date.now()) / 86400000));
  part('goal').textContent = words[0];
  part('bar').style.width = `${Math.min(100, Math.round((h.now / h.last) * 100))}%`;
  part('count').textContent = beaten
    ? `Beaten: ${num(h.now)} ${words[1]}, last week ${num(h.last)}`
    : `${num(h.now)} of ${num(h.last)} ${words[1]}`;
  part('left').textContent = days === 1 ? 'last day' : `${days} days left`;
  box.classList.toggle('is-beaten', beaten);
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
