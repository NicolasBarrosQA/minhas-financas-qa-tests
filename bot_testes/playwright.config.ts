import { defineConfig } from '@playwright/test';
import { loadConfig } from './src/config.js';

const cfg = loadConfig();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/report-html', open: 'never' }],
    ['junit', { outputFile: 'artifacts/report-junit.xml' }],
    ['json', { outputFile: 'artifacts/report.json' }],
  ],
  use: {
    baseURL: cfg.siteUrl,
    headless: cfg.headless,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
});
