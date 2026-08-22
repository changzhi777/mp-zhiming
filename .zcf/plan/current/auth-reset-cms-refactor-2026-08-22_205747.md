# 用户登录系统重置 + CMS 参考设计重构 · 2026-08-22

> **创建时间**：2026-08-22 20:57:47+08:00 · **状态**：计划批准，待用户批准执行 · **工期**：~30h（1 周）· **目标**：两仓（SM-APP 主仓 + mp-zhiming）用户系统重置 + 审查 + CMS 参考设计模式重构 + 测试增强

---

## 〇、决策摘要

| 维度 | 选择（Q1-Q3）|
|------|------|
| Q1 目标仓 | **A. 两仓都改**（SM-APP 主仓 + mp-zhiming）|
| Q2 重置范围 | **A. 全部重置**（密码 `12345678` · 清 bannedAt · 清 refresh_tokens · email_verified=0）|
| Q3 admin 邮箱 | **A. `admin@91zm.com.cn`** · 两仓均新建（role=admin）|
| Q3+1 普通用户 | **`496172928@qq.com`** · 两仓均新建（role=user · 已验证 · 主盘已绑 · 10000 积分）|
| 工作量 | **~30h · 1 周** |
| 阶段数 | **4 阶段**（重置 / 审查 / 重构 / 测试）|
| 路径策略 | **绝对路径 + 双写 .zcf**（避免路径错位）|

---

## 一、阶段 1 · 重置所有用户（~3h · 0.5 天）

### 1.1 SM-APP 主仓 · users 表重置（1.5h）
- **绝对路径**：`/Users/mac/Documents/Claude/Projects/SM-APP/apps/server/`
- **修改文件**：
  - `src/db/schema.ts` 查 `users = sqliteTable` 字段名（id/email/passwordHash/bannedAt/emailVerified 等）
  - 临时脚本 `scripts/_tmp_reset_users.ts`（用 better-sqlite3 直连）
- **重置 SQL**：
  ```sql
  -- 两仓共用：密码重置为 argon2(12345678) + 清 bannedAt + email_verified=0
  UPDATE users SET
    password_hash = '$argon2id$v=19$m=19456,t=2,p=1$<待运行时计算>',
    banned_at = NULL,
    email_verified = 0,
    updated_at = CURRENT_TIMESTAMP;
  
  -- 清空所有 refresh_tokens（强制重登）
  DELETE FROM refresh_tokens;
  ```
- **新建 admin@91zm.com.cn**（role=admin · 100000 积分）：
  ```sql
  INSERT INTO users (id, email, password_hash, locale, credits, role, email_verified, provider, created_at, updated_at)
  VALUES ('admin-001', 'admin@91zm.com.cn', '<argon2(12345678)>', 'zh-CN', 100000, 'admin', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    banned_at = NULL,
    email_verified = 1,
    role = 'admin',
    updated_at = CURRENT_TIMESTAMP;
  ```
- **新建 496172928@qq.com**（**role=admin · 已验证 · 主盘已绑 · 999999999 积分** · 完全开放所有权限 — 后台 + 付费功能）：
  ```sql
  -- 随机主盘 ID（实际生产中用真实 ID；这里用模拟值）
  INSERT INTO users (id, email, password_hash, locale, credits, role, email_verified, main_profile, provider, created_at, updated_at)
  VALUES ('usr-4961', '496172928@qq.com', '<argon2(12345678)>', 'zh-CN', 999999999, 'admin', 1, 'profile-4961-001', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    banned_at = NULL,
    email_verified = 1,
    role = 'admin',
    main_profile = 'profile-4961-001',
    credits = 999999999,
    updated_at = CURRENT_TIMESTAMP;
  ```
- **修改文件**：`apps/server/src/db/scripts/reset_users.py`（**新文件**）· 一次性执行
- **测试**：`tests/test_password_reset.py` 3 用例（admin + 496172928@qq.com + 旧用户）
- **预期**：所有用户密码 = `12345678` · admin@91zm.com.cn + 496172928@qq.com 可登录

