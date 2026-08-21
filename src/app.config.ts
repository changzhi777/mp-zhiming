// mp-zhiming/src/app.config.ts · 小程序 app.json（M17）
// 页面注册 + window 配色（与主仓 token 同源）+ permission 提示
export default {
  pages: [
    "pages/login/index", // 微信一键登录（首启动）
    "pages/profile/index", // 单档案盘面
    "pages/huangli/index", // 今日黄历
    "pages/poster/index", // 海报分享
    "pages/chart-input/index", // 排盘输入
    "pages/chart-result/index", // 排盘结果
    "pages/daily/index", // 每日运势
    "pages/invite/index", // 邀请新人
    "pages/me/index", // 个人中心
    "pages/settings/index", // 设置
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#f6f1e7", // paper
    navigationBarTitleText: "知命",
    navigationBarTextStyle: "black", // ink
    backgroundColor: "#f6f1e7",
  },
  theme: {
    light: {
      navigationBarBackgroundColor: "#f6f1e7",
      navigationBarTextStyle: "black",
    },
    dark: {
      navigationBarBackgroundColor: "#17150f",
      navigationBarTextStyle: "white",
    },
  },
  permission: {
    "scope.userLocation": {
      desc: "用于真太阳时校正（排盘需要）",
    },
  },
  requiredPrivateInfos: ["getLocation"],
  sitemapLocation: "sitemap.json",
}
