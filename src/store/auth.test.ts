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
vi.mock("../lib/api", () => ({
  wxLogin: vi.fn(() =>
    Promise.resolve({
      accessToken: "tok-silent",
      user: {
        id: "u-silent",
        email: "wx_silent@placeholder.local",
        locale: "zh-CN" as const,
        credits: 10000,
      },
    }),
  ),
  getMe: vi.fn(() =>
    Promise.resolve({
      id: "u-silent",
      email: "wx_silent@placeholder.local",
      locale: "zh-CN",
      credits: 10000,
      mainProfileId: "profile-silent",
    }),
  ),
}))
// eslint-disable-next-line import/first
import { type AuthUser, silentLogin, useAuth } from "./auth"

const sampleUser: AuthUser = {
  id: "u-1",
  email: "wx_abc@placeholder.local",
  locale: "zh-CN",
  credits: 10000,
}

describe("useAuth（Zustand 状态）", () => {
  beforeEach(() => {
    // 重置全部初始状态（避免跨用例污染）
    useAuth.setState({
      accessToken: null,
      user: null,
      mainProfileId: null,
      initialized: false,
    })
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
    expect(s.mainProfileId).toBeNull() // R3：clear 也清 mainProfileId
    expect(s.initialized).toBe(true) // R3：clear 后初始化标记仍为 true（路由 gate 据此判断）
  })

  it("setMainProfileId：写入 mainProfileId（R4+R5 真实主盘 ID）", () => {
    useAuth.getState().setMainProfileId("profile-uuid-1")
    expect(useAuth.getState().mainProfileId).toBe("profile-uuid-1")
    useAuth.getState().setMainProfileId(null)
    expect(useAuth.getState().mainProfileId).toBeNull()
  })

  it("setInitialized：标记启动初始化完成（R3 路由 gate 用）", () => {
    expect(useAuth.getState().initialized).toBe(false)
    useAuth.getState().setInitialized(true)
    expect(useAuth.getState().initialized).toBe(true)
  })
})

describe("silentLogin（启动静默登录）", () => {
  beforeEach(() => {
    useAuth.setState({
      accessToken: null,
      user: null,
      mainProfileId: null,
      initialized: false,
    })
  })

  it("成功：wx.login → wxLogin → setSession → getMe → setMainProfileId → initialized=true", async () => {
    const ok = await silentLogin()
    expect(ok).toBe(true)
    const s = useAuth.getState()
    expect(s.accessToken).toBe("tok-silent")
    expect(s.user?.id).toBe("u-silent")
    expect(s.mainProfileId).toBe("profile-silent")
    expect(s.initialized).toBe(true)
  })

  it("已有 token：直接返 true 不调 wx.login", async () => {
    useAuth.getState().setSession("tok-existing", sampleUser)
    const ok = await silentLogin()
    expect(ok).toBe(true)
    expect(useAuth.getState().initialized).toBe(true)
  })

  it("失败：wx.login 抛错 → initialized=true（路由 gate 据此判断）", async () => {
    const mod = await import("@tarojs/taro")
    // biome-ignore lint/suspicious/noExplicitAny: vi.fn() Mock 类型与 Taro.login 不兼容
    const loginMock = (mod.default as any).login as { mockRejectedValueOnce: (e: unknown) => void }
    loginMock.mockRejectedValueOnce(new Error("wx.login fail"))
    const ok = await silentLogin()
    expect(ok).toBe(false)
    expect(useAuth.getState().initialized).toBe(true)
    expect(useAuth.getState().accessToken).toBeNull()
  })
})
