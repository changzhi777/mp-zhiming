# mp-zhiming · 阶段 6 提审 Checklist（M17）

> **创建时间**：2026-08-22T10:50+08:00 · **状态**：待用户本地执行 · **完成度**：0/12

---

## 一、个人号体验版（30 分钟）

### Step 1：私钥准备
- [ ] 微信开发者工具 → 设置 → 安全 → 小程序代码上传密钥 → 启用 → 重置
- [ ] 下载 `private.key`
- [ ] base64 编码：`base64 -i private.key > private.key.b64`
- [ ] 放到 `scripts/private.key`（**不入仓**）
- [ ] （可选）GitHub Settings → Secrets → 添加 `MP_PRIVATE_KEY_BASE64`

### Step 2：本地 build + 预览
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm build:weapp` → 验证 dist/ 13 文件齐全
- [ ] `pnpm test:coverage` → 验证 90.53% 覆盖率
- [ ] `pnpm lint` → 验证 biome 0 错

### Step 3：miniprogram-ci 一键预览
- [ ] `pnpm mp:preview` → 生成 `./preview.png` 二维码
- [ ] 微信扫码 → 真机预览 7 页功能
- [ ] 重点验证：
  - [ ] login 页（wx.login mock 可触发）
  - [ ] profile 页（mainProfileId 流程）
  - [ ] huangli 页（GET /huangli）
  - [ ] poster 页（canvas 保存相册）
  - [ ] chart-input → chart-result（行政区划联动）
  - [ ] daily / invite / me / settings

### Step 4：上传体验版
- [ ] `pnpm mp:upload` → 公众平台版本管理生效
- [ ] 公众平台 → mp-zhiming → 版本管理 → 设为体验版
- [ ] 手机扫码 → 体验版路径测试

### Step 5：5 类限制自检（个人号）
- [ ] **无支付按钮**（充值 / 购买 / 订阅）
- [ ] **无诱导分享**（分享到朋友圈等）
- [ ] **无多级分销**（邀请返利需谨慎文案）
- [ ] **无虚拟交易**（虚拟商品/服务）
- [ ] **无特定资质**（医疗/金融等需资质）

---

## 二、CI 自动化（已就位）

### Step 6：GitHub Actions 配密钥
- [ ] GitHub repo → Settings → Secrets and variables → Actions
- [ ] New repository secret：
  - Name：`MP_PRIVATE_KEY_BASE64`
  - Value：`<base64 编码的 private.key>`
- [ ] Workflow 触发（已配 `.github/workflows/mp-ci.yml`）：
  - PR → 自动 build + preview QR artifact
  - main push → 自动 upload 体验版（需手动批准 `mp-zhiming-production` environment）

### Step 7：CI 工作流验证
- [ ] PR 触发：GitHub Actions 跑成功
- [ ] preview-qr-$SHA artifact 可下载
- [ ] 上传触发：需在 GitHub 上批准 environment deployment

---

## 三、企业号认证（1-2 周 · 异步）

### Step 8：准备材料
- [ ] 营业执照（彩色扫描件）
- [ ] 对公账户（开户许可证或银行回执）
- [ ] 法人身份证（正反面）
- [ ] 300 元认证费

### Step 9：提交认证
- [ ] 公众平台 → 设置 → 微信认证 → 企业类型
- [ ] 上传三件材料 + 填写基本信息
- [ ] 支付 300 元
- [ ] 等待 1-2 周审核（可能电话回访）

### Step 10：域名白名单
- [ ] 公众平台 → 开发管理 → 服务器域名
- [ ] request 合法域名：`https://91zm.com.cn`
- [ ] uploadFile / downloadFile 合法域名：同上
- [ ] 隐私协议 URL：`https://91zm.com.cn/privacy`

---

## 四、生产版提审（1 周）

### Step 11：提交审核
- [ ] 公众平台 → 版本管理 → 提交审核
- [ ] 类目选择：工具 → 效率 / 生活服务 → 星座运势
- [ ] 标签：命理 / 八字 / 黄历 / 玄学
- [ ] 测试账号：准备一个测试账号供审核员测试

### Step 12：灰度发布
- [ ] 审核通过 → 灰度发布（5% → 50% → 100%）
- [ ] 监控：错误率 / 用户反馈 / 服务端日志

---

## 五、关键资源链接

| 资源 | 链接 |
|------|------|
| 微信公众平台 | https://mp.weixin.qq.com |
| 微信开发者工具 | https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html |
| miniprogram-ci 文档 | https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html |
| 知命主仓 | https://github.com/changzhi777/zhiming |
| mp-zhiming 仓 | https://github.com/changzhi777/mp-zhiming |
| 主仓部署指南 | `docs/zhiming/m6-launch.md` |
| mp 导入指南 | `docs/import-guide.md`（本仓） |

---

## 六、时间估算

| 阶段 | 工作量 | 累计 |
|------|--------|------|
| Step 1-5 个人号体验版 | 30 分钟 | Day 1 |
| Step 6-7 CI 自动化 | 15 分钟 | Day 1 |
| Step 8-10 企业号认证 | 1-2 周（异步）| Day 3-15 |
| Step 11-12 生产版提审 | 1 周 | Day 15-22 |

---

## 七、风险与回滚

| 风险 | 缓解 |
|------|------|
| 5 类限制自检失败 | 提前用个人号上传体验版验证，避免发布后被驳回 |
| 域名白名单未配置 | 生产版提审前 1 天配置完整 |
| 企业号认证材料问题 | 营业执照 / 法人身份证提前扫描高清件 |
| 类目选择不当 | 参考同类命理小程序（选工具 / 效率）|

---

🤙 **Be water, my friend.** — 水到渠成：从代码到提审，全程 checklist 化。逐项打勾，直到 12/12 完成。