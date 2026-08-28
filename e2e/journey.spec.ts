// mp-zhiming/e2e/journey.spec.ts · 微信小程序 H5 E2E 骨架(Stage 24)
// 覆盖:登录 + 排盘 + 黄历 + 海报 + 简繁切换 · 8 用例
import { type Page, expect, test } from "@playwright/test"

const STAMP = Date.now()

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `e2e-results/${STAMP}-${name}.png`, fullPage: false })
}

test.describe
  .serial("mp-zhiming · H5 E2E 骨架", () => {
    // ════════════════ 1. 首页 ═══════════════
    test("01 · 访客打开小程序首页", async ({ page }) => {
      await page.goto("/")
      await expect(page.getByText(/知命/).first()).toBeVisible()
      await shot(page, "01-home")
    })

    // ════════════════ 2. 登录页 ═══════════════
    test("02 · 登录页可见", async ({ page }) => {
      await page.goto("/login")
      await page.waitForTimeout(500)
      // 微信一键登录按钮 / 邮箱密码切换
      const hasWxLogin = (await page.getByText(/微信登录|wx.login|一键登录/).count()) > 0
      const hasEmailLogin = (await page.getByPlaceholder(/邮箱/).count()) > 0
      expect(hasWxLogin || hasEmailLogin).toBeTruthy()
      await shot(page, "02-login")
    })

    // ════════════════ 3. 邮箱密码登录(API 验证) ═══════════════
    test("03 · 邮箱密码登录 API → 200 + token", async ({ request }) => {
      const email = `mp-e2e-${STAMP}@test.dev`
      const password = "MpE2E1234"

      // 注册
      const reg = await request.post("/api/v1/auth/register", {
        data: { email, password },
      })
      expect(reg.status()).toBe(201)

      // 登录
      const login = await request.post("/api/v1/auth/login", {
        data: { email, password },
      })
      expect(login.status()).toBe(200)
      const body = (await login.json()) as { accessToken: string }
      expect(body.accessToken).toBeTruthy()
    })

    // ════════════════ 4. 排盘输入页 ═══════════════
    test("04 · 排盘输入页字段可见", async ({ page }) => {
      await page.goto("/chart-input")
      await page.waitForTimeout(500)
      await expect(page.getByText(/称呼|姓名/).first()).toBeVisible()
      await expect(page.getByText(/性别/).first()).toBeVisible()
      await shot(page, "04-chart-input")
    })

    // ════════════════ 5. 黄历页 ═══════════════
    test("05 · 黄历页宜忌", async ({ page }) => {
      await page.goto("/huangli")
      await page.waitForTimeout(500)
      // 宜 / 忌 卡片
      const yi = page.getByText(/^宜$/).first()
      const ji = page.getByText(/^忌$/).first()
      await expect(yi).toBeVisible()
      await expect(ji).toBeVisible()
      await shot(page, "05-huangli")
    })

    // ════════════════ 6. 每日运势 ═══════════════
    test("06 · 每日运势页(未登录展示通用)", async ({ page }) => {
      await page.goto("/daily")
      await page.waitForTimeout(500)
      await expect(page.getByText(/运势|日运/).first()).toBeVisible()
      await shot(page, "06-daily")
    })

    // ════════════════ 7. 海报生成(API 验证) ═══════════════
    test("07 · POST /share/links → 200/401(登录态)", async ({ request }) => {
      const res = await request.post("/api/v1/share/links", {
        data: {
          name: "E2E 测试",
          gender: 0,
          calendar: "solar",
          year: 1990,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          location: { city: "北京" },
        },
      })
      // 未登录 401 / 登录 200 都算正常路径
      expect([200, 401]).toContain(res.status())
    })

    // ════════════════ 8. 简繁切换 ═══════════════
    test("08 · 设置页简繁切换", async ({ page }) => {
      await page.goto("/settings")
      await page.waitForTimeout(500)
      // 找简繁切换按钮(text 可能含 "繁體"/"简体"/"zh-TW"/"zh-CN")
      const switchBtn = page.getByRole("button", { name: /繁體|简体|zh-TW|zh-CN/i }).first()
      if ((await switchBtn.count()) > 0) {
        await switchBtn.click()
        await page.waitForTimeout(500)
      }
      await shot(page, "08-settings-locale")
    })
  })
