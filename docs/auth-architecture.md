# mp-zhiming · 用户鉴权架构 · 2026-08-23

> **状态**：Stage 3 CMS 重构收口 · 35 用例全绿（api.test.ts 14→18 · auth.test.ts 10）· 96.7% 覆盖率
>
> **范围**：mp-zhiming 端鉴权架构（silentLogin FSM + API wrapper + 错误码矩阵）
> **关联**：主仓后端鉴权请阅 `SM-APP/docs/auth-architecture.md`（单一事实源）

---

## 一、核心原则：mp 端无 user 表

mp-zhiming 是**纯前端**项目（10 个 .ts 文件）：
- ❌ 没有 users 表
- ❌ 没有 .db 文件
- ❌ 不持久化 user 数据
- ✅ 所有 user 数据**单一事实源 = SM-APP 主仓后端**

mp 端通过 HTTP API 调主仓：
- `POST https://91zm.com.cn/api/v1/auth/wx-login`（微信一键登录）
- `GET  https://91zm.com.cn/api/v1/me`（拿用户信息 + mainProfileId）

---

## 二、silentLogin 状态机（Stage 3.7 注释化）

```
   ┌─────────────┐
   │ [INIT]      │ ← state.accessToken=null · initialized=false
   └──────┬──────┘
          │ silentLogin() 触发
          ▼
   ┌─────────────┐  无 token                ┌─────────────┐
   │ [TOKEN?]    │ ─────────────────────► │ [WX_LOGIN]   │
   │ accessToken │  有 token → return true │ Taro.login() │
   │ 已存在？    │ ◄─────────────────────  │ → POST /auth │
   └─────────────┘  直返 true（trust 已存）│  /wx-login   │
                                          └──────┬──────┘
                                                 │ accessToken + user
                                                 ▼
                                          ┌─────────────┐
                                          │ [SESSION]   │
                                          │ setSession  │
                                          └──────┬──────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │ [GET_ME]    │
                                          │ GET /me     │
                                          │ → mainProfileId
                                          └──────┬──────┘
                                                 │ ok / err（仅 warn）
                                                 ▼
                                          ┌─────────────┐
                                          │ [DONE]      │
                                          │ initialized │
                                          │ =true       │
                                          │ return true │
                                          └─────────────┘

   失败分支（catch → return false）：
     [WX_LOGIN] / [SESSION] / [GET_ME] 任一异常 → warn log + 返回 false + finally 设 initialized=true
   路由 gate 据 initialized=true 放行（避免死锁）
```

---

## 三、API Wrapper 设计（Stage 3.2 配合主仓）

**关键决策（R2）**：
- ❌ 不再 `?token=` query 注入（URL 日志/历史/反代 access log 泄露风险）
- ✅ `Authorization: Bearer <token>` header 鉴权（与 web 主站同款）

**401 错误处理**：
```typescript
if (err?.code === 40101) {
  useAuth.getState().clear()                          // 清本地态
  Taro.reLaunch({ url: "/pages/login/index" })       // 跳 login
}
```

**配合主仓 WWW-Authenticate 头**：客户端未来可同时检查 HTTP status + 响应头 `WWW-Authenticate: Bearer realm="zhiming"` 双保险

---

## 四、错误码矩阵（Stage 3.6 新增 4 用例）

| 状态码 | 业务码 | 客户端行为 | 测试覆盖 |
|--------|--------|------------|----------|
| 200/201 | - | 正常返回 | ✅ |
| 400 | 40001 BAD_INPUT | 弹错误 toast | ✅ |
| 400 | 40008 WX_LOGIN_FAILED | 弹错误 toast | ✅ |
| 401 | 40101 UNAUTH | 清态 + reLaunch login | ✅（+WWW-Authenticate 头识别） |
| 403 | 40302 ADMIN_REQUIRED | 弹"非管理员" | ✅（新增） |
| 429 | 42901 RATE | 弹"请求过于频繁" | ✅（新增） |
| 500 | 50001 ENGINE_FAIL | 弹"服务器内部错误" | ✅（新增） |
| 5xx | - | 抛兜底 ApiError | ✅ |
| 503 | 50303 WX_NOT_CONFIGURED | 弹"小程序未配置" | ✅ |

**重要不变量**：
- **401 才清态 + 跳 login**
- **403 / 429 / 500 保留 token**（避免用户被反复踢出）
- **5xx 不清态**（临时故障可恢复）

---

## 五、Store 状态设计（Zustand）

```typescript
type AuthState = {
  accessToken: string | null       // 内存态（防 XSS 长期持有）
  user: AuthUser | null           // 用户基本信息
  mainProfileId: string | null    // 主盘 ID（用于快速跳转）
  initialized: boolean            // 启动初始化完成（路由 gate 用）

  setSession(token, user)         // 登录成功
  patchUser(patch)                // 局部刷新（如改姓名）
  setMainProfileId(id)            // 主盘变更
  setInitialized(v)               // 标记初始化完成
  clear()                         // 清态（401 / logout）
}
```

**存储策略**：
- `accessToken`：内存态（Zustand state）—— XSS 拿到也不能持久化
- `user`：内存态 —— 每次启动从主仓 /me 拉
- 加密 `setStorageSync`：refresh token（M17 阶段 2 待办）

---

## 六、测试矩阵

**src/store/auth.test.ts（10 用例）**：
- silentLogin：成功 / 已有 token / wx.login 失败 / getMe 失败
- Store：setSession / patchUser / setMainProfileId / setInitialized / clear

**src/lib/api.test.ts（14→18 用例，Stage 3.6 新增 4）**：
- 请求通用：wxLogin / Authorization header / 401 清态 / 业务错误码 / 5xx / 500 无 body 兜底
- 5 个 API 函数：getMe / getProfile / getHuangli / createShareLink / castChart / getDaily
- getLocations：无参 / 带参
- **错误码矩阵（新增）**：401+WWW-Authenticate / 403 / 429 / 500 ENGINE_FAIL

---

## 七、关键不变量

1. **mp 端无 user 表** —— 所有 user 数据在 SM-APP 主仓 `zm_users`
2. **accessToken 内存态** —— 不持久化（防 XSS）
3. **silentLogin 幂等** —— 多次调用只触发一次 wx-login
4. **initialized 必须设 true** —— 不论成功失败，路由 gate 才能放行
5. **401 必清态跳 login** —— 其他状态码保留 token
6. **getMe 失败仅 warn** —— 主盘拉取失败不阻塞登录态

---

## 八、关联文档

- 审计报告：`docs/auth-audit-2026-08-22.md`
- CMS 借鉴对照：`docs/cms-auth-cross-ref.md`
- 重置说明：`docs/auth-reset-2026-08-22.md`
- 主仓后端：`SM-APP/docs/auth-architecture.md`
- 提审清单：`docs/phase6-launch-checklist.md`
