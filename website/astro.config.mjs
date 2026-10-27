import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './site.config.mjs';

export default defineConfig({
  site: SITE.url,
  base: SITE.base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: {
    // Astro builds for "esnext"; the CSS minifier then folds animation and animation-timeline into a
    // shorthand that no browser accepts (the depth effect in the hero image and the sections that fade in
    // would be off). With real browsers as the target, animation-timeline stays a separate declaration.
    build: { cssTarget: ['chrome107', 'edge107', 'firefox104', 'safari16'] },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
