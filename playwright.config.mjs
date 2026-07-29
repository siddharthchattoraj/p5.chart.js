import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02
    }
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    deviceScaleFactor: 1,
    headless: true,
    viewport: {
      height: 700,
      width: 1000
    }
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    port: 4173,
    reuseExistingServer: false,
    timeout: 10000
  }
});
