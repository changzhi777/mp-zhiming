# mp-zhiming

> 知命主站精简版微信小程序 · M17 · Taro 3 + React 19 + Tailwind 4

主仓：`https://github.com/changzhi777/zhiming`（v0.3.12 · 282 用例 · 92.8% 覆盖率）

## 项目状态

- **计划**：[`.zcf-plan-mp-m17.md`](https://github.com/changzhi777/zhiming/blob/main/.zcf/plan/current/mp-m17.md)
- **进度**：阶段 0（仓桥接）· 阶段 1（后端 wx-login）待启动
- **工期**：6-8 周（1 人）
- **目标**：10 页 MVP 体验版上线

## 开发

```bash
# 同步共享契约（首次或主仓 packages/shared 变更后）
pnpm sync:shared

# 安装依赖
pnpm install

# 启动微信开发者工具（需先安装微信开发者工具）
pnpm dev

# 类型检查 + 测试
pnpm typecheck
pnpm test
pnpm test:coverage
```

## 工程结构

```
mp-zhiming/
├── vendor/zhiming/        # 软链主仓 monorepo（git clone --depth=1）
├── src/                   # 小程序源码（10 页 + components + store + lib）
├── tests/                 # Vitest 单测
├── config/                # Taro/Tailwind/PostCSS 配置
├── pnpm-workspace.yaml    # 工作区（vendor/zhiming/packages/shared）
└── .github/workflows/     # CI 配置
```

## 与主仓关系

- **API 层**：100% 复用主仓 server（`apps/server`，3000 端口 · 25+ 端点）
- **UI 层**：100% 复用主仓 token（纸/墨双主题 · 9pt 间距）
- **共享契约**：通过 `vendor/zhiming/packages/shared` 软链（不复制）
- **唯一新增**：主仓 `POST /auth/wx-login` 一路由

## 提审策略

- **阶段 A**：个人号体验版（5 类限制 · 不能含虚拟支付）
- **阶段 B**：企业号认证升级（1-2 周 · 营业执照+对公账户）
- **阶段 C**：生产版灰度发布

## 维护者

常智 · 2026-08-22