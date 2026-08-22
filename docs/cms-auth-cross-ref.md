# mp-zhiming · CMS 鉴权借鉴对照表 · 2026-08-23

> **范围**：mp-zhiming 端鉴权模式借鉴主流 CMS（Strapi / Payload / Supabase）
> **结论**：mp 端鉴权**完全复用主仓后端**，前端仅做 API 包装 + 状态机

---

## 一、mp 端鉴权特点

| 维度 | 主仓后端 | mp 端 | 关系 |
|------|----------|-------|------|
| **存储** | SQLite + Drizzle | 无（内存态） | mp 不持久化 |
| **JWT 签发** | 主仓 @fastify/jwt | 不签发（仅消费） | 100% 主仓 |
| **Refresh** | HttpOnly Cookie | 不实现（仅消费） | 100% 主仓 |
| **silentLogin** | 不涉及 | mp 端特有 | Payload CMS 模式 |
| **错误码矩阵** | 401/403/429/500 | 客户端消费 + UI 反馈 | 100% 主仓 |
| **WWW-Authenticate 头** | 主仓必带 | 客户端识别 | 100% 主仓 |

---

## 二、CMS 借鉴对照

| 维度 | Strapi | Payload | Supabase | **mp-zhiming** | 对齐度 |
|------|--------|---------|----------|----------------|--------|
| **Token 内存态** | ✅ localStorage | ✅ memory + httpOnly cookie | ✅ memory | **✅ Zustand 内存态（防 XSS）** | ✅ 100% |
| **silentLogin FSM** | ❌ | ✅ try/catch/finally | ✅ | **✅ FSM 注释化（Stage 3.7）** | ✅ 100%（Payload 模式）|
| **错误码统一文案** | ✅ | ✅ | ✅ | **✅ ApiErrorClass 携带 code/message/details** | ✅ 100% |
| **401 清态跳 login** | ✅ | ✅ | ✅ | **✅ `clear() + Taro.reLaunch(login)`** | ✅ 100% |
| **Header 鉴权（非 query）** | ✅ | ✅ | ✅ | **✅ `Authorization: Bearer`（R2 优化）** | ✅ 100% |
| **错误码矩阵测试** | ✅ | ✅ Payload 矩阵 | ✅ | **✅ 401/403/429/500（Stage 3.6）** | ✅ 100% |

---

## 三、mp 端 silentLogin FSM（Payload CMS 模式）

**Payload CMS 默认 silentLogin 模式**：
```typescript
async function silentLogin() {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      setSession(token)
      return true
    }
    const { code } = await wxLogin()  // 平台 API
    const { accessToken, user } = await apiLogin(code)
    setSession(accessToken, user)
    return true
  } catch (e) {
    console.warn(e)
    return false
  } finally {
    setInitialized(true)  // 关键：路由 gate 据此放行
  }
}
```

**mp-zhiming 模式（Stage 3.7 注释化后）**：
```typescript
export async function silentLogin(): Promise<boolean> {
  const state = useAuth.getState()
  try {
    // [INIT] → [TOKEN?]
    if (state.accessToken) return true
    // [TOKEN?] → [WX_LOGIN]
    const { code } = await Taro.login()
    // [WX_LOGIN] → [SESSION]
    const { accessToken, user } = await wxLogin(code)
    state.setSession(accessToken, user)
    // [SESSION] → [GET_ME]
    try {
      const me = await getMe()
      state.setMainProfileId(me.mainProfileId)
    } catch (e) {
      console.warn("[silentLogin] getMe 失败", e)
    }
    return true
  } catch (e) {
    console.warn("[silentLogin] 失败", e)
    return false
  } finally {
    state.setInitialized(true)
  }
}
```

**为什么 mp 端 silentLogin 比主仓重要**：
- 主仓：每个路由独立鉴权，不需要"启动态"
- mp 端：微信小程序启动即调用，`initialized=false` 时路由 gate 必须等待
- 失败也必须 `setInitialized(true)`：否则路由永远卡死

---

## 四、客户端错误码矩阵（Stage 3.6 新增 4 用例）

| HTTP | 业务码 | 含义 | 客户端行为 | 测试用例 |
|------|--------|------|------------|----------|
| 200 | - | 成功 | 正常返回 | ✅ |
| 400 | 40001 | 输入参数不合法 | 弹 toast | ✅ |
| 400 | 40008 | wx-login 失败 | 弹 toast | ✅ |
| 401 | 40101 | 未登录 | **清态 + 跳 login** | ✅ + WWW-Authenticate 头识别 |
| 403 | 40302 | 非管理员 | 弹"非管理员" | ✅（Stage 3.6 新增）|
| 429 | 42901 | 限流 | 弹"请求过于频繁" | ✅（Stage 3.6 新增）|
| 500 | 50001 | 引擎异常 | 弹"服务器内部错误" | ✅（Stage 3.6 新增）|
| 5xx | - | 其他服务异常 | 抛兜底 ApiError | ✅ |
| 503 | 50303 | wx 服务未配置 | 弹"小程序未配置" | ✅ |

**关键不变量**：
- **仅 401 清态 + 跳 login**
- **403 / 429 / 500 保留 token**（避免反复踢出）
- **WWW-Authenticate 头识别**：未来可加（与主仓 Stage 3.2 配合）

---

## 五、未借鉴 / 主动放弃的 CMS 特性

| 特性 | 来源 | 为什么不做 |
|------|------|------------|
| **Refresh token 自动刷新** | Supabase | 主仓已实现 30 天 refresh，mp 端 access 15min 内短期有效无需刷新 |
| **WebSocket 实时通知** | Strapi | mp 端 10 页 MVP 用不到实时通知（admin 才用 SSE） |
| **多设备会话管理** | Auth0 | KISS：单 access + 单 refresh 已覆盖 99% |
| **OAuth 三方登录** | Payload | mp 端唯一入口即微信登录（wx-login）|
| **GraphQL 客户端缓存** | Hasura | 不引 GraphQL，REST + 内存态够用 |

---

## 六、Stage 3.6 + 3.7 变更清单

**api.test.ts（14→18 用例）**：
- ✅ 401 + WWW-Authenticate 头识别
- ✅ 403 ADMIN_REQUIRED 透传
- ✅ 429 RATE 限流透传
- ✅ 500 ENGINE_FAIL 兜底

**store/auth.ts（FSM 注释化）**：
- ✅ [INIT] / [TOKEN?] / [WX_LOGIN] / [SESSION] / [GET_ME] / [DONE] 6 态
- ✅ 失败分支标注（catch + finally）
- ✅ 不改动逻辑（仅注释）

---

## 七、关联文档

- mp 端审计：`docs/auth-audit-2026-08-22.md`
- mp 端架构：`docs/auth-architecture.md`
- 主仓架构：`SM-APP/docs/auth-architecture.md`
- 主仓借鉴对照：`SM-APP/docs/cms-auth-cross-ref.md`
