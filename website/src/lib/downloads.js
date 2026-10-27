// Download count of the port: GitHub counts every download of a release asset (download_count), here only the port's
// ZIP of each release (see normalize in scripts/fetch-releases.mjs). Shared by the build, the release check and the tests.

export const totalDownloads = (releases) => releases.reduce((sum, r) => sum + (r.downloads ?? 0), 0);

// Rounded down to a readable step, so the number on the site never overstates: 566,127 → "560,000+".
// The release check rebuilds the site when this label changes (about every few hours at today's pace).
export function downloadsLabel(total) {
  if (!total) return '';
  const step = total >= 100000 ? 10000 : total >= 10000 ? 1000 : 100;
  return `${(Math.floor(total / step) * step).toLocaleString('en-US')}+`;
}
