#!/usr/bin/env node
// mp-zhiming/scripts/ci.mjs · miniprogram-ci 一键 CLI（M17 阶段 6）
// 用法：
//   node scripts/ci.mjs preview   # 生成体验版二维码（终端显示）
//   node scripts/ci.mjs upload    # 上传体验版
//
// 前置：把私钥放到 scripts/private.key（从微信开发者工具 → 设置 → 安全 → 下载）

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ci from "miniprogram-ci"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const APPID = process.env.WX_APPID ?? "wx1000449af2e48fed"
const PRIVATE_KEY = path.join(__dirname, "private.key")
const PROJECT_PATH = ROOT
const VERSION = process.env.MP_VERSION ?? "0.1.0"
const DESC =
  process.env.MP_DESC ?? "M17 阶段6 编译链路打通 · build 链路 esbuild-loader + babel-loader 兼容"

async function build() {
  console.log("==> 1/3 build:weapp")
  execSync("pnpm build:weapp", { cwd: ROOT, stdio: "inherit" })
}

async function run(action) {
  if (!existsSync(PRIVATE_KEY)) {
    console.error(`✗ 私钥文件不存在：${PRIVATE_KEY}`)
    console.error("请从微信开发者工具 → 设置 → 安全 → 下载密钥 → 放 scripts/private.key")
    process.exit(1)
  }
  await build()
  console.log(`==> 2/3 init ci project (appid=${APPID})`)
  const project = new ci.Project({
    appid: APPID,
    type: "miniProgram",
    projectPath: PROJECT_PATH,
    privateKeyPath: PRIVATE_KEY,
    ignores: ["node_modules/**", "scripts/**", "vendor/**", "*.log", "coverage/**"],
  })
  console.log(`==> 3/3 ${action === "upload" ? "upload 体验版" : "preview 二维码"}`)
  if (action === "upload") {
    const result = await ci.upload({
      project,
      version: VERSION,
      desc: DESC,
      setting: { es6: true, minifyWXSS: true, minifyWXML: true, codeProtect: false },
      onProgressUpdate: console.log,
    })
    console.log(`✓ 上传成功 subVersion=${result.subVersion}`)
  } else {
    const result = await ci.preview({
      project,
      version: VERSION,
      desc: DESC,
      setting: { es6: true, minifyWXSS: true, minifyWXML: true },
      qrcodeFormat: "image",
      onProgressUpdate: console.log,
    })
    console.log(`✓ 预览二维码已生成：${result.qrcodeImgPath}`)
  }
}

const action = process.argv[2] ?? "preview"
run(action).catch((e) => {
  console.error(`✗ ${action} 失败：`, e.message ?? e)
  process.exit(1)
})
