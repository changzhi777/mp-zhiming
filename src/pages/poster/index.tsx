// mp-zhiming/src/pages/poster/index.tsx · 海报分享（M17 · P0）
// 调用 server /share/links → 拿 key → 用 key 拼 /share/poster?key=&lang= 出图（mp 端 wx.canvasToTempFilePath 处理）
// MVP：本期显示海报链接 + 复制按钮；canvas 渲染留到阶段 3.5 后补
import { Button, Image, Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useState } from "react"
import { createShareLink } from "../../lib/api"
import { t } from "../../lib/i18n"
import { useAuth } from "../../store/auth"

const POSTER_HOST = "https://91zm.com.cn"

export default function PosterPage() {
  const mainProfileId = useAuth((s) => s.mainProfileId)
  const [key, setKey] = useState<string | null>(null)
  const [expireAt, setExpireAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    if (!mainProfileId) {
      setErr("未绑定主盘，请先排盘")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const r = await createShareLink(mainProfileId)
      setKey(r.key)
      setExpireAt(r.expiresAt)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const posterUrl = key ? `${POSTER_HOST}/api/v1/share/poster?key=${key}&lang=zh-CN` : null

  const copyLink = async () => {
    if (!posterUrl) return
    try {
      await Taro.setClipboardData({ data: posterUrl })
      await Taro.showToast({ title: t("common.save"), icon: "success" })
    } catch (e) {
      console.error("[copyLink]", e)
    }
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("poster.title")}</Text>
      <View className="rounded-xl bg-card-strong border border-rule p-6 mb-6">
        {posterUrl ? (
          <Image src={posterUrl} mode="widthFix" className="w-full rounded" />
        ) : (
          <View className="h-64 flex items-center justify-center bg-card rounded">
            <Text className="text-muted text-sm">{t("common.loading")}</Text>
          </View>
        )}
        {expireAt && (
          <Text className="block mt-3 text-xs text-muted text-center">有效期至 {expireAt}</Text>
        )}
      </View>
      {err && <Text className="block mb-4 text-sm text-accent text-center">{err}</Text>}
      <Button
        className="w-full py-3 bg-accent text-white rounded-lg mb-3"
        loading={busy}
        disabled={busy}
        onClick={generate}
      >
        {key ? "重新生成" : t("poster.generate")}
      </Button>
      {posterUrl && (
        <Button
          className="w-full py-3 bg-card-strong text-ink border border-rule rounded-lg"
          onClick={copyLink}
        >
          {t("poster.save")}
        </Button>
      )}
    </View>
  )
}
