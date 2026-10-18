// Rendert media/logo.html als transparentes PNG nach theme/logo.png und website/public/logo.png
// (braucht Playwright + Chromium):  node media/render-logo.cjs
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 200 } });
  await page.goto(pathToFileURL(path.join(__dirname, 'logo.html')).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, '..', 'theme', 'logo.png');
  await (await page.$('.logo')).screenshot({ path: out, omitBackground: true });
  fs.copyFileSync(out, path.join(__dirname, '..', 'website', 'public', 'logo.png'));
  await browser.close();
  console.log('wrote theme/logo.png and website/public/logo.png');
})();
