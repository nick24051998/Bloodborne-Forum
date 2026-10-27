import { SITE } from '../../site.config.mjs';

// Internal link including the base path (GitHub Pages lives under /Bloodborne-Forum/)
export function link(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

// Absolute URL, e.g. for canonical, social preview and structured data
export function absolute(path = '') {
  return new URL(link(path), SITE.url).href;
}
