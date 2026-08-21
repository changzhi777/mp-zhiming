// mp-zhiming/config/index.ts · Taro 编译配置（M17 · 主站精简版）
// 小程序端：rpx 单位（750rpx = 屏幕宽）；样式由 tailwindcss 4 注入 wxss
// esbuild-loader 替代 babel-loader 处理 .ts/.tsx（babel-loader 8.x 默认不应用 preset-typescript）
import { defineConfig } from "@tarojs/cli"
import { EsbuildPlugin } from "esbuild-loader"

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: "mp-zhiming",
    date: "2026-8-22",
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
    sourceRoot: "src",
    outputRoot: "dist",
    plugins: ["@tarojs/plugin-framework-react", "@tarojs/plugin-platform-weapp"],
    framework: "react",
    compiler: "webpack5",
    cache: { enable: true },
    mini: {
      // biome-ignore lint/suspicious/noExplicitAny: Taro webpack chain 类型未导出
      webpackChain(chain: any) {
        // 1) 删 webpack 5 默认 ProgressPlugin
        try {
          chain.plugins.delete("ProgressPlugin")
        } catch {
          // 容错
        }
        // 2) 在 .ts/.tsx 前加 esbuild-loader（先转 .js，再走 babel-loader）
        // biome-ignore lint/suspicious/noExplicitAny: webpack-chain API
        chain.module
          .rule("esbuild-ts")
          .test(/\.tsx?$/)
          .use("esbuild-loader")
          .loader(
            // biome-ignore lint/suspicious/noExplicitAny: 动态 require
            require.resolve("esbuild-loader"),
          )
          .options({
            loader: "tsx",
            target: "es2020",
            jsx: "automatic",
          })
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
void EsbuildPlugin // 保留供未来直接配置使用
