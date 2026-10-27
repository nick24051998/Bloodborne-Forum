// Checks of the finished website in a real browser (Chromium, desktop and phone).
// They run on GitHub before every deploy (.github/workflows/website.yml); if one fails, nothing goes live.
//
// Locally (Node.js 22.22 or newer):
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
  // On GitHub, failures show up as annotations on the workflow run
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // The built site from dist/ (run npm run build first)
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
