// Playlive's Playwright suite: it serves the folder and drives the real app.
// The questions that do not need a browser live in tests/unit/ and run on
// `node --test` in a couple of seconds — see AGENTS.md on which goes where.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYLIVE_PORT) || 4173;

export default defineConfig({
  testDir: './tests/e2e',
  // The app is client-side, so sites can be exercised in parallel. One worker
  // per core rather than Playwright's default of half: a run is mostly the
  // browser waiting on the app it is driving, and the hundred example sites
  // halve in wall-clock for it. CI gets fewer, since a hosted runner has less
  // to give and oversubscribing it only makes a run flaky.
  fullyParallel: true,
  workers: process.env.CI ? 2 : '100%',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The runner needs a real window: it drives a same-origin iframe.
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node tests/server.mjs ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore'
  }
});
