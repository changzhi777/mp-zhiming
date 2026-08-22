// mp-zhiming/src/store/auth.ts · Zustand 状态（M17 · R3+R4+R5 优化）
// access token 内存态（防 XSS 长期持有）；refresh 走 wx.setStorageSync 加密
// silentLogin(): 启动时尝试 wx.login + /auth/wx-login 自动登录 + getMe 拉 mainProfileId
// initialized: 启动初始化完成标记（路由 gate 用）
import Taro from "@tarojs/taro"
import { create } from "zustand"
import { getMe, wxLogin } from "../lib/api"

export type AuthUser = {
  id: string
  email: string
  locale: "zh-CN" | "zh-TW"
  credits: number
  realNameMasked?: string
  nickname?: string | null
  phoneMasked?: string | null
  avatar?: string | null
}

export type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  mainProfileId: string | null
  initialized: boolean
  setSession: (token: string, user: AuthUser) => void
  patchUser: (patch: Partial<AuthUser>) => void
  setMainProfileId: (id: string | null) => void
  setInitialized: (v: boolean) => void
  clear: () => void
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  mainProfileId: null,
  initialized: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
  setMainProfileId: (mainProfileId) => set({ mainProfileId }),
  setInitialized: (initialized) => set({ initialized }),
  clear: () => set({ accessToken: null, user: null, mainProfileId: null, initialized: true }),
}))

/** 启动静默登录 FSM（有限状态机）：
 *
 *  ┌─────────────┐
 *  │ [INIT]      │ ← state.accessToken=null · initialized=false
 *  └──────┬──────┘
 *         │ silentLogin() 触发
 *         ▼
 *  ┌─────────────┐  无 token                ┌─────────────┐
 *  │ [TOKEN?]    │ ─────────────────────► │ [WX_LOGIN]   │
 *  │ accessToken │  有 token → return true │ Taro.login() │
 *  │ 已存在？    │ ◄─────────────────────  │ → POST /auth │
 *  └─────────────┘  直返 true（trust 已存）│  /wx-login   │
 *                                         └──────┬──────┘
 *                                                │ accessToken + user
 *                                                ▼
 *                                         ┌─────────────┐
 *                                         │ [SESSION]   │
 *                                         │ setSession  │
 *                                         └──────┬──────┘
 *                                                │
 *                                                ▼
 *                                         ┌─────────────┐
 *                                         │ [GET_ME]    │
 *                                         │ GET /me     │
 *                                         │ → mainProfileId
 *                                         └──────┬──────┘
 *                                                │ ok / err（仅 warn）
 *                                                ▼
 *                                         ┌─────────────┐
 *                                         │ [DONE]      │
 *                                         │ initialized │
 *                                         │ =true       │
 *                                         │ return true │
 *                                         └─────────────┘
 *
 *  失败分支（catch → return false）：
 *    [WX_LOGIN] / [SESSION] / [GET_ME] 任一异常 → warn log + 返回 false + finally 设 initialized=true
 *  路由 gate 据 initialized=true 放行（避免死锁）
 *
 *  - 本地有 token → 直返 true（trust 已存在的 session）
 *  - 无 token → wx.login → /auth/wx-login → getMe 拉 mainProfileId
 *  - 无论成败都设 initialized=true（R3：路由 gate 据此判断） */
export async function silentLogin(): Promise<boolean> {
  const state = useAuth.getState()
  try {
    // [INIT] → [TOKEN?]
    if (state.accessToken) return true // [TOKEN?] → [DONE]（已登录）
    // [TOKEN?] → [WX_LOGIN]
    const { code } = await Taro.login()
    // [WX_LOGIN] → [SESSION]
    const { accessToken, user } = await wxLogin(code)
    state.setSession(accessToken, user)
    // [SESSION] → [GET_ME]
    try {
      // R4+R5：登录成功后拉 mainProfileId
      const me = await getMe()
      state.setMainProfileId(me.mainProfileId)
      // [GET_ME] → [DONE]
    } catch (e) {
      // [GET_ME] 失败：仅 warn，不阻塞登录态（accessToken 已写入）
      console.warn("[silentLogin] getMe 失败", e)
      // [GET_ME] → [DONE]（降级：未拉 mainProfileId 也算登录成功）
    }
    return true
  } catch (e) {
    // [WX_LOGIN] / [SESSION] 任一失败：兜底
    console.warn("[silentLogin] 失败", e)
    return false
  } finally {
    // 必经 [DONE]：路由 gate 据此判断放行（避免死锁）
    state.setInitialized(true)
  }
}
