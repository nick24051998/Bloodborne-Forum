// Basic checks for every page of the website. The page list comes from the sitemap, so new pages are
// checked automatically.
import { test, expect } from '@playwright/test';
import { SITE } from '../site.config.mjs';

const SITE_URL = SITE.url.replace(/\/$/, '');

// Paths from sitemap-index.xml → sitemap-*.xml (those contain absolute addresses with SITE.url)
async function sitemapPaths(request) {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const paths = [];
  for (const map of maps) {
    const xml = await (await request.get(map)).text();
    paths.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
  }
  return [...new Set(paths)];
}

// Collects errors while a page loads: console, script errors, broken requests to the site itself
function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`script: ${err.message}`));
  page.on('requestfailed', (req) => {
    // ERR_ABORTED: request of the previous page, aborted on navigation
    const reason = req.failure()?.errorText ?? '';
    if (new URL(req.url()).hostname === '127.0.0.1' && !reason.includes('ERR_ABORTED')) {
      errors.push(`request failed: ${req.url()} (${reason})`);
    }
  });
  page.on('response', (res) => {
    const url = new URL(res.url());
    if (url.hostname === '127.0.0.1' && res.status() >= 400) errors.push(`HTTP ${res.status()}: ${url.pathname}`);
  });
  return errors;
}

test('Sitemap and robots.txt', async ({ request }) => {
  const paths = await sitemapPaths(request);
  expect(paths, 'Sitemap enthält die Hauptseiten').toEqual(expect.arrayContaining(['/', '/install/', '/faq/']));
  expect(paths.some((p) => p.includes('404')), '404 gehört nicht in die Sitemap').toBe(false);

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${SITE_URL}/sitemap-index.xml`);
});

test('404 page', async ({ page }) => {
  const res = await page.goto('/gibt-es-nicht/');
  expect(res.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('You died.');
});

test('All pages load without errors', async ({ page, request }) => {
  const paths = await sitemapPaths(request);
  for (const path of paths) {
    await test.step(path, async () => {
      const errors = watchErrors(page);
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res.status(), `${path} antwortet`).toBe(200);

      // Title, description, canonical pointing to the real domain
      expect(await page.title(), `${path}: Titel`).not.toBe('');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^.{20,}$/s);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}${path}`);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`^${SITE_URL}/`));

      // No old address left in the source
      expect(await page.content(), `${path}: alte nrnetworks-Adresse`).not.toContain('nrnetworks.de');

      // Nothing sticks out sideways past the edge (important on phones)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path}: seitliches Scrollen`).toBeLessThanOrEqual(1);

      // All images present, including those that only load on scrolling
      const images = await page.$$eval('img', (imgs) => imgs.map((i) => ({ src: i.currentSrc || i.getAttribute('src'), alt: i.getAttribute('alt') })));
      for (const img of images) {
        expect(img.alt, `${path}: Bild ohne alt-Attribut (${img.src})`).not.toBeNull();
        if (!img.src || img.src.startsWith('data:')) continue;
        const r = await request.get(new URL(img.src, page.url()).pathname);
        expect(r.ok(), `${path}: Bild ${img.src}`).toBe(true);
      }

      expect(errors, `${path}: Fehler beim Laden`).toEqual([]);
    });
  }
});

test('Internal links never lead nowhere', async ({ page, request }) => {
  const paths = await sitemapPaths(request);
  const targets = new Set();
  for (const path of paths) {
    await page.goto(path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const href of hrefs) {
      if (/^(mailto:|tel:|#)/.test(href)) continue;
      const url = new URL(href, page.url());
      if (url.origin === new URL(page.url()).origin) targets.add(url.pathname);
      else expect(url.hostname, `${path}: Link auf alte Adresse ${href}`).not.toContain('nrnetworks.de');
    }
  }
  for (const target of targets) {
    const r = await request.get(target);
    expect(r.status(), `Link auf ${target}`).toBeLessThan(400);
  }
});
