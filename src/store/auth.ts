// mp-zhiming/src/store/auth.ts · Zustand 状态（M17）
// access token 内存态（防 XSS 长期持有）；refresh 走 wx.setStorageSync 加密
// silentLogin(): 启动时尝试 wx.login + /auth/wx-login 自动登录
import Taro from "@tarojs/taro"
import { create } from "zustand"
import { wxLogin } from "../lib/api"

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
  setSession: (token: string, user: AuthUser) => void
  patchUser: (patch: Partial<AuthUser>) => void
  clear: () => void
}

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
  clear: () => set({ accessToken: null, user: null }),
}))

/** 启动静默登录：本地有有效 token 直接复用；否则 wx.login → /auth/wx-login */
export async function silentLogin(): Promise<boolean> {
  const existing = useAuth.getState().accessToken
  if (existing) return true
  try {
    const { code } = await Taro.login()
    const { accessToken, user } = await wxLogin(code)
    useAuth.getState().setSession(accessToken, user)
    return true
  } catch (e) {
    console.warn("[silentLogin] 失败", e)
    return false
  }
}
