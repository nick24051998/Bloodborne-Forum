// /release.json: neueste Version auf der Website. Der Workflow vergleicht sie mit GitHub (neue Version → bauen, melden).
import { latest } from '../lib/releases.js';

export function GET() {
  const body = latest
    ? { version: latest.version, tag: latest.tag, date: latest.date, url: latest.url, download: latest.download, sha256: latest.sha256 ?? null }
    : {};
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
