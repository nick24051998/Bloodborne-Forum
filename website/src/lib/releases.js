// Releases des Ports (src/data/releases.json, beim Bauen frisch von GitHub, siehe scripts/fetch-releases.mjs)
import data from '../data/releases.json';

export const releases = data.releases;
export const releasesSource = data.source;
export const latest = releases.find((r) => !r.prerelease) ?? null;

export const formatDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
