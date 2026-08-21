// mp-zhiming/src/app.tsx · Taro 入口（M17）
// 启动 wx.login 静默尝试（已登录拿 token 走 /auth/wx-login → 跳 profile；未登录跳 login）
import { useLaunch } from "@tarojs/taro"
import { useEffect } from "react"
import { silentLogin } from "./store/auth"

export default function App() {
  useLaunch(() => {
    console.log("[mp-zhiming] launched · v0.1.0")
  })

  useEffect(() => {
    silentLogin().catch(() => {
      // 未登录跳 login 是路由层的事（src/pages/login/index）
    })
  }, [])

  return null
}
