// mp-zhiming/src/pages/me/index.tsx · 个人中心（M17 · P2）
// 积分余额（实时 · M16 patchUser 模式）+ 设置入口 + 退出登录
import { View, Text, Button } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useAuth } from "../../store/auth"
import { t } from "../../lib/i18n"

export default function Me() {
  const user = useAuth((s) => s.user)
  const clear = useAuth((s) => s.clear)

  if (!user) {
    return (
      <View className="min-h-screen flex items-center justify-center bg-paper">
        <Text className="text-muted">未登录</Text>
      </View>
    )
  }

  const logout = () => {
    Taro.showModal({
      title: t("me.logout"),
      content: "确定退出登录？",
      success: (r) => {
        if (r.confirm) {
          clear()
          Taro.reLaunch({ url: "/pages/login/index" }).catch(() => {})
        }
      },
    })
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("me.title")}</Text>

      {/* 信息卡 */}
      <View className="rounded-xl bg-card-strong border border-rule p-5 mb-4">
        <Text className="block text-base text-ink">{user.nickname ?? user.realNameMasked ?? "用户"}</Text>
        <Text className="block text-sm text-muted mt-1">{user.email}</Text>
      </View>

      {/* 积分卡 */}
      <View className="rounded-xl bg-card-strong border border-rule p-5 mb-4">
        <Text className="block text-sm text-muted mb-2">{t("me.credits")}</Text>
        <Text className="block text-3xl font-serif text-accent">{user.credits}</Text>
      </View>

      {/* 设置入口 */}
      <View
        className="rounded-xl bg-card border border-rule p-4 mb-3 flex justify-between items-center"
        onClick={() => Taro.navigateTo({ url: "/pages/settings/index" })}
      >
        <Text className="text-ink">{t("me.settings")}</Text>
        <Text className="text-muted">›</Text>
      </View>

      <Button className="w-full mt-6 py-3 bg-card text-accent border border-rule rounded-lg" onClick={logout}>
        {t("me.logout")}
      </Button>
    </View>
  )
}