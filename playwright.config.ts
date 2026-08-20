import { defineConfig, devices } from '@playwright/test';

const serverUrl = 'http://127.0.0.1:8180';
const clientUrl = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: clientUrl,
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @snake/server start',
      url: `${serverUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        PORT: '8180',
        DB_PATH: './data/browser-smoke.db',
        ALLOWED_ORIGINS: clientUrl,
        APP_URL: clientUrl,
      },
    },
    {
      command: 'pnpm --filter @snake/client dev --host 127.0.0.1 --port 5174',
      url: clientUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_BACKEND_URL: serverUrl,
      },
    },
  ],
});
