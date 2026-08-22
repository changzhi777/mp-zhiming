#!/usr/bin/env node
// scripts/ci-check.mjs · mp-zhiming 提审 5 类限制自动化检查（M17 阶段 6）
// 用法：node scripts/ci-check.mjs [--strict]
// 检查：源码扫描 + dist/ 校验 + 必备字段

import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const STRICT = process.argv.includes("--strict")
const errors = []
const warnings = []

const ok = (msg) => console.log(`✓ ${msg}`)
const warn = (msg) => {
  console.log(`⚠ ${msg}`)
  warnings.push(msg)
}
const fail = (msg) => {
  console.log(`✗ ${msg}`)
  errors.push(msg)
}

console.log("# mp-zhiming 提审前自检\n")

// ── 1. 5 类限制扫描（个人号必查） ────────────────────────────────
console.log("## 1. 5 类限制扫描（个人号硬约束）")
const FORBIDDEN = [
  { pattern: /充值|购买|下单/i, label: "充值/购买/下单" },
  { pattern: /微信支付|wx\.pay/i, label: "微信支付调用" },
  { pattern: /分享到朋友圈|shareTimeline/i, label: "诱导分享朋友圈" },
  { pattern: /多级分销|多级返利/i, label: "多级分销/返利" },
  { pattern: /虚拟商品|虚拟服务/i, label: "虚拟商品/服务" },
]

let srcFiles = []
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      if (!["node_modules", "dist", "vendor", ".git", ".taro"].includes(e)) walk(p)
    } else if (/\.(tsx?|jsx?)$/.test(e)) srcFiles.push(p)
  }
}
walk(join(ROOT, "src"))

for (const f of srcFiles) {
  const c = readFileSync(f, "utf-8")
  for (const { pattern, label } of FORBIDDEN) {
    if (pattern.test(c)) fail(`${f.replace(ROOT + "/", "")}: 含禁用词「${label}」`)
  }
}
if (errors.length === 0) ok("5 类限制扫描：未发现禁用词")

// ── 2. 必备字段检查 ────────────────────────────────────────────
console.log("\n## 2. 必备字段检查")
const projectConfig = JSON.parse(readFileSync(join(ROOT, "project.config.json"), "utf-8"))
const REQUIRED = {
  appid: projectConfig.appid,
  projectname: projectConfig.projectname,
  compileType: projectConfig.compileType,
}
for (const [k, v] of Object.entries(REQUIRED)) {
  if (!v) fail(`project.config.json 缺 ${k}`)
  else ok(`project.config.json.${k} = ${v}`)
}
if (projectConfig.appid !== "wx1000449af2e48fed") {
  fail(`AppID 不匹配：期望 wx1000449af2e48fed，实际 ${projectConfig.appid}`)
} else {
  ok("AppID 与预期匹配")
}

// ── 3. 关键 URL 验证 ────────────────────────────────────────────
console.log("\n## 3. 关键 URL 验证")
const PRIVACY_URL = "https://91zm.com.cn/privacy"
const TERMS_URL = "https://91zm.com.cn/terms"
console.log(`ℹ 域名白名单须配置:`)
console.log(`  - request 合法域名: https://91zm.com.cn`)
console.log(`  - 隐私协议 URL: ${PRIVACY_URL}`)
console.log(`  - 用户协议 URL: ${TERMS_URL}`)

// ── 4. dist 产物检查 ────────────────────────────────────────────
console.log("\n## 4. dist 产物检查")
if (!existsSync(join(ROOT, "dist"))) {
  warn("dist/ 不存在 · 跑 pnpm build:weapp 生成")
} else {
  const distFiles = readdirSync(join(ROOT, "dist"))
  const REQUIRED_DIST_GROUPS = [
    ["app.js", "app.js.LICENSE.txt"],
    ["app.json", "app.wxss", "app.css"], // Taro 4 可能输出 .css 而非 .wxss
    ["runtime.js"],
  ]
  for (const group of REQUIRED_DIST_GROUPS) {
    const found = group.find((f) => distFiles.includes(f))
    if (found) ok(`dist/${found}（group: ${group.join("/")}）`)
    else fail(`dist/${group.join("/")} 全部缺失`)
  }
  const pages = readdirSync(join(ROOT, "dist/pages"))
  ok(`dist/pages/ 共 ${pages.length} 个页面`)
  if (pages.length < 7) {
    warn(`dist/pages/ 仅 ${pages.length} 个，建议 ≥7（P0+P1）`)
  }
}

// ── 5. 测试套件验证 ────────────────────────────────────────────
console.log("\n## 5. 测试套件")
try {
  execSync("pnpm test --run 2>&1", { cwd: ROOT, stdio: "pipe" })
  ok("vitest 全部通过")
} catch (e) {
  fail(`vitest 失败：${String(e).slice(0, 200)}`)
}

// ── 6. 覆盖率校验 ──────────────────────────────────────────────
console.log("\n## 6. 覆盖率（建议 ≥ 90%）")
try {
  execSync("pnpm test:coverage 2>&1", { cwd: ROOT, stdio: "pipe" })
  ok("覆盖率阈值达标（无报错）")
} catch (e) {
  warn(`覆盖率不达标 · 查看详细: pnpm test:coverage`)
}

// ── 总结 ────────────────────────────────────────────────
console.log(`\n## 总结`)
console.log(`  错误：${errors.length}`)
console.log(`  警告：${warnings.length}`)

if (errors.length === 0) {
  console.log(`\n✓ 5 类限制通过 + 必备字段就位`)
  console.log(`下一步：git push + 微信开发者工具上传`)
  process.exit(0)
} else {
  console.log(`\n✗ ${errors.length} 项阻塞 · 修复后重跑`)
  if (STRICT) process.exit(1)
  process.exit(0)
}