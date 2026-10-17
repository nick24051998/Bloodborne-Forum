import { SITE } from '../../site.config.mjs';

// Interner Link inklusive Base-Pfad (GitHub Pages liegt unter /Bloodborne-Forum/)
export function link(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

// Absolute URL, z. B. für Canonical, Social-Vorschau und strukturierte Daten
export function absolute(path = '') {
  return new URL(link(path), SITE.url).href;
}
