// mp-zhiming/src/pages/settings/index.tsx · 设置（M17 · P2）
// 主题切换（纸/墨）+ 语言切换（简/繁）+ 清除缓存 + 关于
import { Button, Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useState } from "react"
import { t, useLocale } from "../../lib/i18n"

export default function Settings() {
  const locale = useLocale((s) => s.locale)
  const setLocale = useLocale((s) => s.setLocale)
  const [themeDark, setThemeDark] = useState(false)

  const toggleTheme = (e: { detail: { value: boolean } }) => {
    const dark = e.detail.value
    setThemeDark(dark)
    // 小程序：page 设 .theme-dark / .theme-light className 切 token
    Taro.setStorageSync("zm-mp-theme", dark ? "dark" : "light")
    Taro.showToast({ title: "主题已切换", icon: "success" })
  }

  const toggleLocale = () => {
    const next = locale === "zh-CN" ? "zh-TW" : "zh-CN"
    setLocale(next)
    Taro.showToast({ title: "语言已切换", icon: "success" })
  }

  const clearCache = () => {
    Taro.showModal({
      title: t("settings.clearCache"),
      content: "确定清除所有缓存？",
      success: (r) => {
        if (r.confirm) {
          try {
            Taro.clearStorageSync()
            Taro.showToast({ title: "已清除", icon: "success" })
          } catch {
            // 容错
          }
        }
      },
    })
  }

  const about = () => {
    Taro.showModal({
      title: t("settings.about"),
      content: "知命 v0.1.0 · M17 · 基于 shunshi-bazi-core 引擎",
      showCancel: false,
    })
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("settings.title")}</Text>

      <Row label={t("settings.theme")}>
        <View className="flex gap-2">
          <View
            className={`px-4 py-2 rounded border ${!themeDark ? "bg-accent text-white border-accent" : "bg-card text-ink border-rule"}`}
            onClick={() => toggleTheme({ detail: { value: false } })}
          >
            <Text>{t("settings.theme.light")}</Text>
          </View>
          <View
            className={`px-4 py-2 rounded border ${themeDark ? "bg-accent text-white border-accent" : "bg-card text-ink border-rule"}`}
            onClick={() => toggleTheme({ detail: { value: true } })}
          >
            <Text>{t("settings.theme.dark")}</Text>
          </View>
        </View>
      </Row>

      <Row label={t("settings.locale")}>
        <Button
          className="px-4 py-2 bg-card border border-rule rounded-lg text-ink"
          onClick={toggleLocale}
        >
          {locale === "zh-CN" ? "简体中文" : "繁體中文"}
        </Button>
      </Row>

      <View
        className="rounded-xl bg-card border border-rule p-4 mb-3 flex justify-between items-center"
        onClick={clearCache}
      >
        <Text className="text-ink">{t("settings.clearCache")}</Text>
        <Text className="text-muted">›</Text>
      </View>

      <View
        className="rounded-xl bg-card border border-rule p-4 mb-3 flex justify-between items-center"
        onClick={about}
      >
        <Text className="text-ink">{t("settings.about")}</Text>
        <Text className="text-muted">›</Text>
      </View>
    </View>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="block text-sm text-muted mb-2">{label}</Text>
      {children}
    </View>
  )
}
