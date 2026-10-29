// Download count of the port: GitHub counts every download of a release asset (download_count), here only the port's
// ZIP of each release (see normalize in scripts/fetch-releases.mjs). Shared by the build, the release check and the tests.

export const totalDownloads = (releases) => releases.reduce((sum, r) => sum + (r.downloads ?? 0), 0);
// No "players" figure any more (until 29.10.2026: downloads of the most downloaded version): downloads don't say how
// many people play, and the site only shows numbers its data backs (UX review 29.10.2026). Real players: the
// SuperMedo Server band (hunters joined, online now).

// Rounded down to a readable step, so the number on the site never overstates: 566,127 → "560,000+".
// The release check rebuilds the site when this label changes (about every few hours at today's pace).
export function downloadsLabel(total) {
  if (!total) return '';
  const step = total >= 100000 ? 10000 : total >= 10000 ? 1000 : 100;
  return `${(Math.floor(total / step) * step).toLocaleString('en-US')}+`;
}
