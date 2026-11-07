# LytJS v6.9.6 发布包清单

> 版本日期：2026-06-06
> 总计：**76** 个可发布包（按下述分组统计）
>
> 口径变更（2026-09-21）：13 个 `@lytjs/plugin-*` 已迁出至独立仓库 `lytjs-plugins`，
> 不再属于本仓，故 89 → 76。插件清单见本文件末尾「已迁出」一节。
>
> 口径校正（2026-09-21）：此前写 86 个，漏计了 v6.10 起从 core 抽出的
> `@lytjs/config`、`@lytjs/di`、`@lytjs/plugin` 三个独立包；实际 `packages/` 下共 89 个 package.json。

---

## 包分组统计

| 分组               | 数量   | 说明                                         |
| ------------------ | ------ | -------------------------------------------- |
| 核心与运行时       | 14     | 响应式、虚拟 DOM、编译器、渲染、核心 API     |
| 工具层 (tools)     | 3      | CLI、DevTools、测试工具                      |
| 插件层 (plugins)   | 0      | 已迁出至独立仓库 lytjs-plugins               |
| 生态层 (ecosystem) | 25     | Router、SSR、Store、Web 框架、缓存、通用库等 |
| Common 工具包      | 34     | 零依赖通用工具函数                           |
| **总计**           | **76** |                                              |

---

## 1. 核心与运行时（14 个）

@lytjs/web · @lytjs/vdom · @lytjs/shared-types · @lytjs/renderer · @lytjs/reactivity
· @lytjs/host-contract · @lytjs/dom · @lytjs/dom-runtime · @lytjs/core
· @lytjs/core-vnode · @lytjs/core-signal · @lytjs/component · @lytjs/compiler
· @lytjs/adapter-web

## 2. 工具层 tools（3 个）

@lytjs/cli · @lytjs/devtools-extension · @lytjs/test-utils

## 3. 插件层 plugins（0 个）

> **已迁出**：插件源码位于独立仓库 `lytjs-plugins`，本仓不再承载。
> 使用方式不变（`pnpm add @lytjs/plugin-xxx`），但发布流程与版本节奏归该仓管理。
> 详见文末「已迁出的包」一节。

## 4. 生态层 ecosystem（25 个）

### ecosystem 直接子包

@lytjs/ui · @lytjs/store · @lytjs/devtools · @lytjs/bundler · @lytjs/compat
· @lytjs/runtime-edge · @lytjs/platform-adapter · @lytjs/config · @lytjs/di · @lytjs/plugin

### ssr-kit（`ecosystem/packages/ssr-kit/packages/`）

@lytjs/ssr · @lytjs/ssg · @lytjs/html-renderer · @lytjs/cache · @lytjs/cache-isr
· @lytjs/hmr

### web-framework（`ecosystem/packages/web-framework/packages/`）

@lytjs/router · @lytjs/router-fs · @lytjs/api · @lytjs/http-server · @lytjs/metadata
· @lytjs/middleware · @lytjs/middleware-auth · @lytjs/middleware-cors
· @lytjs/middleware-rate-limit

## 5. Common 工具包（34 个）

@lytjs/common · @lytjs/common-is · @lytjs/common-constants · @lytjs/common-string
· @lytjs/common-object · @lytjs/common-error · @lytjs/common-warn · @lytjs/common-events
· @lytjs/common-cache · @lytjs/common-timing · @lytjs/common-algorithm · @lytjs/common-vnode
· @lytjs/common-scheduler · @lytjs/common-dom · @lytjs/common-query · @lytjs/common-dom-helpers
· @lytjs/common-a11y · @lytjs/common-keyboard · @lytjs/common-storage · @lytjs/common-validate
· @lytjs/common-http · @lytjs/common-raf · @lytjs/common-render-queue
· @lytjs/common-event-normalizer · @lytjs/common-node-cache · @lytjs/common-async-scheduler
· @lytjs/common-transition-engine · @lytjs/common-performance · @lytjs/common-assertions
· @lytjs/common-memory · @lytjs/common-env · @lytjs/common-rate-limit · @lytjs/common-security
· @lytjs/common-path

