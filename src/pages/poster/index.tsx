// mp-zhiming/src/pages/poster/index.tsx · 海报分享（M17 · P0 + C1 优化）
// generate → createShareLink 拿 key → wx.downloadFile 取 tempFilePath → saveImageToPhotosAlbum
import { Button, Image, Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useState } from "react"
import { createShareLink } from "../../lib/api"
import { t } from "../../lib/i18n"
import { useAuth } from "../../store/auth"

const POSTER_HOST = "https://91zm.com.cn"

export default function PosterPage() {
  const mainProfileId = useAuth((s) => s.mainProfileId)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [localPath, setLocalPath] = useState<string | null>(null)
  const [expireAt, setExpireAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
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
      const url = `${POSTER_HOST}/api/v1/share/poster?key=${r.key}&lang=zh-CN`
      setPosterUrl(url)
      setExpireAt(r.expiresAt)
      // 同步下载到本地（用于保存相册 + 离线预览）
      const dl = await Taro.downloadFile({ url })
      if (dl.statusCode === 200) {
        setLocalPath(dl.tempFilePath)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!posterUrl) return
    try {
      await Taro.setClipboardData({ data: posterUrl })
      await Taro.showToast({ title: t("common.save"), icon: "success" })
    } catch (e) {
      console.error("[copy]", e)
    }
  }

  const saveToAlbum = async () => {
    if (!localPath) {
      setErr("请先生成海报")
      return
    }
    setSaving(true)
    setErr(null)
    try {
      // 微信小程序需先申请相册权限
      await Taro.authorize({ scope: "scope.writePhotosAlbum" })
      await Taro.saveImageToPhotosAlbum({ filePath: localPath })
      await Taro.showToast({ title: t("poster.saved"), icon: "success" })
    } catch (e) {
      // 用户拒绝授权 → 引导打开设置
      if (e instanceof Error && e.message.includes("auth deny")) {
        Taro.showModal({
          title: "需要相册权限",
          content: "保存海报需要相册写入权限",
          confirmText: "去设置",
          success: (r) => {
            if (r.confirm) Taro.openSetting().catch(() => {})
          },
        })
        return
      }
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("poster.title")}</Text>

      <View className="rounded-xl bg-card-strong border border-rule p-6 mb-6">
        {localPath || posterUrl ? (
          <Image src={localPath ?? posterUrl ?? ""} mode="widthFix" className="w-full rounded" />
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
        {posterUrl ? "重新生成" : t("poster.generate")}
      </Button>
      {localPath && (
        <Button
          className="w-full py-3 bg-accent text-white rounded-lg mb-3"
          loading={saving}
          disabled={saving}
          onClick={saveToAlbum}
        >
          {t("poster.save")}
        </Button>
      )}
      {posterUrl && (
        <Button
          className="w-full py-3 bg-card-strong text-ink border border-rule rounded-lg"
          onClick={copy}
        >
          {t("common.share")}
        </Button>
      )}
    </View>
  )
}
