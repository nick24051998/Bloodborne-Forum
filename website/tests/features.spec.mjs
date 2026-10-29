// Interactive parts: hardware check, gallery lightbox, animations under "reduce motion", links to the forum,
// download and release texts.
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { SITE } from '../site.config.mjs';
import { TIERS, gpus, cpuLines, evaluate } from '../src/data/hardware.js';
import { cleanNotes } from '../scripts/release-notes.mjs';
import { totalDownloads, downloadsLabel } from '../src/lib/downloads.js';

// The same data the site was built from (fetched fresh from GitHub in the workflow)
const { releases } = JSON.parse(readFileSync(new URL('../src/data/releases.json', import.meta.url), 'utf8'));
const latest = releases.find((r) => !r.prerelease);
const zipUrl = latest?.download ?? SITE.downloadUrl;

test.describe('Hardware check (Install Guide)', () => {
  const pick = async (page, { gpu, cpu, gen, ram }) => {
    await page.selectOption('#hw-gpu', { label: gpu });
    await page.selectOption('#hw-cpu', { label: cpu });
    await expect(page.locator('#hw-gen')).toBeEnabled();
    await page.selectOption('#hw-gen', { label: gen });
    await page.selectOption('#hw-ram', ram);
  };

  test('A recommended PC gives a verdict with a table and a share link', async ({ page }) => {
    await page.goto('/install/');
    // The # after it is the link to this spot (anchors in Base.astro)
    await expect(page.locator('#hwcheck-heading')).toHaveText(/^Will it run on my PC\?/);
    await pick(page, { gpu: 'RTX 3060 Ti', cpu: 'Core i7', gen: '12th gen (i7-12xxx)', ram: '32' });

    const tier = page.locator('.hw-result .hw-tier');
    await expect(tier).toBeVisible();
    expect(TIERS).toContain(await tier.textContent());
    await expect(tier).toHaveText(/Recommended|4K-ready|Above minimum/);
    await expect(page.locator('.hw-result table.hw-table')).toBeVisible();
    await expect(page.locator('.hw-result .hw-copy')).toBeVisible();

    // The selection is in the address; a shared link restores the same result
    const shared = page.url();
    expect(new URL(shared).searchParams.get('gpu')).toBeTruthy();
    const label = await tier.textContent();
    await page.goto(shared);
    await expect(page.locator('.hw-result .hw-tier')).toHaveText(label);
    await expect(page.locator('#hw-ram')).toHaveValue('32');
  });

  test('A processor without the required instruction sets is recognized as unsupported', async ({ page }) => {
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

test.describe('Gallery on the home page', () => {
  test('Tiles and lightbox', async ({ page }) => {
    await page.goto('/');
    const tiles = page.locator('.showcase-grid .tile');
    expect(await tiles.count()).toBeGreaterThanOrEqual(1);
    // No empty placeholders, but a last tile that asks for pictures (UX review 29.10.2026)
    await expect(page.locator('.showcase')).not.toContainText('Image coming soon');
    await expect(page.locator('.tile--invite a')).toHaveAttribute('href', SITE.forumUrl);

    const withImage = page.locator('.tile-open');
    test.skip((await withImage.count()) === 0, 'Noch keine Bilder in der Galerie');

    // Every tile with an image has a loaded preview image
    for (const img of await page.locator('.tile-open img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    }

    // Lightbox: opens, shows the image at full size with its title, closes with Esc
    await withImage.first().scrollIntoViewIfNeeded();
    await withImage.first().click();
    const dialog = page.locator('dialog.lightbox');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#lightbox-title')).not.toBeEmpty();
    const big = dialog.locator('.lightbox-img');
    await expect.poll(() => big.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThanOrEqual(1200);

    // Zoom: click zooms in, 0 resets, + and the mouse wheel zoom, dragging pans
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
      // Dragging moves the visible area
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

test('"Reduce motion" turns off the animations', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const anim = await page.locator('.hero .emblem-art').evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
  await context.close();
});

test('Anchors: FAQ questions open via link, headings have # links', async ({ page }) => {
  await page.goto('/faq/#code-3');
  const question = page.locator('details#code-3');
  await expect(question).toHaveAttribute('open', '');
  await expect(question.locator('summary a.anchor-link')).toHaveAttribute('href', '#code-3');
  const ids = await page.$$eval('.faq details', (all) => all.map((d) => d.id));
  expect(ids.every(Boolean), 'jede Frage hat eine id').toBe(true);
  expect(new Set(ids).size, 'ids sind eindeutig').toBe(ids.length);

  await page.goto('/guide/');
  const link = page.locator('h2#saves a.anchor-link');
  await expect(link).toHaveAttribute('href', '#saves');
  await link.click();
  await expect(page).toHaveURL(/\/guide\/#saves$/);
});

// A clear FAQ: questions by topic, topic bar and search at the top; without hits, the way to Known Fixes in the forum
test('FAQ: topics, topic bar and search', async ({ page }) => {
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

test('Search name "bbport" in titles and page data for Google', async ({ page }) => {
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

test('Home page shows the real launcher (Play page)', async ({ page }) => {
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

// One menu for website and forum (the forum recreates it in flarum/forum.js and theme/custom.less):
// the same links right next to the logo, Discord as a button at the far right
test('Menu: links next to the logo, Discord at the far right', async ({ page, isMobile }) => {
  test.skip(isMobile, 'auf dem Handy steckt das Menü hinter dem Menü-Knopf');
  await page.goto('/');
  expect(await page.$$eval('.nav a', (all) => all.map((a) => a.textContent.trim())))
    .toEqual(['Install', 'Launcher', 'Best settings', 'Online', 'FAQ', 'Changelog', 'Forum', '☕Support our server', 'Discord']);
  // Support our server (Medo): yellow, right before Discord
  await expect(page.locator('.nav .nav-support')).toHaveAttribute('href', SITE.supportUrl);
  const logo = await page.locator('.brand').boundingBox();
  const first = await page.locator('.nav a').first().boundingBox();
  const discord = await page.locator('.nav .nav-discord').boundingBox();
  const column = await page.locator('.site-header .container').boundingBox();
  expect(first.x - (logo.x + logo.width), 'erster Link direkt neben dem Logo').toBeLessThan(60);
  // at the right of the content column (which is centered on wide screens), not at the window edge
  expect(column.x + column.width - (discord.x + discord.width), 'Discord ganz rechts').toBeLessThan(40);
});

// One rule for all buttons (global.css, the "one rule for all buttons" section): same rounding, brass hairline,
// blood rises on hover; only the fill sets the main action, the rest and Discord apart
test('All buttons follow one rule', async ({ page }) => {
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
  expect(await fill('.nav .nav-discord')).toBe('rgb(88, 101, 242)');
  expect(await fill('.nav .nav-support')).toBe('rgb(255, 221, 0)');
});

// For beginners: the first start screen by screen, the three goals and values per graphics card; linked from everywhere
test('Best settings: first start with pictures, goals, values per card, linked', async ({ page }) => {
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

// (Nick's wish) no colored stripes on the left edge of boxes or notices anywhere
test('No stripes on the left edge', async ({ page }) => {
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

test('Home page says the site is still under construction', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('.wip-bar');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Work in progress');
  await expect(note).toContainText('Bug hunters may keep every bug they find');
});

test('Home page names the port by Supermedo with a link to GitHub', async ({ page }) => {
  await page.goto('/');
  const line = page.locator('.hero-port');
  await expect(line).toContainText(SITE.portName);
  await expect(line).toContainText(SITE.portAuthor);
  await expect(line.locator(`a[href="${SITE.portRepoUrl}"]`)).toBeVisible();
  await expect(page.locator(`footer a[href="${SITE.portRepoUrl}"]`)).toHaveCount(1);
  // Supermedo's Buy Me a Coffee: only in the header (Nick, not with the buttons of the home page) and in the footer
  await expect(page.locator(`.hero .actions a[href="${SITE.supportUrl}"]`)).toHaveCount(0);
  await expect(page.locator(`footer a[href="${SITE.supportUrl}"]`)).toHaveCount(1);
});

test('Supermedo page shows his projects and links to NativeRetro', async ({ page }) => {
  await page.goto('/supermedo/');
  await expect(page.locator('h1')).toHaveText(`${SITE.portAuthor}'s ports`);
  await expect(page.locator('.nr-hero a.btn-primary')).toHaveAttribute('href', 'https://nativeretro.com/');
  // bbport is marked as "here", the other ports lead to NativeRetro and GitHub
  await expect(page.locator('.nr-card.is-here h3')).toHaveText('Bloodborne for Windows');
  await expect(page.locator('.nr-card a[href^="https://nativeretro.com/game/"]').first()).toBeVisible();
  await expect(page.locator('.nr-dir a[href^="https://nativeretro.com/game/"]')).not.toHaveCount(0);
  // The terminal font is hosted on this site, nothing is loaded from NativeRetro
  const external = [];
  page.on('request', (req) => { if (/^https?:/.test(req.url()) && !req.url().startsWith('http://127.0.0.1')) external.push(req.url()); });
  await page.reload({ waitUntil: 'networkidle' });
  expect(external).toEqual([]);
  expect(await page.evaluate(async () => (await document.fonts.load('20px VT323')).length)).toBeGreaterThan(0);

  // The home page and footer lead here (not the menu since 29.10.2026)
  await page.goto('/');
  await expect(page.locator('.nr-teaser a[href="/supermedo/"]')).toBeVisible();
  await expect(page.locator('footer a[href="/supermedo/"]')).toHaveCount(1);
});

test.describe('Download and releases', () => {
  test('Home page downloads the ZIP directly, without a detour via GitHub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .actions a', { hasText: /^Download/ })).toHaveAttribute('href', zipUrl);
    if (latest?.download) {
      expect(latest.download).toMatch(/^https:\/\/github\.com\/Supermedo\/bloodborne_pc\/releases\/download\/[^/]+\/[^/]+\.zip$/);
      await expect(page.locator('.hero-download')).toContainText(`${latest.downloadSize} MB`);
    }
  });

  test('Install Guide and FAQ link the ZIP directly', async ({ page }) => {
    // Updating by hand lives on the install guide since 29.10.2026, so the launcher page has no download link
    for (const path of ['/install/', '/faq/']) {
      await page.goto(path);
      await expect(page.locator('a[href="#latest-download"]'), path).toHaveCount(0);
      expect(await page.locator(`a[href="${zipUrl}"]`).count(), path).toBeGreaterThan(0);
    }
  });

  test('Changelog shows the download, checksum and release texts', async ({ page }) => {
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

// Download count from GitHub, all versions together, rounded down, with what it counts written below it (no tooltip,
// no "players": the data doesn't say how many people play); release.json carries the exact number for the check
test('Home page shows how often the port was downloaded and what the number counts', async ({ page, request }) => {
  const total = totalDownloads(releases);
  test.skip(!total, 'no download counts in src/data/releases.json');
  await page.goto('/');
  await expect(page.locator('.hero-stat .hero-downloads')).toHaveText(downloadsLabel(total));
  await expect(page.locator('.hero-stat-note')).toBeVisible();
  await expect(page.locator('.hero-stat')).not.toContainText(/players/i);
  await expect(page.locator('.hero-stat [title]')).toHaveCount(0);
  const live = await (await request.get('/release.json')).json();
  expect(live.downloads).toBe(total);
  expect(live).not.toHaveProperty('players');
});

// Right below the hero buttons: the zip needs your own game, with a link to which files (UX review 29.10.2026)
test('Home page says at the download that you need your own game files', async ({ page }) => {
  await page.goto('/');
  const req = page.locator('.hero-req');
  await expect(req).toBeVisible();
  await expect(req).toContainText('CUSA03173');
  await expect(req).toContainText('1.09');
  await expect(req.getByRole('link', { name: 'Which files?' })).toHaveAttribute('href', /faq\/#game-files$/);
});

// Two buttons for the first steps, forum and Discord as a line; on phones the buttons are in the first screen
// (UX review 29.10.2026: four buttons competed, and on a phone they started at the bottom edge)
test('Home page: two hero buttons in the first screen, forum and Discord as a line', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero .actions .btn')).toHaveText([/^Install guide$/, /^Download/]);
  const ask = page.locator('.hero-ask');
  await expect(ask.getByRole('link', { name: 'forum' })).toHaveAttribute('href', SITE.forumUrl);
  await expect(ask.getByRole('link', { name: 'Discord' })).toHaveAttribute('href', SITE.discordUrl);
  const box = await page.locator('.hero .actions').boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
});

// The menu checkbox only takes keyboard focus where the menu button shows (up to 1000 px)
test('On wide screens the keyboard skips the hidden menu checkbox', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('#menu')).toBeHidden();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('menu');
  }
});

test('Launcher page: in the menu and with its sections, install and online elsewhere', async ({ page }) => {
  await page.goto('/');
  // On phones the menu sits inside the side menu, the link is still there
  await expect(page.locator('header a[href$="/guide/"]').first()).toHaveCount(1);
  await page.goto('/guide/');
  await expect(page.locator('h1')).toHaveText(/Launcher/i);
  for (const id of ['whats-included', 'saves', 'steam', 'mods', 'help-and-reports']) {
    await expect(page.locator(`h2#${id}`), id).toHaveCount(1);
  }
  // Each topic in one place: the first start and updating on Install, online play on Online
  await expect(page.locator('h2#online-play, h2#updates, h2#first-start')).toHaveCount(0);
  await page.goto('/install/');
  for (const id of ['step-3-first-start', 'updating', 'updating-by-hand-193']) {
    await expect(page.locator(`#${id}`), id).toHaveCount(1);
  }
  await page.goto('/server/');
  await expect(page.locator('h2#play-h')).toHaveText('Play online');
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Online');
  // The guide is folded; a link to #play (FAQ, install guide, launcher page) opens it
  await expect(page.locator('.sm-guide[open]')).toHaveCount(0);
  await expect(page.locator('.sm-steps')).toBeHidden();
  await page.goto('/server/#play');
  await expect(page.locator('.sm-steps')).toBeVisible();
});

// Logo contest: big announcement on the home page, leads to the contest page in the forum; the template is on the website
test('Home page announces the logo contest and leads to the forum', async ({ page }) => {
  await page.goto('/');
  const banner = page.locator('.contest-banner');
  await expect(banner.locator('h2')).toHaveText('Design the new launcher logo');
  await expect(banner.locator('a.btn-primary')).toHaveAttribute('href', `${SITE.forumUrl}/logo-contest`);
  const template = await banner.locator('a[download]').getAttribute('href');
  const res = await page.request.get(template);
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('viewBox="0 0 1024 1024"');
});

// Betas exist only in the forum (Beta section, for unlocked testers), not on the website
test('No beta on the website', async ({ page }) => {
  for (const path of ['/', '/install/', '/guide/', '/faq/', '/best-settings/']) {
    await page.goto(path);
    expect(await page.locator('a[href*="nick24051998/bloodborne_pc"]').count(), path).toBe(0);
    expect(await page.locator('main').innerText(), path).not.toMatch(/beta \d/i);
  }
});

test('Hardware check rates Intel Arc graphics inside the processor like the launcher', () => {
  const ultra = cpuLines.find((l) => l.id === 'intel-core-ultra');
  const gen = ultra.gens.find((g) => g.id === 'u1-5');
  for (const name of ['Arc graphics (Core Ultra 100H)', 'Arc 140V / 130V (Core Ultra 200V)']) {
    const gpu = gpus.find((g) => g.name === name);
    const result = evaluate(gpu, ultra, gen, 32);
    expect(TIERS[result.tiers.gpu], name).toBe('Above minimum');
    expect(result.notes.join(' '), name).toContain('The launcher may still show an older, lower rating');
  }
  const h = gpus.find((g) => g.name === 'Arc graphics (Core Ultra 100H)');
  const v = gpus.find((g) => g.name === 'Arc 140V / 130V (Core Ultra 200V)');
  expect(v.score).toBeGreaterThan(h.score);
});

test('Release data: latest version with a download of the port ZIP', () => {
  // If the fetch failed during the build, the data comes from the repo: even then no outdated release without a download
  expect(releases.length).toBeGreaterThan(0);
  expect(latest?.download, 'Download der neuesten Version').toMatch(/\/Bloodborne[^/]*\.zip$/);
});

test('Release texts keep only simple markup', () => {
  const html = cleanNotes(
    '<h2 id="x" onclick="alert(1)">New</h2><p>a <script>alert(1)</script><img src=x onerror=alert(1)>' +
    '<a href="javascript:alert(1)">x</a> <a class="u" href="https://github.com/a?b=1&amp;c=2" data-x="1">@a</a></p>' +
    '<style>p{}</style><iframe src="https://e"></iframe>',
  );
  expect(html).toBe('<h3>New</h3><p>a <a>x</a> <a href="https://github.com/a?b=1&amp;c=2" rel="noopener">@a</a></p>');
  expect(cleanNotes('')).toBeNull();
});

test('Links to the forum and Discord point to the current addresses', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
  if (SITE.forumUrl) expect(hrefs.some((h) => h.startsWith(SITE.forumUrl)), `Link auf ${SITE.forumUrl}`).toBe(true);
  if (SITE.discordUrl) expect(hrefs).toContain(SITE.discordUrl);
});

// SuperMedo Server (/server/, /server/hunter/): the numbers come from the forum; here from a fixed sample, so the
// tests don't depend on who is online right now
const SERVER_SAMPLE = {
  server: {
    status: 'online', awake_since: 1793213799, registration: 'open', online: 2, counting_since: 1793104933,
    bells: { helpers: 0, hosts_searching: 1, invaders: 0 }, hunters: { registered: 27, played_online: 23, new_this_week: 27 },
    peak_online: { today: { online: 3, at: 1793145605 }, ever: { online: 3, at: 1793138885 } },
    last_24h: { bells_rung: 11, deaths: 44, hunter_minutes: 715, messages: 6, ratings: 4, summons: 1, summons_joined: 1 },
    totals: { bells_rung: 19, deaths: 118, hunter_minutes: 1066, messages: 18, ratings: 6, summons: 3, summons_joined: 3 },
    deaths_by_cause: { killed: 82, fall: 30, other: 6, poison: 0, brainsucker: 0 },
  },
  areas: [
    { name: "Hunter's Dream", online: 1, hunter_minutes: 229, deaths: 0, bells_rung: 0, messages: 1, footsteps: 283 },
    { name: "Yahar'gul, Unseen Village", online: 1, hunter_minutes: 38, deaths: 13, bells_rung: 0, messages: 1, footsteps: 124 },
  ],
  history: [{ date: '2026-10-28', hunters: 13, new_hunters: 7, peak_online: 3, peak_at: 1793145605, hunter_minutes: 495,
    deaths: 35, messages: 6, ratings: 4, bells_rung: 5, summons: 0, summons_joined: 0 }],
  killers: [{ name: 'Orphan of Kos', deaths: 3 }],
  deaths: [{ player: 'rowl666', cause: 'killed', killer: 'Father Gascoigne', place: 'Central Yharnam', area: 'Central Yharnam', time: 1793209156 }],
  summons: [{ host: 'rowl666', summoned: 'jaummn', kind: 'co-op', result: 'joined', time: 1793130620 }],
  messages: [{ text: 'remember Thrust attack', author: 'medo1986', place: 'Old Yharnam', area: 'Old Yharnam', good: 0, poor: 0, written: 1792954957 }],
  leaderboards: { minutes_played: [{ rank: 1, name: 'rowl666', value: 667 }] },
  week: {},
  hunters: [{ name: '<b>x</b>', level: 114, minutes_played: 667, deaths: 40, summoned_to_help: 0, summons_hosted: 1, invasions: 1,
    messages: 9, last_seen: 1793210233, online: false }],
  huntersTotal: 1,
  chalices: [{ glyph: 'bpahczp9', depth: 1, visits: 0, maker: null, made: 1793204375 }],
  updatedAt: 1793220298,
};
const CORS = { 'Access-Control-Allow-Origin': '*' };

test('Server page shows the statistics from the forum', async ({ page }) => {
  await page.route('**/api/bb-server', (route) => route.fulfill({ json: SERVER_SAMPLE, headers: CORS }));
  await page.goto('/server/');
  await expect(page.locator('[data-field="online"]')).toHaveText('2');
  await expect(page.locator('[data-field="advice"]')).toContainText('Small Resonant Bell');
  await expect(page.locator('[data-field="areaFacts"]')).toContainText("Yahar'gul");
  await expect(page.locator('[data-field="killers"]')).toContainText('Orphan of Kos');
  await expect(page.locator('[data-field="deaths"]')).toContainText('was killed by Father Gascoigne');
  await expect(page.locator('[data-field="messages"]')).toContainText('remember Thrust attack');
  await expect(page.locator('[data-field="chalices"]')).toContainText('bpahczp9');
  // Online IDs go in as text, never as HTML
  await expect(page.locator('[data-field="hunters"] a').first()).toHaveText('<b>x</b>');
  await expect(page.locator('[data-field="hunters"] b')).toHaveCount(0);
  await page.getByRole('button', { name: 'This week' }).click();
  await expect(page.locator('[data-field="board"]')).toContainText('No one yet this week');
});

test('Hunter page loads one hunter by Online ID', async ({ page }) => {
  await page.route('**/api/bb-server/hunters/medo1986', (route) => route.fulfill({ headers: CORS, json: {
    hunter: { name: 'medo1986', level: 36, minutes_played: 33, deaths: 0, messages: 4, online: false, last_seen: 1793211649,
      joined: 1792947684, first_seen: 1792954957, discord: null, summoned_to_help: 0, summons_hosted: 0, invasions: 0, bells_rung: 0,
      ratings_given: 0, ratings_received: { good: 0, poor: 3 }, deaths_by_cause: { killed: 1, other: 1 }, deadliest_area: null,
      nemesis: { name: 'Father Gascoigne', deaths: 1 } },
    messages: [{ text: 'fear Man', place: 'Cathedral Ward', area: 'Cathedral Ward', good: 0, poor: 3, written: 1792957746 }],
    ranks: [{ board: 'messages', rank: 2, value: 4 }],
    updatedAt: 1793220298,
  } }));
  await page.goto('/server/hunter/?id=medo1986');
  await expect(page.locator('h1')).toHaveText('medo1986');
  await expect(page.locator('[data-field="nemesis"]')).toHaveText('Father Gascoigne');
  await expect(page.locator('[data-field="ranks"]')).toHaveText('#2 in messages');
  await expect(page.locator('[data-field="messages"]')).toContainText('fear Man');
});
