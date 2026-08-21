// mp-zhiming/src/lib/api.test.ts · fetch wrapper（M17 单测）
// 关键点：401 跳登录 + ?token= query 注入 + 错误码透传
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAuth } from "../store/auth"
import { ApiErrorClass } from "./api"

// mock Taro（api.ts 依赖 Taro.request / reLaunch）
import type { Mock } from "vitest"
const requestMock = vi.fn() as Mock
const reLaunchMock = vi.fn(() => Promise.resolve()) as Mock
vi.mock("@tarojs/taro", () => ({
  default: {
    request: (opts: unknown) => requestMock(opts),
    reLaunch: (opts: unknown) => reLaunchMock(opts),
  },
}))

// 延迟导入（必须在 mock 之后）
const { wxLogin } = await import("./api")

describe("request 通用行为", () => {
  beforeEach(() => {
    requestMock.mockReset()
    reLaunchMock.mockReset()
    useAuth.setState({ accessToken: null, user: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("wxLogin 成功：调 Taro.request + 路径 POST /auth/wx-login + body { code }", async () => {
    requestMock.mockResolvedValue({
      statusCode: 200,
      data: {
        accessToken: "tok-1",
        user: { id: "u-1", email: "wx_x@placeholder.local", locale: "zh-CN", credits: 10000 },
      },
    })
    const r = await wxLogin("valid-code")
    expect(requestMock).toHaveBeenCalledOnce()
    const call = requestMock.mock.calls[0][0] as { url: string; method: string; data: unknown }
    expect(call.method).toBe("POST")
    expect(call.url).toContain("/auth/wx-login")
    // 无 token 时不附加 ?token= query
    expect(call.url).not.toContain("?token=")
    expect(call.data).toEqual({ code: "valid-code" })
    expect(r.accessToken).toBe("tok-1")
  })

  it("有 token 时附加 ?token= query（wx.request header 限制）", async () => {
    useAuth.getState().setSession("tok-exist", {
      id: "u-1",
      email: "wx_x@placeholder.local",
      locale: "zh-CN",
      credits: 10000,
    })
    requestMock.mockResolvedValue({
      statusCode: 200,
      data: { ok: true },
    })
    // 触发任意需要鉴权的请求（这里直接调 wxLogin 不会附带 token，因为是匿名路由；
    // 改用 mock 一段 getProfile 测试 ?token= 注入逻辑）
    const { getProfile } = await import("./api")
    await getProfile("main")
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("?token=tok-exist")
  })

  it("401 业务码：清本地态 + reLaunch login", async () => {
    useAuth.getState().setSession("tok-x", {
      id: "u-1",
      email: "wx_x@placeholder.local",
      locale: "zh-CN",
      credits: 10000,
    })
    requestMock.mockResolvedValue({
      statusCode: 401,
      data: { code: 40101, message: "未登录或登录已过期" },
    })
    const { getProfile } = await import("./api")
    await expect(getProfile("main")).rejects.toBeInstanceOf(ApiErrorClass)
    expect(useAuth.getState().accessToken).toBeNull()
    expect(reLaunchMock).toHaveBeenCalledWith({ url: "/pages/login/index" })
  })

  it("业务错误码：抛 ApiErrorClass 携带 code + message + details", async () => {
    requestMock.mockResolvedValue({
      statusCode: 400,
      data: { code: 40008, message: "微信登录失败（40029）", details: { hint: "invalid code" } },
    })
    await expect(wxLogin("bad-code")).rejects.toMatchObject({
      code: 40008,
      message: "微信登录失败（40029）",
      details: { hint: "invalid code" },
    })
  })

  it("5xx：抛 ApiErrorClass（fallback 状态码）", async () => {
    requestMock.mockResolvedValue({
      statusCode: 503,
      data: { code: 50303, message: "微信小程序服务未配置" },
    })
    await expect(wxLogin("any")).rejects.toMatchObject({ code: 50303 })
  })
})