> ⚠️ **其中 16 个已标 deprecated（目标 8.0.0 删除）**：`@lytjs/common`、`@lytjs/common-async-scheduler`、
> `@lytjs/common-dom-helpers`、`@lytjs/common-event-normalizer`、`@lytjs/common-keyboard`、
> `@lytjs/common-memory`、`@lytjs/common-node-cache`、`@lytjs/common-performance`、
> `@lytjs/common-raf`、`@lytjs/common-render-queue`、`@lytjs/common-storage`、
> `@lytjs/common-validate`、`@lytjs/common-warn`、`@lytjs/common-env`、`@lytjs/common-path`、
> `@lytjs/common-timing`。7.x 仍照常发布（数量不变）；npm `deprecated` 标记待有发布权限时执行。
> 见 `keel/decisions/pending/0023-common-dead-packages-deprecation.md`。

---

## 不发布的包（Monorepo 配置包）

以下为 monorepo 配置目录，**不发布到 npm**：

| 路径                                                                 | 说明              |
| -------------------------------------------------------------------- | ----------------- |
| packages/ecosystem/packages/ui/examples                              | UI 示例           |
| packages/ecosystem/packages/ssr-kit / web-framework 的 monorepo 配置 | 子 workspace 配置 |
| playground                                                           | 开发调试          |
| examples                                                             | 示例项目          |
| e2e                                                                  | 端到端测试        |
| docs                                                                 | 文档站点          |
| benchmarks                                                           | 性能基准测试      |

---

## 发布状态

- **总包数**：76 个
- **版本**：6.9.6
- **npm 组织**：@lytjs

> ✅ 上述 76 个 `@lytjs/*` 包的 `package.json` 版本均已统一为 6.9.6。
> ⚠️ 本清单为**发布包索引**；单次发布由 changesets 解析 workspace，包清单唯一真源为
> `scripts/build-order.ts`。

---

## 发布脚本使用

发布由 **changesets** 驱动，`push v7.0.0-dev` 触发 `.github/workflows/release.yml`：

```bash
# 开发期：为改动的包写 changeset
pnpm changeset

# 查看待发布包与目标版本（不写文件）
pnpm changeset status --verbose

# 升版本 + 生成 CHANGELOG + 消费 changeset（CI 由 Version Packages PR 执行）
pnpm changeset version

# 发布（CI 在 Version PR 合并后执行；本地等价于 build + changeset publish）
pnpm run release

# 查看当前包发布版本（验证是否成功）
npm view @lytjs/core version
npm view @lytjs/router version
npm view @lytjs/ssr version
npm view @lytjs/hmr version
```

> 手工的 `publish:prepare` / `publish:all` / `publish:restore` / `publish:check` /
> `publish:single` 已于 2026-11-07 删除（ADR 见 `keel/NOW.md`）。

---

## 安全说明

- **切勿在仓库文档中留存明文 npm token。** 发布凭据请使用本地环境变量或未提交的本地文件。
- 参考模板文件为 `.npmrc_for_publish.example`（仅含占位，不含真实 token）。
- `.npmrc` 不得包含 token。

---

## 已迁出的包（不计入本仓 76 个）

13 个插件于 2026-09-21 完成真迁出（主仓副本已删除，`pnpm-workspace.yaml` 与
`scripts/build-order.ts` 已同步移除）：

@lytjs/plugin-vite · @lytjs/plugin-theme · @lytjs/plugin-logger · @lytjs/plugin-auth · @lytjs/plugin-storage · @lytjs/plugin-i18n · @lytjs/plugin-validation · @lytjs/plugin-data-fetch · @lytjs/plugin-data · @lytjs/plugin-chart · @lytjs/plugin-animation · @lytjs/plugin-testing · @lytjs/plugin-form

源码位置：`/Volumes/Data/lytjs/plugins`（独立仓库 `lytjs-plugins`）。
