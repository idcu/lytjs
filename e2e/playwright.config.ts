import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  // 匹配所有 .spec.ts 文件，排除 setup.ts 和 helpers
  testMatch: '*.spec.ts',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    // 每个测试失败时自动截图
    screenshot: 'only-on-failure',
    // 每个测试失败时自动录制 trace
    trace: 'retain-on-failure',
  },
  // 自动启动静态文件服务器，serve e2e/fixtures 目录
  webServer: {
    command: 'npx vite e2e/fixtures --port 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  // 浏览器配置
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
