# mp-zhiming · 微信开发者工具导入与发布指南（M17 阶段 6）

> AI辅助导入：CLI 工具全就位，3 步完成。

## 一、前置准备（10 分钟）

1. **下载微信开发者工具**：<https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html>
2. **扫码登录**：用绑定 AppID `wx1000449af2e48fed` 的微信扫码
3. **下载代码上传密钥**（用于 miniprogram-ci）：
   - 微信开发者工具 → 设置 → 安全 → 小程序代码上传密钥 → 启用 → 重置/生成
   - 下载 `private.key` 文件
   - 放到 `scripts/private.key`（参考 `scripts/private.key.example` 说明）

## 二、方式 A：miniprogram-ci CLI（推荐 · 全自动化）

### 2.1 预览（生成体验版二维码）

```bash
cd /Users/mac/Documents/Claude/Projects/mp-zhiming
pnpm mp:preview
# 输出：✓ 预览二维码已生成：./preview.png
# 微信扫码即可在手机预览
```

### 2.2 上传体验版

```bash
pnpm mp:upload
# 输出：✓ 上传成功 subVersion=N
# 然后到微信公众平台 → 版本管理 → 设为体验版
```

### 2.3 自定义版本号/描述

```bash
MP_VERSION="0.2.0" MP_DESC="fix: 修复首页加载" pnpm mp:upload
```

## 三、方式 B：GUI 手动导入（首次）

1. 微信开发者工具 → 小程序 → `+` → 导入项目
2. **项目目录**：`/Users/mac/Documents/Claude/Projects/mp-zhiming`
3. **AppID**：`wx1000449af2e48fed`（自动填入 project.config.json）
4. **项目名称**：`mp-zhiming`
5. **后端服务**：选择"不使用云服务"
6. 点击"导入" → 开发者工具自动编译（dist/ 已存在）

## 四、调试流程

### 4.1 模拟器调试
- 开发者工具左侧"模拟器"标签 → 选择 iPhone 14 / 375×812（移动） 或 iPad（平板）
- 默认进入 `pages/login`（未登录态）→ 微信一键登录（模拟器点"微信一键登录"会触发 wx.login mock）

### 4.2 真机调试
- 开发者工具 → 工具栏 →"预览" → 生成二维码 → 手机扫码
- 或用微信开发者工具 App（iOS/Android）扫码连接

### 4.3 调试网络请求
- 开发者工具 → 工具栏 →"网络"标签 → 可看 request/response
- 域名白名单：`https://91zm.com.cn` 需在公众平台配置（生产版前）

## 五、上传 + 提审

### 5.1 个人号（个人主体）
- 限制：不能含虚拟支付/交易/诱导分享
- 5 类限制自检：参考 [微信小程序个人主体规范](https://developers.weixin.qq.com/miniprogram/product/)
- 本项目已避免：✅ 无支付按钮 / ✅ 无分享朋友圈诱导 / ✅ 无订阅字眼

### 5.2 企业号（推荐 · 1-2 周认证）
- 需：营业执照 + 对公账户 + 法人身份证 + 300 元认证费
- 公众平台 → 设置 → 微信认证 → 企业类型
- 提交后等 1-2 周审核

### 5.3 域名白名单（企业号必配）
- 公众平台 → 开发管理 → 服务器域名
- request 合法域名：`https://91zm.com.cn`
- uploadFile/downloadFile 合法域名：同上

## 六、监控与回滚

### 6.1 版本管理
- 公众平台 → 管理 → 版本管理 → 体验版 / 审核版 / 线上版
- 每个 subVersion 可独立回滚到上一版

### 6.2 日志
- 公众平台 → 运维中心 → 错误日志（生产版生效后）
- 主仓 Admin Phase3 监控（v0.3.7）已就位，可接入 mp 端埋点

### 6.3 回滚命令（如遇问题）
```bash
git revert <problem-commit>
git push origin main
pnpm mp:upload  # 重新上传修复版
```

## 七、CI 自动化（GitHub Actions · 推荐）

`.github/workflows/mp-preview.yml` 示例（待建）：

```yaml
name: Preview Build
on: [pull_request]
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:weapp
      - uses: actions/upload-artifact@v4
        with:
          name: weapp-dist
          path: dist/
```

注：miniprogram-ci 的 preview/upload 需要私钥（GitHub Secret 管理）。

## 八、故障排查

| 现象 | 排查 |
|------|------|
| 编译报错：babel-loader 失败 | 确认 .babelrc.json 已删除（用 esbuild-loader 处理 TS） |
| 网络请求失败 | 域名白名单未配置（公众平台 → 开发管理） |
| 微信登录 50303 | 主仓 .env 缺 WX_APP_ID / WX_APP_SECRET（deploy.sh echo 提醒） |
| 海报保存相册失败 | 微信"相册写入"权限未授权，引导用户 openSetting |
| 行政区划联动空 | /locations 端点未启动（确认主仓 server 进程） |

---

🤙 **Be water, my friend.** — 工具就位，水到渠成。