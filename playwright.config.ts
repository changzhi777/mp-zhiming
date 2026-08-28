// mp-zhiming/playwright.config.ts · 微信小程序 H5 模式 E2E 配置
// 适用:Taro 3.6 H5 dev server(默认 10086 端口)
// 用法:pnpm exec playwright test
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:10086",
    headless: true,
    screenshot: "on",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  reporter: [["list"], ["html", { outputFolder: "e2e-report", open: "never" }]],
  webServer: {
    // H5 模式 + 后端共享 server(主仓 3010 端口)
    command: "pnpm dev:h5",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
