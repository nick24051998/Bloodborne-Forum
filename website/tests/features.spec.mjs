// Interaktive Teile: Hardware-Check, Galerie-Großansicht, Animationen bei „Bewegung reduzieren“, Links ins Forum,
// Download und Release-Texte.
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { SITE } from '../site.config.mjs';
import { TIERS, gpus, cpuLines, evaluate } from '../src/data/hardware.js';
import { cleanNotes } from '../scripts/release-notes.mjs';

// Dieselben Daten, aus denen die Seite gebaut wurde (im Workflow frisch von GitHub)
const { releases } = JSON.parse(readFileSync(new URL('../src/data/releases.json', import.meta.url), 'utf8'));
const latest = releases.find((r) => !r.prerelease);
const zipUrl = latest?.download ?? SITE.downloadUrl;

test.describe('Hardware-Check (Install Guide)', () => {
  const pick = async (page, { gpu, cpu, gen, ram }) => {
    await page.selectOption('#hw-gpu', { label: gpu });
    await page.selectOption('#hw-cpu', { label: cpu });
    await expect(page.locator('#hw-gen')).toBeEnabled();
    await page.selectOption('#hw-gen', { label: gen });
    await page.selectOption('#hw-ram', ram);
  };

  test('Empfohlener PC ergibt eine Einschätzung mit Tabelle und Teilen-Link', async ({ page }) => {
    await page.goto('/install/');
    await expect(page.locator('#hwcheck-heading')).toHaveText('Will it run on my PC?');
    await pick(page, { gpu: 'RTX 3060 Ti', cpu: 'Core i7', gen: '12th gen (i7-12xxx)', ram: '32' });

    const tier = page.locator('.hw-result .hw-tier');
    await expect(tier).toBeVisible();
    expect(TIERS).toContain(await tier.textContent());
    await expect(tier).toHaveText(/Recommended|4K-ready|Above minimum/);
    await expect(page.locator('.hw-result table.hw-table')).toBeVisible();
    await expect(page.locator('.hw-result .hw-copy')).toBeVisible();

    // Die Auswahl steht in der Adresse; ein geteilter Link stellt dasselbe Ergebnis wieder her
    const shared = page.url();
    expect(new URL(shared).searchParams.get('gpu')).toBeTruthy();
    const label = await tier.textContent();
    await page.goto(shared);
    await expect(page.locator('.hw-result .hw-tier')).toHaveText(label);
    await expect(page.locator('#hw-ram')).toHaveValue('32');
  });

  test('Prozessor ohne nötige Befehlssätze wird als nicht unterstützt erkannt', async ({ page }) => {
    await page.goto('/install/');
    await page.selectOption('#hw-gpu', { label: 'RTX 3060 Ti' });
    await page.selectOption('#hw-cpu', { label: 'FX / A-series / Phenom' });
    await expect(page.locator('#hw-gen')).toBeEnabled();
    const options = await page.locator('#hw-gen option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    await page.selectOption('#hw-gen', options[0]);
    await page.selectOption('#hw-ram', '16');
    await expect(page.locator('.hw-result .hw-tier')).toHaveText('Not supported');
  });
});

test.describe('Galerie auf der Startseite', () => {
  test('Kacheln und Großansicht', async ({ page }) => {
    await page.goto('/');
    const tiles = page.locator('.showcase-grid .tile');
    expect(await tiles.count()).toBeGreaterThanOrEqual(1);

    const withImage = page.locator('.tile-open');
    test.skip((await withImage.count()) === 0, 'Noch keine Bilder in der Galerie');

    // Jede Kachel mit Bild hat ein geladenes Vorschaubild
    for (const img of await page.locator('.tile-open img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    }

    // Großansicht: öffnet, zeigt das Bild in voller Größe samt Titel, schließt mit Esc
    await withImage.first().scrollIntoViewIfNeeded();
    await withImage.first().click();
    const dialog = page.locator('dialog.lightbox');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#lightbox-title')).not.toBeEmpty();
    const big = dialog.locator('.lightbox-img');
    await expect.poll(() => big.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThanOrEqual(1200);

    // Zoom: Klick vergrößert, 0 setzt zurück, + und Mausrad zoomen, Ziehen verschiebt
    const stage = dialog.locator('.lightbox-stage');
    const scaleOf = () => big.evaluate((i) => {
      const t = getComputedStyle(i).transform;
      return t === 'none' ? 1 : new DOMMatrix(t).a;
    });
    await stage.click();
    await expect(stage).toHaveClass(/is-zoomed/);
    await expect.poll(scaleOf).toBeGreaterThanOrEqual(1.9);
    await expect(dialog.locator('.lightbox-zoom-out')).toBeEnabled();
    await page.keyboard.press('0');
    await expect(stage).not.toHaveClass(/is-zoomed/);
    await expect.poll(scaleOf).toBe(1);
    await dialog.locator('.lightbox-zoom-in').click();
    await expect(stage).toHaveClass(/is-zoomed/);
    if (test.info().project.name === 'desktop') {
      const box = await stage.boundingBox();
      await page.keyboard.press('0');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -200);
      await expect(stage).toHaveClass(/is-zoomed/);
      // Ziehen verschiebt den Ausschnitt
      await expect.poll(scaleOf).toBeGreaterThan(1.2);
      const before = await big.evaluate((i) => getComputedStyle(i).transform);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 5 });
      await page.mouse.up();
      expect(await big.evaluate((i) => getComputedStyle(i).transform)).not.toBe(before);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test('„Bewegung reduzieren“ schaltet die Animationen ab', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const anim = await page.locator('.hero .emblem-art').evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
  await context.close();
});

test('Startseite nennt den Port von Supermedo mit Link zu GitHub', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.hero-port');
  await expect(line).toContainText(SITE.portName);
  await expect(line).toContainText(SITE.portAuthor);
  await expect(line.locator(`a[href="${SITE.portRepoUrl}"]`)).toBeVisible();
  await expect(page.locator(`footer a[href="${SITE.portRepoUrl}"]`)).toHaveCount(1);
});

test.describe('Download und Releases', () => {
  test('Startseite lädt die ZIP direkt, ohne Umweg über GitHub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .actions a', { hasText: /^Download/ })).toHaveAttribute('href', zipUrl);
    if (latest?.download) {
      expect(latest.download).toMatch(/^https:\/\/github\.com\/Supermedo\/bloodborne_pc\/releases\/download\/[^/]+\/[^/]+\.zip$/);
      await expect(page.locator('.hero-download')).toContainText(`${latest.downloadSize} MB`);
    }
  });

  test('Install Guide und FAQ verlinken die ZIP direkt', async ({ page }) => {
    for (const path of ['/install/', '/faq/', '/guide/']) {
      await page.goto(path);
      await expect(page.locator('a[href="#latest-download"]'), path).toHaveCount(0);
      expect(await page.locator(`a[href="${zipUrl}"]`).count(), path).toBeGreaterThan(0);
    }
  });

  test('Changelog zeigt Download, Prüfsumme und Release-Texte', async ({ page }) => {
    test.skip(!latest, 'keine Releases in src/data/releases.json');
    await page.goto('/changelog/');
    const box = page.locator('.release-latest');
    await expect(box.locator('a.btn-primary')).toHaveAttribute('href', zipUrl);
    if (latest.sha256) await expect(box.locator('.release-hash')).toHaveText(latest.sha256.toUpperCase());

    const entry = page.locator(`#release-${latest.version.replace(/[^0-9a-z]+/gi, '-')}`);
    await expect(entry).toHaveAttribute('open', '');
    await box.getByRole('link', { name: 'Release notes', exact: true }).click();
    await expect(entry).toBeInViewport();
    if (latest.notes) await expect(entry.locator('.release-notes li').first()).toBeVisible();
  });
});

test('Launcher guide: im Menü, mit den Abschnitten und dem Beta-Link', async ({ page }) => {
  await page.goto('/');
  // Auf dem Handy steckt das Menü im Seitenmenü, der Link ist trotzdem da
  await expect(page.locator('header a[href$="/guide/"]').first()).toHaveCount(1);
  await page.goto('/guide/');
  await expect(page.locator('h1')).toHaveText(/Launcher guide/i);
  for (const id of ['whats-included', 'online-play', 'saves', 'mods', 'test-build-195-beta-2']) {
    await expect(page.locator(`h2#${id}`), id).toHaveCount(1);
  }
  await expect(page.locator('a[href*="nick24051998/bloodborne_pc/releases/tag/v1.9.5-beta"]')).toHaveCount(1);
});

test('Hardware-Check bewertet Intels Arc-Grafik im Prozessor wie der Launcher', () => {
  const ultra = cpuLines.find((l) => l.id === 'intel-core-ultra');
  const gen = ultra.gens.find((g) => g.id === 'u1-5');
  for (const name of ['Arc graphics (Core Ultra 100H)', 'Arc 140V / 130V (Core Ultra 200V)']) {
    const gpu = gpus.find((g) => g.name === name);
    const result = evaluate(gpu, ultra, gen, 32);
    expect(TIERS[result.tiers.gpu], name).toBe('Above minimum');
    expect(result.notes.join(' '), name).toContain('1.9.4 may still show an older, lower rating');
  }
  const h = gpus.find((g) => g.name === 'Arc graphics (Core Ultra 100H)');
  const v = gpus.find((g) => g.name === 'Arc 140V / 130V (Core Ultra 200V)');
  expect(v.score).toBeGreaterThan(h.score);
});

test('Release-Texte behalten nur einfache Auszeichnung', () => {
  const html = cleanNotes(
    '<h2 id="x" onclick="alert(1)">New</h2><p>a <script>alert(1)</script><img src=x onerror=alert(1)>' +
    '<a href="javascript:alert(1)">x</a> <a class="u" href="https://github.com/a?b=1&amp;c=2" data-x="1">@a</a></p>' +
    '<style>p{}</style><iframe src="https://e"></iframe>',
  );
  expect(html).toBe('<h3>New</h3><p>a <a>x</a> <a href="https://github.com/a?b=1&amp;c=2" rel="noopener">@a</a></p>');
  expect(cleanNotes('')).toBeNull();
});

test('Links zu Forum und Discord zeigen auf die aktuellen Adressen', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
  if (SITE.forumUrl) expect(hrefs.some((h) => h.startsWith(SITE.forumUrl)), `Link auf ${SITE.forumUrl}`).toBe(true);
  if (SITE.discordUrl) expect(hrefs).toContain(SITE.discordUrl);
});
