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
const {
  wxLogin,
  getMe,
  getProfile,
  getHuangli,
  createShareLink,
  castChart,
  getDaily,
  getLocations,
} = await import("./api")

/** 顶层 helper：模拟成功响应 */
const ok = (data: unknown) => requestMock.mockResolvedValue({ statusCode: 200, data })

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

  it("有 token 时附加 Authorization header（R2：消除 ?token= query 泄露）", async () => {
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
    const { getProfile } = await import("./api")
    await getProfile("main")
    const call = requestMock.mock.calls[0][0] as { url: string; header: Record<string, string> }
    expect(call.url).not.toContain("?token=")
    expect(call.header.authorization).toBe("Bearer tok-exist")
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

  it("R6：HTTP 500 无 body 时抛兜底 ApiError（err.code 用 statusCode）", async () => {
    requestMock.mockResolvedValue({
      statusCode: 500,
      data: null,
    })
    await expect(wxLogin("any")).rejects.toMatchObject({
      code: 500,
      message: "请求失败",
    })
  })
})

describe("5 个业务 API 函数（getMe/getProfile/getHuangli/createShareLink/castChart/getDaily）", () => {
  beforeEach(() => {
    requestMock.mockReset()
    reLaunchMock.mockReset()
    useAuth.setState({ accessToken: null, user: null })
  })

  afterEach(() => vi.clearAllMocks())

  it("getMe：GET /me → 返 { id, email, locale, credits, mainProfileId }", async () => {
    ok({ id: "u-1", email: "wx_x@x.dev", locale: "zh-CN", credits: 10000, mainProfileId: null })
    const r = await getMe()
    expect(r.id).toBe("u-1")
    expect(r.mainProfileId).toBeNull()
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("/me")
    expect(url).not.toContain("?token=")
  })

  it("getProfile(id)：GET /me/profiles/:id → 返 { id, name, chart }", async () => {
    ok({ id: "p-1", name: "测试盘", chart: { 八字: { 四柱: "甲子 乙丑" } } })
    const r = await getProfile("p-1")
    expect(r.name).toBe("测试盘")
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("/me/profiles/p-1")
  })

  it("getHuangli(y,m,d)：GET /huangli?year&month&day → 返 { 公历, 宜, 忌 }", async () => {
    ok({ 公历: "1990年3月15日", 宜: ["祭祀"], 忌: ["动土"], cached: false })
    const r = await getHuangli(1990, 3, 15)
    expect(r.公历).toContain("1990")
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("year=1990")
    expect(url).toContain("month=3")
    expect(url).toContain("day=15")
  })

  it("createShareLink(profileId)：POST /share/links → 返 { key, expiresAt }", async () => {
    ok({ key: "abc-key", expiresAt: "2026-09-01T00:00:00Z" })
    const r = await createShareLink("main")
    expect(r.key).toBe("abc-key")
    const call = requestMock.mock.calls[0][0] as { url: string; method: string; data: unknown }
    expect(call.url).toContain("/share/links")
    expect(call.method).toBe("POST")
    expect(call.data).toEqual({ profileId: "main" })
  })

  it("castChart(birth)：POST /charts → 返 { 八字, hourKnown, cached }", async () => {
    ok({ 输入: {}, 八字: { 四柱: "甲子 乙丑 丙寅 丁卯" }, hourKnown: true, cached: false })
    const r = await castChart({ calendar: "solar", year: 1990, month: 3, day: 15 })
    expect(r.八字.四柱).toContain("甲子")
    const call = requestMock.mock.calls[0][0] as { url: string; method: string }
    expect(call.url).toContain("/charts")
    expect(call.method).toBe("POST")
  })

  it("getDaily(y,m,d)：GET /daily?year&month&day → 返 { personalized, 综合 }", async () => {
    ok({ personalized: true, 日主: "甲", 流日干支: "乙", 综合: "大吉" })
    const r = await getDaily(2026, 8, 22)
    expect(r.personalized).toBe(true)
    expect(r.综合).toBe("大吉")
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("/daily?year=2026")
  })
})

