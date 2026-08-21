// mp-zhiming/src/store/auth.test.ts · Zustand 状态 + silentLogin（M17 单测）
// mock Taro 避免 happy-dom 下 ESM/CJS 兼容问题
import { beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@tarojs/taro", () => ({
  default: {
    login: vi.fn(() => Promise.resolve({ code: "mock-code" })),
    setStorageSync: vi.fn(),
    getStorageSync: vi.fn(() => ""),
  },
}))
// eslint-disable-next-line import/first
import { type AuthUser, useAuth } from "./auth"

const sampleUser: AuthUser = {
  id: "u-1",
  email: "wx_abc@placeholder.local",
  locale: "zh-CN",
  credits: 10000,
}

describe("useAuth（Zustand 状态）", () => {
  beforeEach(() => {
    useAuth.setState({ accessToken: null, user: null })
  })

  it("初始态：accessToken=null + user=null", () => {
    const s = useAuth.getState()
    expect(s.accessToken).toBeNull()
    expect(s.user).toBeNull()
  })

  it("setSession：写入 token + user", () => {
    useAuth.getState().setSession("tok-abc", sampleUser)
    const s = useAuth.getState()
    expect(s.accessToken).toBe("tok-abc")
    expect(s.user?.email).toBe("wx_abc@placeholder.local")
    expect(s.user?.credits).toBe(10000)
  })

  it("patchUser：局部更新 user（不改 token）", () => {
    useAuth.getState().setSession("tok-abc", sampleUser)
    useAuth.getState().patchUser({ credits: 9500, nickname: "水" })
    const s = useAuth.getState()
    expect(s.accessToken).toBe("tok-abc") // token 不变
    expect(s.user?.credits).toBe(9500)
    expect(s.user?.nickname).toBe("水")
    expect(s.user?.email).toBe("wx_abc@placeholder.local") // 其他字段不变
  })

  it("patchUser：user=null 时无副作用（不抛错）", () => {
    expect(useAuth.getState().user).toBeNull()
    useAuth.getState().patchUser({ credits: 1 })
    expect(useAuth.getState().user).toBeNull()
  })

  it("clear：清空 token + user", () => {
    useAuth.getState().setSession("tok-abc", sampleUser)
    useAuth.getState().clear()
    const s = useAuth.getState()
    expect(s.accessToken).toBeNull()
    expect(s.user).toBeNull()
  })
})
