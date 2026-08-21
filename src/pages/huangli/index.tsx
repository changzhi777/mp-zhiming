// mp-zhiming/src/pages/huangli/index.tsx · 今日黄历（M17 · P0）
import { Text, View } from "@tarojs/components"
import { useEffect, useState } from "react"
import { getHuangli } from "../../lib/api"
import { t } from "../../lib/i18n"

type Huangli = { 公历: string; 宜: string[]; 忌: string[]; cached?: boolean }

export default function HuangliPage() {
  const [data, setData] = useState<Huangli | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    getHuangli(now.getFullYear(), now.getMonth() + 1, now.getDate())
      .then(setData)
      .catch((e) => setErr(String(e?.message ?? e)))
  }, [])

  if (err) return <CenterErr msg={err} />
  if (!data) return <CenterLoading />

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-2">{t("huangli.title")}</Text>
      <Text className="block text-sm text-muted mb-6">{data.公历}</Text>
      <View className="rounded-xl bg-card-strong border border-rule p-6">
        <View className="mb-5">
          <Text className="block text-sm text-accent font-serif mb-2">{t("huangli.yi")}</Text>
          <View className="flex flex-wrap gap-2">
            {data.宜.map((s) => (
              <View key={s} className="px-3 py-1 rounded bg-card border border-rule">
                <Text className="text-sm text-ink">{s}</Text>
              </View>
            ))}
          </View>
        </View>
        <View>
          <Text className="block text-sm text-muted font-serif mb-2">{t("huangli.ji")}</Text>
          <View className="flex flex-wrap gap-2">
            {data.忌.map((s) => (
              <View key={s} className="px-3 py-1 rounded bg-card border border-rule">
                <Text className="text-sm text-ink">{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function CenterLoading() {
  return (
    <View className="min-h-screen flex items-center justify-center bg-paper">
      <Text className="text-muted">{t("common.loading")}</Text>
    </View>
  )
}

function CenterErr({ msg }: { msg: string }) {
  return (
    <View className="min-h-screen flex items-center justify-center bg-paper px-6">
      <Text className="text-accent text-center">{msg}</Text>
    </View>
  )
}