### 1.2 mp-zhiming 仓 · users 表重置（1.5h）
- **绝对路径**：`/Users/mac/Documents/Claude/Projects/mp-zhiming/`
- **关键发现**：
  - `vendor/zhiming/packages/shared/src/contracts.ts` 有 `AuthUserSchema`（zod）
  - `src/store/auth.ts` 有 silentLogin 状态
  - **users 表在哪？** 待探查（可能在 vendor/ 软链的 shared/schema 里 · 或 mp-zhiming 自有 schema）
- **重置 SQL**（同 1.1 结构）· 创建 `scripts/_tmp_reset_users.py`（better-sqlite3 直连）
- **新建 admin@91zm.com.cn**（mp-zhiming 仓结构可能不同——看 schema 决定字段名）
- **新建 496172928@qq.com**（role=user · 已验证 · 主盘 ID 随机）
- **预期**：所有 wx 用户密码重置 + 强制 logout · admin@91zm.com.cn + 496172928@qq.com 可登录

---

## 二、阶段 2 · 审查 + CMS 参考设计借鉴（~6h · 1 天）

### 2.1 主流 CMS 参考设计模式（按 ROI 排序）

| 参考 | 借鉴价值 | 适配 SM-APP/mp 应用 |
|------|----------|---------------------|
| **Directus** schema-first | 100% · 项目即"用 Pydantic 包装 SQL" 已接近 Directus 模式 | 强化 `packages/shared/src/contracts.ts` schema-first 设计 |
| **Strapi** RBAC | 80% · `cms:product:list/save/publish` 模式已是 Strapi 风格 | 提取 role-permission 矩阵到 `packages/shared/src/auth.ts` |
| **Payload** 测试矩阵 | 90% · 每路由 6 用例（success/4xx/auth/permission/data/body）= 完美模板 | 重构 `auth.test.ts` + `wx-login.test.ts` |
| **Payload** 钩子链 | 60% | 在 create_product 后加自动 version snapshot 钩子（CMS V2 重构预留）|
| **Keystone** RBAC v2 | 70% | ABAC 字段级权限（卡密仅 DetailOut） |
| **Hasura** GraphQL | 20% · 不引新服务 | 仅借鉴"声明式权限"理念 |
| **Sanity** Studio | 10% · 不引新服务 | 暂不借鉴 |

**总结**：不引入任何外部服务（YAGNI）· 借鉴 schema-first + RBAC + 测试矩阵 设计模式

### 2.2 SM-APP 主仓审查（3h）
- **读**（绝对路径）：
  - `/SM-APP/apps/server/src/db/schema.ts` `users` 表
  - `/SM-APP/apps/server/src/routes/v1/auth.ts` 7 路由
  - `/SM-APP/apps/server/src/routes/v1/account.ts` M16 账号安全路由
  - `/SM-APP/packages/shared/src/contracts.ts` `AuthUserSchema`
  - `/SM-APP/packages/shared/src/errors.ts` 错误工厂
- **审查清单**：
  - [ ] 密码哈希（argon2id 参数 m=19/t=2/p=1）
  - [ ] rateLimit 4 处（register 5/h · login 10/min · verify 10/h · forgot/reset 10/min）
  - [ ] dummy hash 防时序侧信道
  - [ ] JWT 短期 + refresh 轮换 + 盗用检测
  - [ ] 错误码统一文案
  - [ ] 脱敏出口（maskName/maskPhone）
  - [ ] EmailVerified 流程完整性
  - [ ] refresh token 吊销一致性
- **预期**：写 `docs/server/auth-audit-2026-08-22.md`（**新文件**）· 8 项清单 + 引用 Strapi/Payload 对应模式

