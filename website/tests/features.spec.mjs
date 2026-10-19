// Interaktive Teile: Hardware-Check, Galerie-Großansicht, Animationen bei „Bewegung reduzieren“, Links ins Forum.
import { test, expect } from '@playwright/test';
import { SITE } from '../site.config.mjs';
import { TIERS } from '../src/data/hardware.js';

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

test('Links zu Forum und Discord zeigen auf die aktuellen Adressen', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
  if (SITE.forumUrl) expect(hrefs.some((h) => h.startsWith(SITE.forumUrl)), `Link auf ${SITE.forumUrl}`).toBe(true);
  if (SITE.discordUrl) expect(hrefs).toContain(SITE.discordUrl);
});
