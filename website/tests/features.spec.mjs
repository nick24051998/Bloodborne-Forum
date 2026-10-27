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
    // Das # dahinter ist der Link zu dieser Stelle (Sprungmarken in Base.astro)
    await expect(page.locator('#hwcheck-heading')).toHaveText(/^Will it run on my PC\?/);
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

test('Sprungmarken: FAQ-Fragen öffnen per Link, Überschriften haben #-Links', async ({ page }) => {
  await page.goto('/faq/#code-3');
  const question = page.locator('details#code-3');
  await expect(question).toHaveAttribute('open', '');
  await expect(question.locator('summary a.anchor-link')).toHaveAttribute('href', '#code-3');
  const ids = await page.$$eval('.faq details', (all) => all.map((d) => d.id));
  expect(ids.every(Boolean), 'jede Frage hat eine id').toBe(true);
  expect(new Set(ids).size, 'ids sind eindeutig').toBe(ids.length);

  await page.goto('/guide/');
  const link = page.locator('h2#online-play a.anchor-link');
  await expect(link).toHaveAttribute('href', '#online-play');
  await link.click();
  await expect(page).toHaveURL(/\/guide\/#online-play$/);
});

// FAQ übersichtlich: Fragen nach Themen, oben Themenleiste und Suche; ohne Treffer der Weg zu Known Fixes im Forum
test('FAQ: Themen, Themenleiste und Suche', async ({ page }) => {
  await page.goto('/faq/');
  const topics = page.locator('.faq-topics a');
  expect(await topics.count()).toBeGreaterThanOrEqual(6);
  expect(await page.locator('.faq-group details').count(), 'jede Frage steht in einem Thema')
    .toBe(await page.locator('.faq details').count());
  expect(await page.locator('.faq details[open]').count(), 'anfangs ist alles zu').toBe(0);

  await topics.filter({ hasText: 'Crashes & errors' }).click();
  await expect(page).toHaveURL(/#topic-crashes$/);

  const search = page.locator('[data-faq-search]');
  await search.fill('code 3');
  await expect(page.locator('details#code-3')).toBeVisible();
  await expect(page.locator('details#code-3')).toHaveAttribute('open', '');
  await expect(page.locator('details#online')).toBeHidden();

  await search.fill('xyzzy nothing');
  await expect(page.locator('[data-faq-empty]')).toBeVisible();
  await expect(page.locator('[data-faq-forum]')).toHaveAttribute('href', /\?q=xyzzy%20nothing$/);
});

test('Suchname „bbport“ in Titeln und Seitendaten für Google', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/^bbport – /);
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  expect(ld.find((x) => x['@type'] === 'WebSite').name).toBe('bbport');
  expect(ld.find((x) => x['@type'] === 'SoftwareApplication')?.alternateName).toContain('bbport');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /bbport/);
  for (const path of ['/install/', '/guide/', '/faq/', '/changelog/']) {
    await page.goto(path);
    await expect(page, path).toHaveTitle(/\| bbport$/);
    await expect(page.locator('meta[name="description"]'), path).toHaveAttribute('content', /bbport/);
  }
});

test('Startseite zeigt den echten Launcher (Play-Seite)', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#launcher');
  await expect(section.locator('h2')).toHaveText('The official launcher');
  const img = section.locator('.launcher-shot img');
  await img.scrollIntoViewIfNeeded();
  await expect(img).toHaveAttribute('alt', /Play page/);
  await expect.poll(() => img.evaluate((i) => (i.complete ? i.naturalWidth : 0))).toBeGreaterThan(0);
  const full = await section.locator('a.launcher-shot').getAttribute('href');
  expect((await page.request.get(full)).ok(), 'Bild in voller Größe').toBe(true);
});

