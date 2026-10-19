import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './site.config.mjs';

export default defineConfig({
  site: SITE.url,
  base: SITE.base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: {
    // Astro baut für "esnext"; dann fasst der CSS-Minifier animation und animation-timeline zu einer
    // Kurzschrift zusammen, die kein Browser annimmt (Tiefe im Kopfbild und auftauchende Abschnitte
    // wären aus). Mit echten Browsern als Ziel bleibt animation-timeline eine eigene Angabe.
    build: { cssTarget: ['chrome107', 'edge107', 'firefox104', 'safari16'] },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
