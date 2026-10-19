// Prüfungen der fertigen Website im echten Browser (Chromium, Desktop und Handy).
// Laufen bei GitHub vor jedem Deploy (.github/workflows/website.yml); schlägt eine fehl, geht nichts live.
//
// Lokal (Node.js ab 22.22):
//   npm run build
//   npm install --no-save @playwright/test@1.56.1 && npx playwright install chromium
//   npm test
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // Bei GitHub erscheinen Fehler als Anmerkungen am Workflow-Lauf
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Die gebaute Seite aus dist/ (vorher npm run build)
  webServer: {
    command: `npx astro preview --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