// Ein Menü für Website und Forum (das Forum baut es in flarum/forum.js und theme/custom.less nach):
// dieselben Links direkt neben dem Logo, Discord als Knopf ganz rechts
test('Menü: Links neben dem Logo, Discord ganz rechts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'auf dem Handy steckt das Menü hinter dem Menü-Knopf');
  await page.goto('/');
  expect(await page.$$eval('.nav a', (all) => all.map((a) => a.textContent.trim())))
    .toEqual(['Install', 'Guide', 'Best settings', 'FAQ', 'Changelog', 'Server', 'Supermedo', 'Forum', 'Discord']);
  const logo = await page.locator('.brand').boundingBox();
  const first = await page.locator('.nav a').first().boundingBox();
  const discord = await page.locator('.nav .nav-discord').boundingBox();
  const column = await page.locator('.site-header .container').boundingBox();
  expect(first.x - (logo.x + logo.width), 'erster Link direkt neben dem Logo').toBeLessThan(60);
  // rechts in der Inhaltsspalte (die ist auf breiten Bildschirmen mittig), nicht am Fensterrand
  expect(column.x + column.width - (discord.x + discord.width), 'Discord ganz rechts').toBeLessThan(40);
});

// Eine Regel für alle Knöpfe (global.css „Knöpfe: eine Regel für alle“): gleiche Rundung, Messing-Haarlinie,
// Blut steigt beim Zeigen auf; nur die Füllung unterscheidet Hauptaktion, Rest und Discord
test('Alle Knöpfe folgen einer Regel', async ({ page }) => {
  for (const path of ['/', '/changelog/', '/install/', '/supermedo/', '/server/']) {
    await page.goto(path);
    const buttons = await page.$$eval('.btn, .hw-detect, .lightbox button', (all) => all.map((b) => {
      const c = getComputedStyle(b);
      const rise = getComputedStyle(b, '::before');
      return { radius: c.borderTopLeftRadius, width: c.borderTopWidth, line: c.borderTopColor, rise: rise.content !== 'none' && rise.content !== 'normal' };
    }));
    expect(buttons.length, path).toBeGreaterThan(0);
    for (const b of buttons) expect(b, path).toEqual({ radius: '10px', width: '1px', line: 'rgba(194, 168, 120, 0.4)', rise: true });
  }
  await page.goto('/');
  const fill = (sel) => page.locator(sel).first().evaluate((b) => getComputedStyle(b).backgroundColor);
  expect(await fill('.hero .btn-primary')).toBe('rgb(138, 17, 24)');
  expect(await fill('.hero .btn-discord')).toBe('rgb(88, 101, 242)');
});

