// Rendert media/og-image.html nach website/public/og-image.jpg (braucht Playwright + Chromium):
//   node media/render-og.cjs
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const html = pathToFileURL(path.join(__dirname, 'og-image.html')).href;
  const out = path.join(__dirname, '..', 'website', 'public', 'og-image.jpg');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('wrote', out);
})();