describe("getLocations（C3 行政区划联动）", () => {
  beforeEach(() => {
    requestMock.mockReset()
    useAuth.setState({ accessToken: null, user: null })
  })

  it("无参数：GET /locations", async () => {
    requestMock.mockResolvedValue({
      statusCode: 200,
      data: [{ code: "11", name: "北京市", parentCode: null, level: 1, lat: 39.9, lon: 116.4 }],
    })
    const r = await getLocations()
    expect(r.length).toBe(1)
    expect(r[0].name).toBe("北京市")
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("/locations")
    expect(url).not.toContain("?")
  })

  it("带 parentCode + level：GET /locations?parentCode=11&level=2", async () => {
    requestMock.mockResolvedValue({
      statusCode: 200,
      data: [
        { code: "1101", name: "市辖区", parentCode: "11", level: 2, lat: 39.9, lon: 116.4 },
        { code: "1102", name: "县", parentCode: "11", level: 2, lat: null, lon: null },
      ],
    })
    const r = await getLocations("11", 2)
    expect(r.length).toBe(2)
    const url = (requestMock.mock.calls[0][0] as { url: string }).url
    expect(url).toContain("parentCode=11")
    expect(url).toContain("level=2")
  })
})

// ── 错误码矩阵（Stage 3.6 · 借鉴 Payload CMS 测试矩阵）────────
describe("错误码矩阵（401/403/429/500）", () => {
  beforeEach(() => {
    requestMock.mockReset()
    reLaunchMock.mockReset()
    useAuth.setState({ accessToken: null, user: null })
  })

  afterEach(() => vi.clearAllMocks())

  it("401 + WWW-Authenticate 头：401 响应被识别为鉴权失败 → 清态跳 login", async () => {
    // R3 Stage3.6：服务端现在 401 必带 WWW-Authenticate: Bearer realm=zhiming
    // 客户端需正确识别（不只是 body code）
    useAuth.getState().setSession("tok-z", {
      id: "u-1",
      email: "wx_x@placeholder.local",
      locale: "zh-CN",
      credits: 10000,
    })
    requestMock.mockResolvedValue({
      statusCode: 401,
      data: { code: 40101, message: "未登录或登录已过期" },
      header: { "WWW-Authenticate": 'Bearer realm="zhiming"' },
    })
    const { getProfile } = await import("./api")
    await expect(getProfile("main")).rejects.toBeInstanceOf(ApiErrorClass)
    expect(useAuth.getState().accessToken).toBeNull()
    expect(reLaunchMock).toHaveBeenCalledWith({ url: "/pages/login/index" })
  })

  it("403 ADMIN_REQUIRED：非管理员访问管理接口 → 透传 ApiErrorClass(code=40302)", async () => {
    requestMock.mockResolvedValue({
      statusCode: 403,
      data: { code: 40302, message: "非管理员" },
    })
    await expect(getMe()).rejects.toMatchObject({
      code: 40302,
      message: "非管理员",
    })
    // 403 ≠ 401，不清态不跳 login
    expect(reLaunchMock).not.toHaveBeenCalled()
  })

  it("429 RATE 限流：透传 ApiErrorClass(code=42901) + 不清态", async () => {
    requestMock.mockResolvedValue({
      statusCode: 429,
      data: { code: 42901, message: "请求过于频繁，请稍后再试" },
    })
    useAuth.getState().setSession("tok-rl", {
      id: "u-1",
      email: "wx_x@placeholder.local",
      locale: "zh-CN",
      credits: 10000,
    })
    await expect(getProfile("main")).rejects.toMatchObject({ code: 42901 })
    // 限流不清态
    expect(useAuth.getState().accessToken).toBe("tok-rl")
    expect(reLaunchMock).not.toHaveBeenCalled()
  })

  it("500 ENGINE_FAIL：兜底 ApiError，state 不变", async () => {
    requestMock.mockResolvedValue({
      statusCode: 500,
      data: { code: 50001, message: "服务器内部错误" },
    })
    useAuth.getState().setSession("tok-500", {
      id: "u-1",
      email: "wx_x@placeholder.local",
      locale: "zh-CN",
      credits: 10000,
    })
    await expect(castChart({})).rejects.toMatchObject({ code: 50001 })
    // 5xx ≠ 401，token 保留
    expect(useAuth.getState().accessToken).toBe("tok-500")
    expect(reLaunchMock).not.toHaveBeenCalled()
  })
})
