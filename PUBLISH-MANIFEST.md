# LytJS v6.9.6 发布包清单

> 版本日期：2026-06-06
> 总计：**86** 个可发布包（按下述分组统计）

---

## 包分组统计

| 分组               | 数量   | 说明                                     |
| ------------------ | ------ | ---------------------------------------- |
| 核心与运行时       | 14     | 响应式、虚拟 DOM、编译器、渲染、核心 API |
| 工具层 (tools)     | 3      | CLI、DevTools、测试工具                  |
| 插件层 (plugins)   | 13     | 官方插件                                 |
| 生态层 (ecosystem) | 22     | Router、SSR、Store、Web 框架、缓存等     |
| Common 工具包      | 34     | 零依赖通用工具函数                       |
| **总计**           | **86** |                                          |

---

## 1. 核心与运行时（14 个）

@lytjs/web · @lytjs/vdom · @lytjs/shared-types · @lytjs/renderer · @lytjs/reactivity
· @lytjs/host-contract · @lytjs/dom · @lytjs/dom-runtime · @lytjs/core
· @lytjs/core-vnode · @lytjs/core-signal · @lytjs/component · @lytjs/compiler
· @lytjs/adapter-web

## 2. 工具层 tools（3 个）

@lytjs/cli · @lytjs/devtools-extension · @lytjs/test-utils

## 3. 插件层 plugins（13 个）

@lytjs/plugin-validation · @lytjs/plugin-data · @lytjs/plugin-vite
· @lytjs/plugin-theme · @lytjs/plugin-testing · @lytjs/plugin-storage
· @lytjs/plugin-logger · @lytjs/plugin-i18n · @lytjs/plugin-form
· @lytjs/plugin-data-fetch · @lytjs/plugin-chart · @lytjs/plugin-auth
· @lytjs/plugin-animation

## 4. 生态层 ecosystem（22 个）

### ecosystem 直接子包

@lytjs/ui · @lytjs/store · @lytjs/devtools · @lytjs/bundler · @lytjs/compat
· @lytjs/runtime-edge · @lytjs/platform-adapter

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

- **总包数**：86 个
- **版本**：6.9.6
- **npm 组织**：@lytjs

> ✅ 上述 86 个 `@lytjs/*` 包的 `package.json` 版本均已统一为 6.9.6。
> ⚠️ 本清单为**发布包索引**，单次发布的实际明细以 `scripts/final-publish.ts` 运行结果为准。

---

## 发布脚本使用

```bash
# 发布所有包（主脚本）
pnpm publish:all            # 即 scripts/final-publish.ts

# 查看当前包发布版本（验证是否成功）
npm view @lytjs/core version
npm view @lytjs/router version
npm view @lytjs/ssr version
npm view @lytjs/hmr version
```

---

## 安全说明

- **切勿在仓库文档中留存明文 npm token。** 发布凭据请使用本地环境变量或未提交的本地文件。
- 参考模板文件为 `.npmrc_for_publish.example`（仅含占位，不含真实 token）。
- `.npmrc` 不得包含 token。
