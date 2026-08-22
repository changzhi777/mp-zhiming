#!/usr/bin/env node
// mp-zhiming/scripts/auth-reset.mjs · 微信小程序端用户重置 CLI 包装（M17 阶段 1.2）
//
// 重要：mp-zhiming 是纯前端项目（10 .ts 文件 + 无后端）·
// users 数据**全部在 SM-APP 主仓后端**（`apps/server/data/zhiming.db`）。
// 本脚本只封装"调主仓后端 /auth/wx-login" + 显示凭据提示，**不直接改 mp 本地数据**。
//
// 用法：
//   1) 重新跑 SM-APP 主仓 reset_users.ts（已完成）
//      DATABASE_PATH=$PWD/data/zhiming.db pnpm exec tsx scripts/reset_users.ts
//   2) 在 mp-zhiming 端验证：node scripts/auth-reset.mjs test-login admin@91zm.com.cn
//   3) 真正 mp 端登录需通过 wx.login() → POST /auth/wx-login
//
// 本脚本主要作用：
//   - 文档化 mp 端 user 数据来源（主仓后端）
//   - 给开发者一个"快速验证主仓 reset 是否成功"的 curl 包装
//   - 触发 mp 端 silentLogin 流程（如果用户在 mp 仓运行）

import { execSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"

const DEFAULT_PASSWORD = "12345678"
const API_BASE = process.env.MP_API_BASE ?? "https://91zm.com.cn/api/v1"
const LOCAL_DB_HINT = "/Users/mac/Documents/Projects/SM-APP/apps/server/data/zhiming.db"

function log(msg) {
  console.log(`# ${msg}`)
}

function checkLocalDb() {
  if (!existsSync(LOCAL_DB_HINT)) {
    log(`本地 dev DB 不存在：${LOCAL_DB_HINT}`)
    log(`  → 在 SM-APP 主仓 apps/server 跑：DATABASE_PATH=$PWD/data/zhiming.db pnpm exec tsx scripts/reset_users.ts`)
    return false
  }
  const size = (statSync(LOCAL_DB_HINT).size / 1024 / 1024).toFixed(2)
  log(`本地 dev DB：${LOCAL_DB_HINT}（${size} MB）`)
  return true
}

async function loginTest(email) {
  const url = `${API_BASE}/auth/login`
  log(`POST ${url} {email: ${email}, password: ${DEFAULT_PASSWORD}}`)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: DEFAULT_PASSWORD }),
    })
    const data = await res.json()
    if (res.status === 200 && data.accessToken) {
      log(`✓ 登录成功：${email}`)
      log(`  accessToken 前 30 字符：${data.accessToken.slice(0, 30)}...`)
      log(`  user.role=${data.user?.role}  credits=${data.user?.credits}  email_verified=${data.user?.emailVerified}`)
      return true
    } else {
      log(`✗ 登录失败：${res.status} ${JSON.stringify(data).slice(0, 100)}`)
      return false
    }
  } catch (e) {
    log(`✗ 网络错误：${e.message}`)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0] ?? "help"

  log(`# mp-zhiming auth-reset CLI · 2026-08-22`)
  log(`# mp 端无 users 表 · 所有 user 在 SM-APP 主仓后端`)
  log("")

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    log("用法：")
    log("  node scripts/auth-reset.mjs test-login <email>  测试登录（验证主仓 reset）")
    log("  node scripts/auth-reset.mjs check-db            检查本地 dev DB")
    log("  node scripts/auth-reset.mjs full-check <email>  完整检查（DB + 登录）")
    log("  node scripts/auth-reset.mjs trigger-silent      触发 mp 端 silentLogin（开发模式）")
    log("")
    log(`API_BASE=${API_BASE}`)
    log(`DEFAULT_PASSWORD=${DEFAULT_PASSWORD}`)
    return
  }

  if (cmd === "check-db") {
    checkLocalDb()
    return
  }

  if (cmd === "test-login") {
    const email = args[1]
    if (!email) {
      log("✗ 缺少 email 参数")
      log("  用法：node scripts/auth-reset.mjs test-login <email>")
      process.exit(1)
    }
    const ok = await loginTest(email)
    process.exit(ok ? 0 : 1)
  }

  if (cmd === "full-check") {
    const email = args[1] ?? "admin@91zm.com.cn"
    log(`==> 1/2 检查本地 dev DB`)
    const dbOk = checkLocalDb()
    log("")
    log(`==> 2/2 远程登录测试：${email}`)
    const loginOk = await loginTest(email)
    log("")
    if (dbOk && loginOk) {
      log("✓ 完整检查通过：本地 DB 存在 + 远程登录成功")
    } else {
      log(`✗ 检查失败：dbOk=${dbOk} loginOk=${loginOk}`)
      process.exit(1)
    }
    return
  }

  if (cmd === "trigger-silent") {
    log("mp 端 silentLogin 触发（开发模式）")
    log("  1) 启动 mp dev：pnpm dev:weapp")
    log("  2) 微信开发者工具导入 mp 项目 → 自动调 silentLogin")
    log("  3) silentLogin 调主仓 POST /auth/wx-login → 后端 users 表（含 admin@91zm.com.cn）已重置")
    log("  4) mp 端拿 accessToken → 跳 login → 跳 profile")
    return
  }

  log(`✗ 未知命令：${cmd}`)
  log("  跑 `node scripts/auth-reset.mjs help` 查看用法")
  process.exit(1)
}

main().catch((e) => {
  console.error("✗ 失败：", e)
  process.exit(1)
})
