# mp-zhiming 用户系统重置说明 · 2026-08-22

> **状态**：已完成（与主仓 SM-APP 阶段 1.1 同步）

---

## 一、关键认知

**mp-zhiming 是纯前端项目**（10 个 .ts 源文件）· **没有 users 表 · 没有 .db 文件**。

所有用户数据**全部在 SM-APP 主仓后端**（`apps/server/src/db/schema.ts` 的 `users = sqliteTable("zm_users", ...)`）。

mp-zhiming 通过 HTTP API 调主仓：
- `POST https://91zm.com.cn/api/v1/auth/wx-login`（微信一键登录）
- `POST https://91zm.com.cn/api/v1/auth/login`（邮箱密码登录 · 仅测试用）
- `GET  https://91zm.com.cn/api/v1/me`（拿用户信息）

**所以 mp 端"重置用户"实际是** → **重置主仓后端 users 表**（已在 SM-APP 阶段 1.1 完成）。

---

## 二、本次重置结果（2026-08-22T13:03 落地）

| 邮箱 | 角色 | 积分 | 主盘 | 验证 |
|------|------|------|------|------|
| `admin@91zm.com.cn` | admin | 100000 | 无 | ✓ 已验证 |
| `496172928@qq.com` | admin | **999999999** | `profile-4961-001` | ✓ 已验证 |

**所有现有用户密码** → `argon2(12345678)` · `banned_at=NULL` · `email_verified=0`（除两个新建 admin 验证=1）

**所有 refresh_tokens** → 清空（强制重登）

**重置执行位置**：`/Users/mac/Documents/Projects/SM-APP/apps/server/scripts/reset_users.ts`

---

## 三、mp 端验证工具

`scripts/auth-reset.mjs`（**新文件**）· 用法：

```bash
# 1) 完整检查（DB + 远程登录）
node scripts/auth-reset.mjs full-check admin@91zm.com.cn
# 输出：
#   # 本地 dev DB：/Users/mac/.../zhiming.db（0.79 MB）
#   # POST https://91zm.com.cn/api/v1/auth/login {email: admin@91zm.com.cn, password: 12345678}
#   ✓ 登录成功：admin@91zm.com.cn
#   accessToken 前 30 字符：eyJhbGciOiJIUzI1NiIsInR5cCI6...
#   user.role=admin  credits=100000  email_verified=true
#   ✓ 完整检查通过

# 2) 仅登录测试
node scripts/auth-reset.mjs test-login 496172928@qq.com
# 输出 user.role=admin credits=999999999 main_profile=profile-4961-001

# 3) 检查本地 dev DB
node scripts/auth-reset.mjs check-db

# 4) 触发 mp 端 silentLogin
node scripts/auth-reset.mjs trigger-silent
# 启动 pnpm dev:weapp + 微信开发者工具导入 → silentLogin 调主仓后端
```

---

## 四、mp 端 silentLogin 流程

```
mp 启动 (pnpm dev:weapp)
  ↓
app.tsx useEffect → silentLogin()
  ↓
Taro.login() → { code: 'mock-code' }  // 微信开发者工具 mock
  ↓
POST https://91zm.com.cn/api/v1/auth/wx-login
  body: { code: 'mock-code' }
  ↓
主仓后端: code2Session() → openid → findOrCreateByWxOpenid() → 返 { accessToken, user }
  ↓
mp 端 store/auth.setSession() → initialized=true
  ↓
跳转 /pages/profile
```

**关键**：mp silentLogin 用**微信 openid**（占位邮箱 `wx_<nanoid(16)>@placeholder.local`），**不是邮箱密码**。所以"重置 12345678"对 wx-login 用户**不影响**——他们的密码是空字符串。

但对**开发调试 + 真生产小程序**有 2 个影响：
1. **真生产 wx 用户**：openid 仍对应，登录流程不变
2. **邮箱密码测试**：mp 仓**没有**邮箱登录界面，邮箱密码登录只用于主仓后端 API 直接测试

---

## 五、为什么 mp 不需要改 user 表

- mp 仓**不持久化 user** — 每次 silentLogin 都从主仓后端拉取
- mp 仓的 `store/auth.ts` 是 Zustand 内存态，重启后清空
- mp 仓的 `Taro.setStorageSync` 仅缓存 accessToken + 用户基本信息（角色/积分）
- 真实用户数据**单一事实源** = 主仓 `zm_users` 表

如果想"重置 mp 端用户"——清 mp 仓 localStorage 即可（用户退出登录）。

---

## 六、待办（你裁决）

### A. 立即触发 mp 端 silentLogin 验证
```bash
# 1) 启动 mp dev 服务
pnpm dev:weapp

# 2) 微信开发者工具 → 导入 mp-zhiming
#    项目目录：/Users/mac/Documents/Projects/mp-zhiming

# 3) silentLogin 自动触发 → 拿主仓用户数据

# 4) 检查 profile 页：应显示最新用户列表（含 admin@91zm.com.cn）
```

### B. 测试 mp silentLogin 端到端
- mp silentLogin 模拟微信用户（openid 唯一）
- 主仓后端会查找/创建该 openid 对应用户
- mp store 存 accessToken
- mp 跳到 profile

### C. 长期监控
- 主仓后端 `users` 表的健康（< 10000 用户/表）
- mp silentLogin 调用频率（< 1 次/秒/用户）

---

## 七、关联文档

- 主仓计划：`/SM-APP/.zcf/plan/current/auth-reset-cms-refactor-2026-08-22_205747.md`
- 主仓 reset 脚本：`/SM-APP/apps/server/scripts/reset_users.ts`
- mp 端 silentLogin：`/mp-zhiming/src/store/auth.ts`
- mp 端 API 包装：`/mp-zhiming/src/lib/api.ts`
- mp 端 微信分享指南：`/mp-zhiming/docs/phase6-launch-checklist.md`
