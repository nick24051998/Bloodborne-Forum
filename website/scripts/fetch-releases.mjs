// Releases des Ports von GitHub (Repo aus SITE.downloadUrl). Läuft in .github/workflows/website.yml:
//
//   node scripts/fetch-releases.mjs             schreibt src/data/releases.json (bei Fehlern bleibt die alte Datei)
//   node scripts/fetch-releases.mjs --check     neueste Version auf GitHub und auf der Website → $GITHUB_OUTPUT
//                                               (changed: neu bauen; announce: wirklich neuer, also melden)
//   node scripts/fetch-releases.mjs --announce  meldet die neueste Version in Discord (DISCORD_RELEASES_WEBHOOK)
//
// GITHUB_TOKEN (in Actions automatisch) hebt das Abfragelimit an. Zum Testen: RELEASES_FIXTURE=antwort.json
// statt der GitHub-API, LIVE_RELEASE_URL statt <Website>/release.json.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { SITE } from '../site.config.mjs';
import { cleanNotes } from './release-notes.mjs';

const repo = SITE.downloadUrl.match(/github\.com\/([^/]+\/[^/]+)/)?.[1];
const dataFile = new URL('../src/data/releases.json', import.meta.url);
const siteUrl = `${SITE.url}${SITE.base}`.replace(/\/$/, '');

async function github(path, accept = 'application/vnd.github+json') {
  const headers = { Accept: accept, 'User-Agent': 'bbport-website' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub antwortet mit ${response.status}`);
  return response.json();
}

async function fetchReleases() {
  if (process.env.RELEASES_FIXTURE) return JSON.parse(await readFile(process.env.RELEASES_FIXTURE, 'utf8'));
  return github('/releases?per_page=40');
}

// Release-Texte als HTML (body_html, so wie GitHub sie anzeigt) für die Releases, die der Changelog zeigt, einzeln
// je Release: Die ganze Liste mit Texten (full+json) kam von GitHub mal leer zurück, beim Bauen auch bei 20 Stück.
// Fehlt ein Text, verlinkt der Changelog für dieses Release auf GitHub.
const NOTES_FOR = 12;
async function addNotes(api) {
  const shown = new Set(normalize(api).slice(0, NOTES_FOR).map((r) => r.tag));
  for (const r of api.filter((x) => shown.has(x.tag_name))) {
    try {
      r.body_html = (await github(`/releases/${r.id}`, 'application/vnd.github.html+json')).body_html;
    } catch (e) {
      console.log(`::warning::Release-Text von ${r.tag_name} nicht abrufbar: ${e.message}`);
    }
  }
  return api;
}

// Nur veröffentlichte Releases; gibt es Windows-Tags (windows-v1.9.2), dann nur diese
export function normalize(api) {
  const visible = api.filter((r) => !r.draft);
  const windows = visible.filter((r) => /^windows-/i.test(r.tag_name));
  return (windows.length ? windows : visible)
    .map((r) => {
      // Seit 1.9.4 hängen zwei ZIPs am Release (Port und fsr4vk-…-src.zip): die des Ports nehmen
      const zips = (r.assets ?? []).filter((a) => /\.zip$/i.test(a.name));
      const zip = zips.find((a) => /^Bloodborne/i.test(a.name)) ?? zips.find((a) => !/-src\.zip$/i.test(a.name)) ?? zips[0];
      const published = r.published_at ?? r.created_at ?? '';
      return {
        version: r.tag_name.replace(/^windows-/i, '').replace(/^v/i, ''),
        tag: r.tag_name,
        name: r.name || r.tag_name,
        date: published.slice(0, 10),
        publishedAt: published,
        url: r.html_url,
        prerelease: Boolean(r.prerelease),
        download: zip?.browser_download_url ?? null,
        downloadName: zip?.name ?? null,
        downloadSize: zip ? Math.round(zip.size / 1048576) : null,
        // GitHub rechnet die Prüfsumme selbst aus ("sha256:…"), damit lässt sich die ZIP nach dem Download prüfen
        sha256: /^sha256:[0-9a-f]{64}$/i.test(zip?.digest ?? '') ? zip.digest.slice(7) : null,
        notes: cleanNotes(r.body_html),
      };
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

const latestOf = (releases) => releases.find((r) => !r.prerelease) ?? null;

// 1.10 > 1.9.2 > 1.9; zurückgezogene Versionen (GitHub älter als die Website) werden nicht gemeldet
export function isNewer(a, b) {
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

async function liveVersion() {
  try {
    const response = await fetch(process.env.LIVE_RELEASE_URL ?? `${siteUrl}/release.json`, { signal: AbortSignal.timeout(15000) });
    return response.ok ? ((await response.json()).version ?? '') : '';
  } catch {
    return '';
  }
}

async function output(values) {
  for (const [key, value] of Object.entries(values)) console.log(`${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join(''));
  }
}

const mode = process.argv[2] ?? '';

if (mode === '--check') {
  // Fehler bei GitHub: latest bleibt leer, dann baut und meldet der Zeitplan nichts
  let latest = '';
  try {
    latest = latestOf(normalize(await fetchReleases()))?.version ?? '';
  } catch (e) {
    console.log(`::warning::Releases nicht abrufbar: ${e.message}`);
  }
  const live = await liveVersion();
  await output({
    latest,
    live,
    changed: Boolean(latest) && latest !== live,
    // Erste Veröffentlichung (live leer): nichts melden, die Version ist ja nicht neu
    announce: Boolean(latest && live) && isNewer(latest, live),
  });
} else if (mode === '--announce') {
  const webhook = process.env.DISCORD_RELEASES_WEBHOOK;
  if (!webhook) {
    console.log('DISCORD_RELEASES_WEBHOOK ist nicht gesetzt, keine Meldung.');
    process.exit(0);
  }
  const latest = latestOf(normalize(await fetchReleases()));
  if (!latest) process.exit(0);
  const download = latest.downloadName ? `download ${latest.downloadName} from GitHub` : 'download it from GitHub';
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Bloodborne PC Port',
      avatar_url: `${siteUrl}/apple-touch-icon.png`,
      allowed_mentions: { parse: [] },
      embeds: [{
        title: `Bloodborne for Windows ${latest.version} is out`,
        url: latest.url,
        color: 0x8a1118,
        description: `Update with one click in the launcher, or ${download}.\n\n` +
          `[What changed](${siteUrl}/changelog/) · [Release notes](${latest.url}) · [Install guide](${siteUrl}/install/)`,
        timestamp: latest.publishedAt || undefined,
      }],
    }),
  });
  if (!response.ok) throw new Error(`Discord antwortet mit ${response.status}`);
  console.log(`Gemeldet: ${latest.version}`);
} else {
  try {
    const api = await fetchReleases();
    const releases = normalize(process.env.RELEASES_FIXTURE ? api : await addNotes(api));
    if (!releases.length) throw new Error('keine Releases gefunden');
    await writeFile(dataFile, `${JSON.stringify({ source: `https://github.com/${repo}/releases`, fetchedAt: new Date().toISOString(), releases }, null, 2)}\n`);
    console.log(`${releases.length} Releases, neueste: ${latestOf(releases)?.version}, mit Text: ${releases.filter((r) => r.notes).length}`);
  } catch (e) {
    // Die Website baut dann mit dem Stand aus dem Repo
    console.log(`::warning::Releases nicht abrufbar, nutze src/data/releases.json aus dem Repo: ${e.message}`);
  }
}