// Für Einsteiger: der Erststart Bild für Bild, die drei Ziele und Werte je Grafikkarte; von überall verlinkt
test('Best settings: Erststart mit Bildern, Ziele, Werte je Karte, verlinkt', async ({ page }) => {
  await page.goto('/best-settings/');
  await expect(page.locator('h1')).toHaveText('Best settings');
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Best settings');
  await expect(page.locator('.settings-steps > li')).toHaveCount(4);
  await expect(page.locator('.settings table').first().locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('.settings-table tbody tr')).toHaveCount(5);
  for (const img of await page.locator('.settings img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((i) => (i.complete ? i.naturalWidth : 0))).toBeGreaterThan(0);
  }
  for (const path of ['/', '/install/', '/guide/', '/faq/']) {
    await page.goto(path);
    await expect(page.locator('main a[href$="best-settings/"]').first(), path).toBeAttached();
  }
  await expect(page.locator('footer a[href="/best-settings/"]')).toHaveCount(1);
});

// Nick will nirgends farbige Streifen am linken Rand von Kästen oder Hinweisen sehen
test('Keine Streifen am linken Rand', async ({ page }) => {
  for (const path of ['/', '/install/', '/guide/', '/faq/', '/changelog/', '/supermedo/', '/best-settings/']) {
    await page.goto(path);
    const stripes = await page.$$eval('body *', (all) => all.filter((el) => {
      const cs = getComputedStyle(el);
      const left = parseFloat(cs.borderLeftWidth);
      return cs.borderLeftStyle !== 'none' && left >= 2 && left > parseFloat(cs.borderTopWidth);
    }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`));
    expect(stripes, path).toEqual([]);
  }
});

test('Startseite sagt, dass die Seite noch im Aufbau ist', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('.wip-bar');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Work in progress');
  await expect(note).toContainText('Bug hunters may keep every bug they find');
});

test('Startseite nennt den Port von Supermedo mit Link zu GitHub', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.hero-port');
  await expect(line).toContainText(SITE.portName);
  await expect(line).toContainText(SITE.portAuthor);
  await expect(line.locator(`a[href="${SITE.portRepoUrl}"]`)).toBeVisible();
  await expect(page.locator(`footer a[href="${SITE.portRepoUrl}"]`)).toHaveCount(1);
});

test('Supermedo-Seite zeigt seine Projekte und verlinkt NativeRetro', async ({ page }) => {
  await page.goto('/supermedo/');
  await expect(page.locator('h1')).toHaveText(`${SITE.portAuthor}'s ports`);
  await expect(page.locator('.nr-hero a.btn-primary')).toHaveAttribute('href', 'https://nativeretro.com/');
  // bbport ist als „hier“ markiert, die anderen Ports führen zu NativeRetro und GitHub
  await expect(page.locator('.nr-card.is-here h3')).toHaveText('Bloodborne for Windows');
  await expect(page.locator('.nr-card a[href^="https://nativeretro.com/game/"]').first()).toBeVisible();
  await expect(page.locator('.nr-dir a[href^="https://nativeretro.com/game/"]')).not.toHaveCount(0);
  // Die Terminalschrift liegt auf dieser Seite, nichts wird von NativeRetro geladen
  const external = [];
  page.on('request', (req) => { if (/^https?:/.test(req.url()) && !req.url().startsWith('http://127.0.0.1')) external.push(req.url()); });
  await page.reload({ waitUntil: 'networkidle' });
  expect(external).toEqual([]);
  expect(await page.evaluate(async () => (await document.fonts.load('20px VT323')).length)).toBeGreaterThan(0);

  // Menü, Startseite und Fußzeile führen hierher
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Supermedo');
  await page.goto('/');
  await expect(page.locator('.nr-teaser a[href="/supermedo/"]')).toBeVisible();
  await expect(page.locator('footer a[href="/supermedo/"]')).toHaveCount(1);
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

test('Launcher guide: im Menü und mit den Abschnitten', async ({ page }) => {
  await page.goto('/');
  // Auf dem Handy steckt das Menü im Seitenmenü, der Link ist trotzdem da
  await expect(page.locator('header a[href$="/guide/"]').first()).toHaveCount(1);
  await page.goto('/guide/');
  await expect(page.locator('h1')).toHaveText(/Launcher guide/i);
  for (const id of ['whats-included', 'online-play', 'saves', 'mods']) {
    await expect(page.locator(`h2#${id}`), id).toHaveCount(1);
  }
});

// Logo-Contest: große Ankündigung auf der Startseite, führt auf die Contest-Seite im Forum; die Vorlage liegt auf der Website
test('Startseite kündigt den Logo-Contest an und führt ins Forum', async ({ page }) => {
  await page.goto('/');
  const banner = page.locator('.contest-banner');
  await expect(banner.locator('h2')).toHaveText('Design the new launcher logo');
  await expect(banner.locator('a.btn-primary')).toHaveAttribute('href', `${SITE.forumUrl}/logo-contest`);
  const template = await banner.locator('a[download]').getAttribute('href');
  const res = await page.request.get(template);
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('viewBox="0 0 1024 1024"');
});

// Betas gibt es nur im Forum (Bereich Beta, für freigeschaltete Tester), nicht auf der Website
test('Keine Beta auf der Website', async ({ page }) => {
  for (const path of ['/', '/install/', '/guide/', '/faq/', '/best-settings/']) {
    await page.goto(path);
    expect(await page.locator('a[href*="nick24051998/bloodborne_pc"]').count(), path).toBe(0);
    expect(await page.locator('main').innerText(), path).not.toMatch(/beta \d/i);
  }
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

test('Release-Daten: neueste Version mit Download der Port-ZIP', () => {
  // Fiel der Abruf beim Bauen aus, stammen sie aus dem Repo: auch dann kein veraltetes Release ohne Download
  expect(releases.length).toBeGreaterThan(0);
  expect(latest?.download, 'Download der neuesten Version').toMatch(/\/Bloodborne[^/]*\.zip$/);
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
