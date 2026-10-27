// Releases of the port (src/data/releases.json, fetched fresh from GitHub at build time, see scripts/fetch-releases.mjs)
import data from '../data/releases.json';
import { SITE } from '../../site.config.mjs';

export const releases = data.releases;
export const releasesSource = data.source;
export const latest = releases.find((r) => !r.prerelease) ?? null;

// The ZIP of the latest version directly (without a detour via the GitHub page); if it is missing, the release page
export const downloadUrl = latest?.download ?? SITE.downloadUrl;

// Links with href="#latest-download" in the texts (install.md, faq.md) point to this ZIP at build time
export const withDownloadLinks = (html) =>
  html.replaceAll('href="#latest-download"', `href="${downloadUrl}" rel="noopener"`);

// Anchor of a release on the changelog page: 1.9.2 → release-1-9-2
export const releaseAnchor = (r) => `release-${r.version.replace(/[^0-9a-z]+/gi, '-')}`;

export const formatDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
