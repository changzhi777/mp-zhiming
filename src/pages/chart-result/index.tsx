// mp-zhiming/src/pages/chart-result/index.tsx · 排盘结果（M17 · P1）
// 引擎盘面（中文键 JSON）直接渲染：四柱 + 五行分值；MVP 不渲染完整大运/神煞
import { Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useEffect, useState } from "react"
import { t } from "../../lib/i18n"

type Chart = {
  输入?: unknown
  八字?: { 四柱: string; 日主?: string; 天干?: string[]; 地支?: string[] }
  hourKnown?: boolean
  cached?: boolean
}

const WUXING: Record<string, string> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
}
const WX_COLOR: Record<string, string> = {
  木: "text-[#3a8d4e]",
  火: "text-accent",
  土: "text-gold",
  金: "text-muted",
  水: "text-link",
}

export default function ChartResult() {
  const [chart, setChart] = useState<Chart | null>(null)

  useEffect(() => {
    const c = Taro.getStorageSync("zm-mp-last-chart") as Chart | undefined
    if (c) setChart(c)
  }, [])

  if (!chart) {
    return (
      <View className="min-h-screen flex items-center justify-center bg-paper">
        <Text className="text-muted">{t("common.loading")}</Text>
      </View>
    )
  }

  const pillars = chart.八字?.四柱?.split(" ") ?? []
  const riZhu = chart.八字?.日主 ?? ""
  const wuxingCount: Record<string, number> = {}
  for (const p of pillars) {
    for (const ch of p) {
      const wx = WUXING[ch]
      if (wx) wuxingCount[wx] = (wuxingCount[wx] ?? 0) + 1
    }
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-2">{t("chart.title")}</Text>
      <Text className="block text-sm text-muted mb-6">
        日主：{riZhu} {chart.cached && "(cached)"}
      </Text>

      {/* 四柱 */}
      <View className="rounded-xl bg-card-strong border border-rule p-5 mb-4">
        <Text className="block text-sm text-muted mb-3">{t("profile.fourPillars")}</Text>
        <View className="flex justify-between">
          {pillars.length === 4 ? (
            pillars.map((p, i) => (
              <View key={p} className="flex-1 text-center">
                <Text className="block text-xs text-muted">{["年", "月", "日", "时"][i]}</Text>
                <Text className="block mt-1 text-xl font-serif text-ink">{p}</Text>
              </View>
            ))
          ) : (
            <Text className="text-muted">{t("profile.empty")}</Text>
          )}
        </View>
      </View>

      {/* 五行分值 */}
      <View className="rounded-xl bg-card-strong border border-rule p-5">
        <Text className="block text-sm text-muted mb-3">五行</Text>
        <View className="flex justify-between">
          {Object.entries(wuxingCount).map(([wx, n]) => (
            <View key={wx} className="flex-1 text-center">
              <Text className={`block text-lg font-serif ${WX_COLOR[wx] ?? "text-ink"}`}>{wx}</Text>
              <Text className="block text-xs text-muted mt-1">{n}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
