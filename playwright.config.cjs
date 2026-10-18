const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:8765', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox'] } : {} } },
    { name: 'ipad-touch', use: { ...devices['iPad (gen 7) landscape'], browserName: 'webkit' } },
    { name: 'ipad-portrait', use: { ...devices['iPad (gen 7)'], browserName: 'webkit' } },
  ],
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1', url: 'http://127.0.0.1:8765', reuseExistingServer: !process.env.CI, timeout: 15000 },
});
