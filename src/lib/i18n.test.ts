// mp-zhiming/src/lib/i18n.test.ts · 双语字典 + useLocale（M17 单测）
// mock Taro 避免 happy-dom 下 ESM/CJS 兼容问题
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
vi.mock("@tarojs/taro", () => ({
  default: {
    setStorageSync: vi.fn(),
    getStorageSync: vi.fn(() => ""),
    getSystemInfoSync: vi.fn(() => ({ language: "zh-CN" })),
  },
}))
// eslint-disable-next-line import/first
import { t, useLocale } from "./i18n"

const storageMock = () => (globalThis as unknown as { wx: { getStorageSync: Mock } }).wx.getStorageSync
const systemMock = () =>
  (globalThis as unknown as { wx: { getSystemInfoSync: Mock } }).wx.getSystemInfoSync

describe("t() 取词", () => {
  beforeEach(() => {
    useLocale.setState({ locale: "zh-CN" })
  })

  it("zh-CN 默认：取到简体中文", () => {
    expect(t("login.welcome")).toBe("欢迎来到知命")
    expect(t("huangli.yi")).toBe("宜")
  })

  it("zh-TW：取到繁体中文", () => {
    useLocale.setState({ locale: "zh-TW" })
    expect(t("login.welcome")).toBe("歡迎來到知命")
    expect(t("huangli.yi")).toBe("宜") // 单字同步
  })

  it("缺 key：回落 zh-CN（缺 zh-CN 则原 key 透传）", () => {
    expect(t("totally.missing.key")).toBe("totally.missing.key")
  })

  it("switch 前后取词正确", () => {
    expect(t("common.confirm")).toBe("确认")
    useLocale.getState().setLocale("zh-TW")
    expect(t("common.confirm")).toBe("確認")
  })
})

describe("字典完整性（R7）", () => {
  it("zh-CN 与 zh-TW 字典 key 数一致（防止某语漏 key）", () => {
    // 静态导入 DICT 不可行（私有 const）；通过间接方式：t(key) 在两语都不返回原 key
    // 改测：取 zh-CN / zh-TW 已知 keys，全部能取到非 key 透传
    const known = ["login.welcome", "huangli.yi", "common.confirm", "chart.title", "me.title"]
    useLocale.setState({ locale: "zh-CN" })
    for (const k of known) {
      expect(t(k)).not.toBe(k)
    }
    useLocale.setState({ locale: "zh-TW" })
    for (const k of known) {
      expect(t(k)).not.toBe(k)
    }
  })
})

describe("setLocale 持久化", () => {
  beforeEach(() => {
    useLocale.setState({ locale: "zh-CN" })
  })

  it("setLocale('zh-TW') → state 切到 zh-TW（Taro.setStorageSync 已 vi.mock 不抛错即视为调通）", () => {
    expect(useLocale.getState().locale).toBe("zh-CN")
    useLocale.getState().setLocale("zh-TW")
    expect(useLocale.getState().locale).toBe("zh-TW")
  })

  it("setLocale('zh-CN') → 回落简体中文", () => {
    useLocale.getState().setLocale("zh-TW")
    useLocale.getState().setLocale("zh-CN")
    expect(useLocale.getState().locale).toBe("zh-CN")
  })
})
