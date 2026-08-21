// mp-zhiming/src/lib/i18n.test.ts · 双语字典 + useLocale（M17 单测）
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, useLocale, type Locale } from "./i18n"

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

describe("setLocale 持久化", () => {
  let setStorageSync: ReturnType<typeof vi.fn>
  let getStorageSync: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setStorageSync = vi.fn()
    getStorageSync = vi.fn(() => "")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).wx = { setStorageSync, getStorageSync }
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).wx
  })

  it("setLocale('zh-TW') → 调 wx.setStorageSync + state 切到 zh-TW", () => {
    useLocale.getState().setLocale("zh-TW")
    expect(setStorageSync).toHaveBeenCalledWith("zm-mp-locale", "zh-TW")
    expect(useLocale.getState().locale).toBe("zh-TW")
  })
})