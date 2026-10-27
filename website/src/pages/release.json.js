// /release.json: latest version on the website. The workflow compares it with GitHub (new version → build, report).
import { latest } from '../lib/releases.js';

export function GET() {
  const body = latest
    ? { version: latest.version, tag: latest.tag, date: latest.date, url: latest.url, download: latest.download, sha256: latest.sha256 ?? null }
    : {};
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
