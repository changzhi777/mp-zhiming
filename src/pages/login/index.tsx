// mp-zhiming/src/pages/login/index.tsx · 微信一键登录（M17 · P0）
import { Button, Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useState } from "react"
import { wxLogin } from "../../lib/api"
import { t } from "../../lib/i18n"
import { useAuth } from "../../store/auth"

export default function Login() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleWxLogin = async () => {
    setBusy(true)
    setErr(null)
    try {
      const { code } = await Taro.login()
      const { accessToken, user } = await wxLogin(code)
      useAuth.getState().setSession(accessToken, user)
      await Taro.reLaunch({ url: "/pages/profile/index" })
    } catch (e) {
      setErr(t("login.fail"))
      console.error("[login] 失败", e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="min-h-screen flex flex-col items-center justify-center bg-paper px-8">
      <View className="mb-12 text-center">
        <Text className="text-4xl font-serif text-ink">{t("app.title")}</Text>
        <Text className="block mt-3 text-base text-muted">{t("login.welcome")}</Text>
      </View>
      <Button
        className="w-full max-w-sm py-4 bg-accent text-white rounded-lg text-base"
        loading={busy}
        disabled={busy}
        onClick={handleWxLogin}
      >
        {t("login.wx")}
      </Button>
      {err && <Text className="block mt-4 text-sm text-accent">{err}</Text>}
      <Text className="block mt-8 text-xs text-muted text-center">{t("login.policy")}</Text>
    </View>
  )
}
