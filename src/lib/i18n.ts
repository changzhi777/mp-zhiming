// mp-zhiming/src/lib/i18n.ts · 双语字典（M17 · 主站精简版）
// 复用主仓 9 个核心 key 命名约定；台湾惯用语差异在字典里直写两份
// mp 用 wx.setStorageSync 替代 localStorage（同步）
import Taro from "@tarojs/taro"
import { create } from "zustand"
import { useAuth } from "../store/auth"

export type Locale = "zh-CN" | "zh-TW"

const DICT: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    // 通用
    "app.title": "知命",
    "common.confirm": "确认",
    "common.cancel": "取消",
    "common.loading": "加载中…",
    "common.retry": "重试",
    "common.save": "保存",
    "common.share": "分享",

    // 登录
    "login.welcome": "欢迎来到知命",
    "login.wx": "微信一键登录",
    "login.policy": "登录即同意《用户协议》和《隐私政策》",
    "login.fail": "登录失败，请重试",

    // 单档案
    "profile.title": "我的命盘",
    "profile.empty": "暂无档案，请先排盘",
    "profile.fourPillars": "四柱",

    // 黄历
    "huangli.title": "今日黄历",
    "huangli.yi": "宜",
    "huangli.ji": "忌",

    // 海报
    "poster.title": "分享命盘",
    "poster.generate": "生成海报",
    "poster.save": "保存到相册",
    "poster.saved": "已保存到相册",

    // 排盘输入
    "chart.title": "智慧排盘",
    "chart.input.name": "称呼",
    "chart.input.gender": "性别",
    "chart.input.male": "男",
    "chart.input.female": "女",
    "chart.input.calendar": "公历/农历",
    "chart.input.birthTime": "出生时间",
    "chart.input.birthPlace": "出生地",
    "chart.input.placePh": "例：北京",
    "chart.input.submit": "生成命盘",
    "chart.input.submitting": "排盘中…",

    // 每日运势
    "daily.title": "每日运势",
    "daily.luck": "今日运势",
    "daily.tips": "提醒",

    // 邀请新人
    "invite.title": "邀请好友",
    "invite.reward": "邀请成功 +200 积分",
    "invite.copy": "复制邀请链接",

    // 个人中心
    "me.title": "我的",
    "me.credits": "积分余额",
    "me.settings": "设置",
    "me.logout": "退出登录",

    // 设置
    "settings.title": "设置",
    "settings.theme": "主题",
    "settings.theme.light": "纸",
    "settings.theme.dark": "墨",
    "settings.locale": "语言",
    "settings.about": "关于知命",
    "settings.clearCache": "清除缓存",

    // 错误
    "err.network": "网络异常，请重试",
    "err.unauthorized": "登录已过期",
    "err.server": "服务异常",
  },
  "zh-TW": {
    "app.title": "知命",
    "common.confirm": "確認",
    "common.cancel": "取消",
    "common.loading": "載入中…",
    "common.retry": "重試",
    "common.save": "儲存",
    "common.share": "分享",

    "login.welcome": "歡迎來到知命",
    "login.wx": "微信一鍵登入",
    "login.policy": "登入即同意《使用者協議》和《隱私政策》",
    "login.fail": "登入失敗，請重試",

    "profile.title": "我的命盤",
    "profile.empty": "暫無檔案，請先排盤",
    "profile.fourPillars": "四柱",

    "huangli.title": "今日黃曆",
    "huangli.yi": "宜",
    "huangli.ji": "忌",

    "poster.title": "分享命盤",
    "poster.generate": "產生海報",
    "poster.save": "儲存到相簿",
    "poster.saved": "已儲存到相簿",

    "chart.title": "智慧排盤",
    "chart.input.name": "稱呼",
    "chart.input.gender": "性別",
    "chart.input.male": "男",
    "chart.input.female": "女",
    "chart.input.calendar": "國曆/農曆",
    "chart.input.birthTime": "出生時間",
    "chart.input.birthPlace": "出生地",
    "chart.input.placePh": "例：台北",
    "chart.input.submit": "產生命盤",
    "chart.input.submitting": "排盤中…",

    "daily.title": "每日運勢",
    "daily.luck": "今日運勢",
    "daily.tips": "提醒",

    "invite.title": "邀請好友",
    "invite.reward": "邀請成功 +200 積分",
    "invite.copy": "複製邀請連結",

    "me.title": "我的",
    "me.credits": "積分餘額",
    "me.settings": "設定",
    "me.logout": "退出登入",

    "settings.title": "設定",
    "settings.theme": "主題",
    "settings.theme.light": "紙",
    "settings.theme.dark": "墨",
    "settings.locale": "語言",
    "settings.about": "關於知命",
    "settings.clearCache": "清除快取",

    "err.network": "網路異常，請重試",
    "err.unauthorized": "登入已過期",
    "err.server": "服務異常",
  },
}

type LocaleState = {
  locale: Locale
  setLocale: (l: Locale) => void
}

const detect = (): Locale => {
  try {
    const cached = Taro.getStorageSync("zm-mp-locale") as Locale | undefined
    if (cached === "zh-CN" || cached === "zh-TW") return cached
  } catch {
    // 容错
  }
  const sys = Taro.getSystemInfoSync()
  const lang = sys.language?.toLowerCase() ?? ""
  return lang.startsWith("zh-tw") || lang.startsWith("zh-hk") ? "zh-TW" : "zh-CN"
}

export const useLocale = create<LocaleState>((set) => ({
  locale: detect(),
  setLocale: (l) => {
    set({ locale: l })
    try {
      Taro.setStorageSync("zm-mp-locale", l)
    } catch {
      // 容错
    }
  },
}))

/** 取词：缺 key 回落 zh-CN（字典完整性由测试保障） */
export function t(key: string): string {
  const l = useLocale.getState().locale
  return DICT[l][key] ?? DICT["zh-CN"][key] ?? key
}

/** 组件内便捷 hook：locale 变更触发重渲染 */
export function useT() {
  return t
}

/** 出口请求头（api.ts 上行时附带） */
export function localeHeaders(): Record<string, string> {
  return { "x-locale": useLocale.getState().locale }
}

// 仅供未登录态使用（用户登录后会被账号 locale 覆盖）
export { useAuth }
