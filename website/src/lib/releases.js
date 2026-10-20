// Releases des Ports (src/data/releases.json, beim Bauen frisch von GitHub, siehe scripts/fetch-releases.mjs)
import data from '../data/releases.json';
import { SITE } from '../../site.config.mjs';

export const releases = data.releases;
export const releasesSource = data.source;
export const latest = releases.find((r) => !r.prerelease) ?? null;

// Die ZIP der neuesten Version direkt (ohne Umweg über die GitHub-Seite); fehlt sie, die Release-Seite
export const downloadUrl = latest?.download ?? SITE.downloadUrl;

// Links mit href="#latest-download" in den Texten (install.md, faq.md) zeigen beim Bauen auf diese ZIP
export const withDownloadLinks = (html) =>
  html.replaceAll('href="#latest-download"', `href="${downloadUrl}" rel="noopener"`);

// Sprungmarke eines Releases auf der Changelog-Seite: 1.9.2 → release-1-9-2
export const releaseAnchor = (r) => `release-${r.version.replace(/[^0-9a-z]+/gi, '-')}`;

export const formatDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
