// /release.json: latest version on the website. The workflow compares it with GitHub (new version → build, report;
// download or player count at the next step → build).
import { latest, downloads, players } from '../lib/releases.js';

export function GET() {
  const body = latest
    ? { version: latest.version, tag: latest.tag, date: latest.date, url: latest.url, download: latest.download, sha256: latest.sha256 ?? null, downloads, players }
    : {};
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
