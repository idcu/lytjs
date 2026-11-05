import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // A13：两处真实用例都跑起来 —— 根 e2e/tests（跨场景主路径）+ playground/e2e（10 个场景的行为细节）。
  // 此前 playground/e2e 的 39 条从未执行（它自己的配置指向 3001，且 webServer 被注释掉）。
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'playground',
      testDir: '../playground/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // A13：playground 的 vite.config.ts 把端口写死成 3000，而这里等的是 5173 ——
  // 于是 `webServer` 每次都等到超时（页面已经在 3000 起来了，只是没人看那个端口）。
  // 走 `exec vite` 而不是 `run dev -- ...`：pnpm run 会把 `--` 原样传给 vite，
  // vite 随后把 `--port` 当成位置参数忽略掉（实测仍起在 3000）。
  webServer: {
    command: 'pnpm --filter @lytjs/playground exec vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
