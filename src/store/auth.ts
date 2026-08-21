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

/** 启动静默登录：
 *  - 本地有 token → 直返 true（trust 已存在的 session）
 *  - 无 token → wx.login → /auth/wx-login → getMe 拉 mainProfileId
 *  - 无论成败都设 initialized=true（R3：路由 gate 据此判断） */
export async function silentLogin(): Promise<boolean> {
  const state = useAuth.getState()
  try {
    if (state.accessToken) return true
    const { code } = await Taro.login()
    const { accessToken, user } = await wxLogin(code)
    state.setSession(accessToken, user)
    // R4+R5：登录成功后拉 mainProfileId
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
