// mp-zhiming/src/lib/api.ts · fetch wrapper（M17 · R2 优化）
// R2：access token 走 Authorization header（消除 ?token= query 暴露在 URL 日志/历史/反代 access log 的风险）
// 微信 wx.request 2.x 已支持自定义 header → 与 web 主站同款鉴权
// 错误码映射：401 → 清本地态跳 login；其他透传
import Taro from "@tarojs/taro"
import type { AuthUser } from "../store/auth"
import { useAuth } from "../store/auth"

const API_BASE = "https://91zm.com.cn/api/v1" // 生产域名（Caddy 反代）

export type ApiError = { code: number; message: string; details?: unknown }

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = useAuth.getState().accessToken
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (token) headers.authorization = `Bearer ${token}` // R2：header 鉴权
  const res = await Taro.request({
    url,
    method,
    data: body,
    header: headers,
  })
  const data = res.data as unknown
  // 业务错误：HTTP 4xx/5xx + { code, message, details }
  if (res.statusCode >= 400) {
    const err = data as ApiError
    if (err?.code === 40101) {
      useAuth.getState().clear()
      Taro.reLaunch({ url: "/pages/login/index" }).catch(() => {})
    }
    throw new ApiErrorClass(err?.code ?? res.statusCode, err?.message ?? "请求失败", err?.details)
  }
  return data as T
}

export class ApiErrorClass extends Error {
  readonly code: number
  readonly details?: unknown
  constructor(code: number, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.details = details
  }
}

/** 微信一键登录（M17 阶段 1 后端契约） */
export const wxLogin = (code: string) =>
  request<{ accessToken: string; user: AuthUser }>("POST", "/auth/wx-login", { code })

/** 当前用户 + 主盘 ID（主仓 GET /me，含 mainProfile BirthInput JSON） */
export const getMe = () =>
  request<{
    id: string
    email: string
    locale: string
    credits: number
    mainProfileId: string | null
  }>("GET", "/me")

/** 行政区划（主仓 GET /locations · M4 三级联动） */
export type LocationItem = {
  code: string
  name: string
  parentCode: string | null
  level: number // 1省 2市 3县
  lat: number | null
  lon: number | null
}
export const getLocations = (parentCode?: string, level?: 1 | 2 | 3) => {
  const params = new URLSearchParams()
  if (parentCode) params.set("parentCode", parentCode)
  if (level) params.set("level", String(level))
  const qs = params.toString()
  return request<LocationItem[]>("GET", `/locations${qs ? `?${qs}` : ""}`)
}

/** 单档案详情（主仓 GET /me/profiles/:id） */
export const getProfile = (id: string) =>
  request<{
    id: string
    name: string
    chart: unknown // 引擎盘面（中文键 JSON）
  }>("GET", `/me/profiles/${id}`)

/** 黄历（主仓 GET /huangli） */
export const getHuangli = (y: number, m: number, d: number) =>
  request<{
    公历: string
    宜: string[]
    忌: string[]
    cached: boolean
  }>("GET", `/huangli?year=${y}&month=${m}&day=${d}`)

/** 海报分享链接（主仓 POST /share/links） */
export const createShareLink = (profileId: string) =>
  request<{ key: string; expiresAt: string }>("POST", "/share/links", { profileId })

/** 排盘（主仓 POST /charts） */
export const castChart = (birth: unknown) =>
  request<{
    输入: unknown
    八字: { 四柱: string }
    hourKnown: boolean
    cached: boolean
  }>("POST", "/charts", birth)

/** 每日运势（主仓 GET /daily） */
export const getDaily = (y: number, m: number, d: number) =>
  request<{
    personalized: boolean
    日主?: string
    流日干支?: string
    综合?: "大吉" | "吉" | "平" | "慎"
    提醒?: string
  }>("GET", `/daily?year=${y}&month=${m}&day=${d}`)
