// mp-zhiming/src/pages/profile/index.tsx · 单档案盘面（M17 · P0）
// 精简版：四柱 + 五行；MVP 阶段只展示主盘（M2 主盘绑定）
import { Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useEffect, useState } from "react"
import { getProfile } from "../../lib/api"
import { t } from "../../lib/i18n"
import { useAuth } from "../../store/auth"

type Chart = { 输入?: unknown; 八字?: { 四柱: string }; hourKnown?: boolean }
type Profile = { id: string; name: string; chart: Chart } | null

export default function ProfilePage() {
  const user = useAuth((s) => s.user)
  const [profile, setProfile] = useState<Profile>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      Taro.reLaunch({ url: "/pages/login/index" }).catch(() => {})
      return
    }
    // MVP：先拉 mainProfile（M2 主盘 ID = user.id 衍生；本期用硬编码 mainProfileId 占位）
    // 阶段 3.5 排盘输入落地后，从 user.mainProfile 取真实 ID
    getProfile("main")
      .then((p) => setProfile(p as Profile))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [user])

  if (err) return <CenterErr msg={err} />
  if (!profile) return <CenterLoading />

  const pillars = profile.chart?.八字?.四柱?.split(" ") ?? []

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("profile.title")}</Text>
      <View className="rounded-xl bg-card-strong border border-rule p-6">
        <Text className="block text-xl text-ink mb-4">{profile.name}</Text>
        <Text className="block text-sm text-muted mb-3">{t("profile.fourPillars")}</Text>
        <View className="flex justify-between">
          {pillars.length === 4 ? (
            pillars.map((p, i) => (
              <View key={p} className="flex-1 text-center">
                <Text className="block text-xs text-muted">{["年", "月", "日", "时"][i]}</Text>
                <Text className="block mt-1 text-lg font-serif text-ink">{p}</Text>
              </View>
            ))
          ) : (
            <Text className="text-muted">{t("profile.empty")}</Text>
          )}
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
