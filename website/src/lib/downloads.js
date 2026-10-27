// Download count of the port: GitHub counts every download of a release asset (download_count), here only the port's
// ZIP of each release (see normalize in scripts/fetch-releases.mjs). Shared by the build, the release check and the tests.

export const totalDownloads = (releases) => releases.reduce((sum, r) => sum + (r.downloads ?? 0), 0);

// Players: downloads of the most downloaded version. The launcher installs every update from GitHub, so the total
// counts most players once per version; a single version is downloaded about once per person, so its count is the
// fairest player number we have (Ethan's idea, 27.10.2026). It never drops when a new version comes out.
export const mostDownloads = (releases) => releases.reduce((most, r) => Math.max(most, r.downloads ?? 0), 0);

// Rounded down to a readable step, so the number on the site never overstates: 566,127 → "560,000+".
// The release check rebuilds the site when this label changes (about every few hours at today's pace).
export function downloadsLabel(total) {
  if (!total) return '';
  const step = total >= 100000 ? 10000 : total >= 10000 ? 1000 : 100;
  return `${(Math.floor(total / step) * step).toLocaleString('en-US')}+`;
}
