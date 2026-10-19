// Rendert media/logo.html als transparentes PNG nach theme/logo.png und website/public/logo.png
// und media/og.html als Vorschaubild nach website/public/og-image.jpg
// (braucht Playwright + Chromium):  node media/render-logo.cjs
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function open(browser, file, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(path.join(__dirname, file)).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

(async () => {
  const browser = await chromium.launch();

  const logo = await open(browser, 'logo.html', { width: 1200, height: 200 });
  const out = path.join(__dirname, '..', 'theme', 'logo.png');
  await (await logo.$('.logo')).screenshot({ path: out, omitBackground: true });
  fs.copyFileSync(out, path.join(__dirname, '..', 'website', 'public', 'logo.png'));

  const og = await open(browser, 'og.html', { width: 1200, height: 630 });
  await (await og.$('.og')).screenshot({
    path: path.join(__dirname, '..', 'website', 'public', 'og-image.jpg'), type: 'jpeg', quality: 88,
  });

  await browser.close();
  console.log('wrote theme/logo.png, website/public/logo.png and website/public/og-image.jpg');
})();
