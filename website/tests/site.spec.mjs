// Grundprüfungen für jede Seite der Website. Die Seitenliste kommt aus der Sitemap, neue Seiten werden also
// automatisch mitgeprüft.
import { test, expect } from '@playwright/test';
import { SITE } from '../site.config.mjs';

const SITE_URL = SITE.url.replace(/\/$/, '');

// Pfade aus sitemap-index.xml → sitemap-*.xml (dort stehen absolute Adressen mit SITE.url)
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

// Sammelt Fehler, während eine Seite lädt: Konsole, Skriptfehler, kaputte Anfragen an die eigene Seite
function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`script: ${err.message}`));
  page.on('requestfailed', (req) => {
    // ERR_ABORTED: Anfrage der vorigen Seite, beim Seitenwechsel abgebrochen
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

test('Sitemap und robots.txt', async ({ request }) => {
  const paths = await sitemapPaths(request);
  expect(paths, 'Sitemap enthält die Hauptseiten').toEqual(expect.arrayContaining(['/', '/install/', '/faq/']));
  expect(paths.some((p) => p.includes('404')), '404 gehört nicht in die Sitemap').toBe(false);

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${SITE_URL}/sitemap-index.xml`);
});

test('404-Seite', async ({ page }) => {
  const res = await page.goto('/gibt-es-nicht/');
  expect(res.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('You died.');
});

test('Alle Seiten laden fehlerfrei', async ({ page, request }) => {
  const paths = await sitemapPaths(request);
  for (const path of paths) {
    await test.step(path, async () => {
      const errors = watchErrors(page);
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res.status(), `${path} antwortet`).toBe(200);

      // Titel, Beschreibung, Canonical auf die echte Domain
      expect(await page.title(), `${path}: Titel`).not.toBe('');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^.{20,}$/s);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_URL}${path}`);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`^${SITE_URL}/`));

      // Keine alte Adresse mehr im Quelltext
      expect(await page.content(), `${path}: alte nrnetworks-Adresse`).not.toContain('nrnetworks.de');

      // Nichts ragt seitlich über den Rand (wichtig auf dem Handy)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path}: seitliches Scrollen`).toBeLessThanOrEqual(1);

      // Alle Bilder vorhanden, auch die erst beim Scrollen geladenen
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

test('Interne Links führen nirgends ins Leere', async ({ page, request }) => {
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