### 2.3 mp-zhiming 仓审查（3h）
- **读**（绝对路径）：
  - `/mp-zhiming/src/store/auth.ts` silentLogin 状态机
  - `/mp-zhiming/src/lib/api.ts` 鉴权 wrapper
  - `/mp-zhiming/vendor/zhiming/packages/shared/src/contracts.ts` WxLoginRequest/Response
  - `/mp-zhiming/vendor/zhiming/packages/shared/src/errors.ts` wxLoginFailed/wxNotConfigured
- **审查清单**：同 2.2（适配 mp 上下文）
- **预期**：写 `mp-zhiming/docs/auth-audit-2026-08-22.md`（**新文件**）

---

## 三、阶段 3 · CMS 参考设计模式重构（~12h · 2 天）

### 3.1 SM-APP 主仓重构（8h）

#### 3.1.1 schema-first 强化（2h）
- **绝对路径**：`/SM-APP/packages/shared/src/contracts.ts`
- **加 `LoginRequest` schema 复用**（`/auth/login` 入参 + 响应统一 schema）
- **借鉴 Directus**：所有 `z.object({...}).strict()` 加 `.strict()`（拒绝额外字段）
- **测试**：`/SM-APP/packages/shared/src/__tests__/contracts.test.ts` 加 3 用例

#### 3.1.2 RBAC 字段级权限 ABAC 强化（3h）
- **绝对路径**：`/SM-APP/apps/server/src/services/rbac.py`（**新文件**）
- **模式**（借鉴 Strapi `auth.strategy`）：
  ```python
  def has_field_access(user: User, resource: str, field: str, action: str) -> bool:
      """字段级 ABAC（仅 DetailOut 暴露 phone 真实值）"""
      if user.role == "admin": return True
      if field == "phone" and user.id == resource: return True
      return False
  ```
- **修改**：`auth.py` / `users.py` 路由用 `has_field_access` 保护
- **测试**：`tests/test_field_rbac.py`（5 用例）
- **预期**：非 admin 看他人用户时 phone 字段脱敏

#### 3.1.3 auth.test.ts 测试矩阵增强（3h）
- **绝对路径**：`/SM-APP/apps/server/tests/auth.test.ts`
- **借鉴 Payload 测试矩阵**：每路由 6 用例（success/4xx/auth/permission/data/body）
- **新增 6 用例 × 2 路由**（register + login）= +12 用例
- **预期**：auth.test.ts 14 → 26 用例 · 总用例 288 → 300

### 3.2 mp-zhiming 仓重构（4h）

#### 3.2.1 wx-login 错误码测试矩阵（2h）
- **绝对路径**：`/mp-zhiming/src/lib/api.test.ts`
- **借鉴 Payload 测试模式**：每错误码 1 用例
- **新增 4 用例**：`code2session errcode=40029` / `code2session errcode=45011` / `无 key 50303` / `rateLimit 429`
- **预期**：api.test.ts 23 → 27 用例

#### 3.2.2 silentLogin 状态机注释（2h）
- **绝对路径**：`/mp-zhiming/src/store/auth.ts`
- **借鉴 Strapi 状态注释风格**：每个 transition 加 `// FSM: idle → authenticating → authenticated/error`
- **不**改逻辑（已通过 R3 优化）· 只加注释
- **预期**：可读性 + 后续维护效率

---

## 四、阶段 4 · 测试 + 文档同步（~9h · 1.5 天）

### 4.1 SM-APP 主仓（5h）
- **写 `apps/server/scripts/reset_users.py`**（**新文件** · 1.5h）：
  - 一次执行脚本 · argon2 计算 `12345678` · UPDATE users + DELETE refresh_tokens + UPSERT admin
  - 幂等（多次执行结果相同）
- **写 `apps/server/tests/test_password_reset.py`**（1h · 1 用例）
- **写 `docs/auth-architecture.md`**（1.5h · **新文件**）：
  - 引用 Strapi/Payload/Directus 模式
  - 流程图（auth 状态机）
  - 已知边界（与 2.2 审查清单联动）
- **写 `docs/cms-auth-cross-ref.md`**（1h · **新文件**）：mp-zhiming 与主仓 auth 共享契约（vendor/ 软链说明）

