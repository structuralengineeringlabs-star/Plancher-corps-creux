import { defineConfig } from '@playwright/test';

/**
 * Tests de bout en bout (phases B, C, D) et captures du manuel.
 * Navigateur : celui de Playwright (npx playwright install chromium), ou un Chromium local via CHROME_PATH.
 */
const executablePath = process.env.CHROME_PATH || undefined;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', launchOptions: { executablePath }, locale: 'fr-FR' },
  webServer: { command: 'npx vite build && npx vite preview --port 4174 --strictPort', url: 'http://localhost:4174', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'bureau', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'portable', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'tablette', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    // Autres moteurs (R-14) : PW_TOUS_NAVIGATEURS=1 npx playwright test, après npx playwright install firefox webkit
    ...(process.env.PW_TOUS_NAVIGATEURS ? [
      { name: 'firefox', use: { browserName: 'firefox' as const, viewport: { width: 1440, height: 900 }, launchOptions: {} } },
      { name: 'webkit', use: { browserName: 'webkit' as const, viewport: { width: 1440, height: 900 }, launchOptions: {} } },
    ] : []),
  ],
});
