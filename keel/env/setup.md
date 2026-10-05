---
scope: env
status: active
last-verified: 2026-10-05
keywords: [环境, corepack, pnpm, 沙箱, 密钥]
---

# 本地 / CI 环境

## 运行时与包管理

- **无全局 pnpm**：一律 `corepack pnpm@11.3.0 <script>`；提交 shim 见
  skills/no-global-pnpm-commit.md。
- Node：跟随仓库 `package.json` engines / CI（如需锁版本在此登记）。

## 已知环境限制（非仓库缺陷）

- 宿主沙箱里根 `build` 与 `test:coverage` 跑不了（safe-delete 守卫，>50 文件阈值）⇒
  替代：逐包 `tsup` + 分包跑测试（坑 `sandbox-safe-delete-block`）；
- 后台跑测会丢 broker socket ⇒ 前台 + 显式路径。

## 密钥与网络

- 无密钥需求（零外部依赖原则；工程化工具除外）；
- CI 与发布工作流见 `.github/workflows/`。

## mock 约定

- 无外部服务 mock；e2e 用本地构建产物（`e2e/playwright.config.ts`）。
