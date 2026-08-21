// mp-zhiming/src/pages/daily/index.tsx · 每日运势（M17 · P1）
import { View, Text } from "@tarojs/components"
import { useEffect, useState } from "react"
import { getDaily } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { t } from "../../lib/i18n"

type Daily = {
  personalized: boolean
  日主?: string
  流日干支?: string
  综合?: "大吉" | "吉" | "平" | "慎"
  提醒?: string
  needProfile?: boolean
}

const LUCK_COLOR: Record<string, string> = {
  大吉: "text-accent",
  吉: "text-[#3a8d4e]",
  平: "text-muted",
  慎: "text-[#a85050]",
}

export default function DailyPage() {
  const user = useAuth((s) => s.user)
  const [data, setData] = useState<Daily | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    getDaily(now.getFullYear(), now.getMonth() + 1, now.getDate())
      .then(setData)
      .catch((e) => setErr(String(e?.message ?? e)))
  }, [])

  if (err) {
    return (
      <View className="min-h-screen flex items-center justify-center bg-paper px-6">
        <Text className="text-accent text-center">{err}</Text>
      </View>
    )
  }
  if (!data) {
    return (
      <View className="min-h-screen flex items-center justify-center bg-paper">
        <Text className="text-muted">{t("common.loading")}</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-2">{t("daily.title")}</Text>
      <Text className="block text-sm text-muted mb-6">
        {data.personalized ? `日主 ${data.日主 ?? ""} · ${data.流日干支 ?? ""}` : "通用黄历"}
      </Text>

      {data.needProfile && (
        <View className="rounded-lg bg-card border border-rule p-4 mb-4">
          <Text className="text-sm text-muted">绑定主盘后可看个性化运势</Text>
        </View>
      )}

      {data.综合 && (
        <View className="rounded-xl bg-card-strong border border-rule p-6 mb-4">
          <Text className="block text-sm text-muted mb-2">{t("daily.luck")}</Text>
          <Text className={`block text-4xl font-serif ${LUCK_COLOR[data.综合] ?? "text-ink"}`}>
            {data.综合}
          </Text>
        </View>
      )}

      {data.提醒 && (
        <View className="rounded-xl bg-card border border-rule p-5">
          <Text className="block text-sm text-muted mb-2">{t("daily.tips")}</Text>
          <Text className="text-ink leading-relaxed">{data.提醒}</Text>
        </View>
      )}
    </View>
  )
}