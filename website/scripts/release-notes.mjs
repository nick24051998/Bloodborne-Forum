// Release-Texte für die Changelog-Seite. GitHub liefert sie schon als bereinigtes HTML (body_html); wir lassen
// trotzdem nur einfache Textauszeichnung durch, weil der Text aus einem fremden Repo kommt:
// Überschriften werden h3/h4, Links behalten nur ein http(s)-Ziel, alle übrigen Tags und Attribute fallen weg
// (ihr Text bleibt), Skripte, Styles und eingebettete Inhalte fallen samt Inhalt weg.
const KEEP = new Set(['p', 'br', 'hr', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'code', 'pre', 'blockquote',
  'del', 's', 'kbd', 'sub', 'sup', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);
const DROP = /<(script|style|iframe|object|embed|template|svg|math|noscript|textarea|select)\b[\s\S]*?<\/\1\s*>/gi;
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/g;
const HREF = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

const escapeText = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function cleanNotes(html) {
  if (!html?.trim()) return null;
  const source = html.replace(DROP, '');
  let out = '';
  let last = 0;
  for (const m of source.matchAll(TAG)) {
    out += escapeText(source.slice(last, m.index));
    last = m.index + m[0].length;
    const [, close, tag, attrs] = m;
    if (!tag) continue; // Kommentar
    let name = tag.toLowerCase();
    if (/^h[1-6]$/.test(name)) name = ['h1', 'h2'].includes(name) ? 'h3' : 'h4';
    else if (!KEEP.has(name)) continue;
    if (close) out += `</${name}>`;
    else if (name === 'a') {
      const m2 = attrs.match(HREF);
      const url = (m2?.[1] ?? m2?.[2] ?? m2?.[3] ?? '').replace(/&amp;/g, '&');
      out += /^https?:\/\//i.test(url) ? `<a href="${url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" rel="noopener">` : '<a>';
    } else out += `<${name}>`;
  }
  out += escapeText(source.slice(last));
  return out.trim() || null;
}
