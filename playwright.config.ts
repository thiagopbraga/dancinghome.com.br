import { defineConfig } from '@playwright/test';

const chromiumArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 720 },
    permissions: ['camera'],
    launchOptions: { args: chromiumArgs },
  },
  projects: [
    { name: 'dev', testIgnore: /offline\.spec\.ts/, use: { baseURL: 'http://localhost:5173' } },
    { name: 'build', testMatch: /offline\.spec\.ts/, use: { baseURL: 'http://localhost:4173' } },
  ],
  webServer: [
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173/jogar/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx vite build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173/jogar/',
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