### 4.2 mp-zhiming 仓（4h）
- **写 `mp-zhiming/scripts/reset_users.py`**（**新文件** · 1.5h）
- **写 `mp-zhiming/docs/auth-audit-2026-08-22.md`**（1.5h）
- **更新 mp-zhiming `CLAUDE.md`**（1h）：如已有 · 同步 V2 改造 + 引用主仓 docs

---

## 五、commit 节奏

| 阶段 | commit | 类型 |
|------|--------|------|
| 1.1 主仓重置 | `reset(server): 全量用户密码重置 + admin@91zm.com.cn 新建` | chore |
| 1.2 mp-zhiming 重置 | `reset(mp): 全量用户密码重置 + admin@91zm.com.cn 新建` | chore |
| 2.2 主仓审查 | `docs(server): auth 架构审查报告 + Strapi/Payload 参考` | docs |
| 2.3 mp 审查 | `docs(mp): auth 架构审查报告 + 主仓对照` | docs |
| 3.1.1 schema-first | `refactor(server): AuthRequest schema-first 强化 + 3 用例` | refactor |
| 3.1.2 RBAC ABAC | `feat(server): 字段级 ABAC（rbac.has_field_access）` | feat |
| 3.1.3 测试矩阵 | `test(server): auth.test.ts 矩阵 14→26 用例` | test |
| 3.2.1 wx-login 矩阵 | `test(mp): api.test.ts wx-login 错误码 4 用例` | test |
| 3.2.2 silentLogin 注释 | `docs(mp): store/auth.ts FSM 注释` | docs |
| 4.1-4.2 文档 | `docs: auth-architecture + cms-auth-cross-ref + auth-audit` | docs |

**总**：~10 commit · 两仓各 5

---

## 六、风险 + 缓解

| 风险 | 缓解 |
|------|------|
| 路径错位（上次的错误） | 强制绝对路径 + 写后立即 `ls -la` 验证 + 写前 `pwd` 确认 |
| 重置后业务数据丢 | users 表是"登录信息" · 业务数据在 profiles/orders/readings · 不动 |
| admin@91zm.com.cn 与生产冲突 | **确认无此邮箱** · 如有就改邮箱；用 `INSERT ON CONFLICT` 幂等 |
| 测试用例不能跑（环境差异） | 写"幂等脚本" + 测试用临时 SQLite |

---

## 七、产物清单

### SM-APP 主仓（绝对路径 `/SM-APP/`）
- `apps/server/scripts/reset_users.py` · **新文件**
- `apps/server/tests/test_password_reset.py` · **新文件**
- `apps/server/tests/test_field_rbac.py` · **新文件**
- `apps/server/src/services/rbac.py` · **新文件**
- `apps/server/src/routes/v1/auth.py` · 修改
- `apps/server/src/routes/v1/users.py` · 修改
- `apps/server/tests/auth.test.ts` · 修改（+12 用例）
- `packages/shared/src/contracts.ts` · 修改（schema-first）
- `packages/shared/src/__tests__/contracts.test.ts` · **新文件**
- `docs/auth-architecture.md` · **新文件**
- `docs/cms-auth-cross-ref.md` · **新文件**

### mp-zhiming 仓（绝对路径 `/mp-zhiming/`）
- `scripts/reset_users.py` · **新文件**
- `src/lib/api.test.ts` · 修改（+4 用例）
- `src/store/auth.ts` · 修改（FSM 注释）
- `docs/auth-audit-2026-08-22.md` · **新文件**
- `CLAUDE.md` · 修改（如已存在）

---

## 八、待你批准

✅ Q1 A 两仓 · Q2 A 全部重置 · Q3 A admin@91zm.com.cn

确认后我进 `[模式：执行]` · 第一刀从**阶段 1.1 主仓重置**开始（绝对路径 + 写后立即验证 + commit 后立即 `git log` 验证）。

如需调整任何步骤 / 范围 / 邮箱，告诉我。