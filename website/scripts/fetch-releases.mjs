// Releases of the port from GitHub (repo taken from SITE.downloadUrl). Runs in .github/workflows/website.yml:
//
//   node scripts/fetch-releases.mjs             writes src/data/releases.json (on errors the old file stays)
//   node scripts/fetch-releases.mjs --check     latest version on GitHub and on the website → $GITHUB_OUTPUT
//                                               (changed: new version or next download step, so rebuild;
//                                               announce: really newer, so announce it)
//   node scripts/fetch-releases.mjs --announce  announces the latest version on Discord (DISCORD_RELEASES_WEBHOOK)
//
// GITHUB_TOKEN (set automatically in Actions) raises the rate limit. For testing: RELEASES_FIXTURE=response.json
// instead of the GitHub API, LIVE_RELEASE_URL instead of <website>/release.json.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { SITE } from '../site.config.mjs';
import { cleanNotes } from './release-notes.mjs';
import { totalDownloads, downloadsLabel } from '../src/lib/downloads.js';

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
  // Every page: the download count adds up all releases, not just the newest ones
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await github(`/releases?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

// Release texts as HTML (body_html, as GitHub displays them) for the releases the changelog shows, fetched one
// by one per release: the whole list with texts (full+json) once came back empty from GitHub, also with 20 items.
// If a text is missing, the changelog links to GitHub for that release.
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

// Only published releases; if there are Windows tags (windows-v1.9.2), only those
export function normalize(api) {
  const visible = api.filter((r) => !r.draft);
  const windows = visible.filter((r) => /^windows-/i.test(r.tag_name));
  return (windows.length ? windows : visible)
    .map((r) => {
      // Since 1.9.4 two ZIPs are attached to the release (the port and fsr4vk-…-src.zip): take the port's
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
        downloads: zip?.download_count ?? 0,
        // GitHub computes the checksum itself ("sha256:…"), so the ZIP can be verified after downloading
        sha256: /^sha256:[0-9a-f]{64}$/i.test(zip?.digest ?? '') ? zip.digest.slice(7) : null,
        notes: cleanNotes(r.body_html),
      };
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

const latestOf = (releases) => releases.find((r) => !r.prerelease) ?? null;

// 1.10 > 1.9.2 > 1.9; withdrawn versions (GitHub older than the website) are not announced
export function isNewer(a, b) {
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

async function liveRelease() {
  try {
    const response = await fetch(process.env.LIVE_RELEASE_URL ?? `${siteUrl}/release.json`, { signal: AbortSignal.timeout(15000) });
    return response.ok ? await response.json() : {};
  } catch {
    return {};
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
  // Error from GitHub: latest stays empty, so the schedule neither builds nor announces anything
  let latest = '';
  let downloads = '';
  try {
    const releases = normalize(await fetchReleases());
    latest = latestOf(releases)?.version ?? '';
    downloads = downloadsLabel(totalDownloads(releases));
  } catch (e) {
    console.log(`::warning::Releases nicht abrufbar: ${e.message}`);
  }
  const liveData = await liveRelease();
  const live = liveData.version ?? '';
  const liveDownloads = downloadsLabel(liveData.downloads ?? 0);
  await output({
    latest,
    live,
    downloads,
    liveDownloads,
    // A new version, or the download count on the home page has moved to the next step
    changed: Boolean(latest) && (latest !== live || (Boolean(downloads) && downloads !== liveDownloads)),
    // First publication (live is empty): announce nothing, the version isn't new after all
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
    // The website then builds with the state from the repo
    console.log(`::warning::Releases nicht abrufbar, nutze src/data/releases.json aus dem Repo: ${e.message}`);
  }
}
