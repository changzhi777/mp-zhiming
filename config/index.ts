// mp-zhiming/config/index.ts · Taro 编译配置（M17 · 主站精简版）
// 小程序端：rpx 单位（750rpx = 屏幕宽）；样式由 tailwindcss 4 + weapp-tailwindcss 注入 wxss
import { defineConfig } from "@tarojs/cli"
import { UnifiedWebpackPluginV5 } from "weapp-tailwindcss/webpack"

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: "mp-zhiming",
    date: "2026-8-22",
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
    sourceRoot: "src",
    outputRoot: "dist",
    plugins: ["@tarojs/plugin-framework-react"],
    framework: "react",
    compiler: "webpack5",
    cache: { enable: true },
    mini: {
      // biome-ignore lint/suspicious/noExplicitAny: Taro webpack chain 类型未导出
      webpackChain(chain: any) {
        // weapp-tailwindcss：Tailwind 4 → wxss 单位转换（px → rpx）+ class 名压缩
        chain
          .plugin("weapp-tailwindcss")
          .use(UnifiedWebpackPluginV5, [{ appType: "taro", mainCssEntry: "src/index.css" }])
      },
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false },
      },
      imageUrlLoaderOption: { limit: 8192 },
    },
  }
  return merge({}, baseConfig, {})
})
