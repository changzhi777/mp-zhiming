// mp-zhiming/src/pages/invite/index.tsx · 邀请新人（M17 · P2）
// MVP：生成小程序码 + 复制邀请链接（实际二维码 wx.acode.getQRCode 调用主仓 /share/poster）
import { View, Text, Button, Image } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useState } from "react"
import { createShareLink } from "../../lib/api"
import { t } from "../../lib/i18n"

const POSTER_HOST = "https://91zm.com.cn"

export default function Invite() {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    setBusy(true)
    setErr(null)
    try {
      const r = await createShareLink("main")
      const url = `${POSTER_HOST}/api/v1/share/poster?key=${r.key}&lang=zh-CN&invite=1`
      setQrUrl(url)
      setLink(url)
    } catch (e) {
      setErr(String(e?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await Taro.setClipboardData({ data: link })
      await Taro.showToast({ title: t("common.save"), icon: "success" })
    } catch (e) {
      console.error("[copy]", e)
    }
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-2">{t("invite.title")}</Text>
      <Text className="block text-sm text-accent mb-6">{t("invite.reward")}</Text>

      <View className="rounded-xl bg-card-strong border border-rule p-6 mb-6">
        {qrUrl ? (
          <Image src={qrUrl} mode="widthFix" className="w-full rounded" showMenuByLongpress />
        ) : (
          <View className="h-64 flex items-center justify-center bg-card rounded">
            <Text className="text-muted text-sm">{t("common.loading")}</Text>
          </View>
        )}
      </View>

      {err && <Text className="block mb-4 text-sm text-accent text-center">{err}</Text>}

      <Button
        className="w-full py-3 bg-accent text-white rounded-lg mb-3"
        loading={busy}
        disabled={busy}
        onClick={generate}
      >
        {qrUrl ? "重新生成" : "生成邀请二维码"}
      </Button>
      {link && (
        <Button className="w-full py-3 bg-card-strong text-ink border border-rule rounded-lg" onClick={copy}>
          {t("invite.copy")}
        </Button>
      )}
    </View>
  )
}