// mp-zhiming/vitest.config.ts · 单测配置（M17）
// happy-dom 环境（小程序组件无法真实渲染，jsdom 已够覆盖逻辑层）
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@zhiming/shared": path.resolve(__dirname, "vendor/zhiming/packages/shared/src/index.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/app.config.ts", "src/app.tsx"],
      thresholds: {
        lines: 60,
        branches: 50,
        functions: 60,
        statements: 60,
      },
    },
  },
})