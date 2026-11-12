---
'@lytjs/adapter-web': major
'@lytjs/common-a11y': major
'@lytjs/common-algorithm': major
'@lytjs/common-assertions': major
'@lytjs/common-async-scheduler': major
'@lytjs/common-cache': major
'@lytjs/common': major
'@lytjs/common-constants': major
'@lytjs/common-dom': major
'@lytjs/common-dom-helpers': major
'@lytjs/common-env': major
'@lytjs/common-error': major
'@lytjs/common-event-normalizer': major
'@lytjs/common-events': major
'@lytjs/common-http': major
'@lytjs/common-is': major
'@lytjs/common-keyboard': major
'@lytjs/common-memory': major
'@lytjs/common-node-cache': major
'@lytjs/common-object': major
'@lytjs/common-path': major
'@lytjs/common-performance': major
'@lytjs/common-query': major
'@lytjs/common-raf': major
'@lytjs/common-rate-limit': major
'@lytjs/common-render-queue': major
'@lytjs/common-scheduler': major
'@lytjs/common-security': major
'@lytjs/common-storage': major
'@lytjs/common-string': major
'@lytjs/common-timing': major
'@lytjs/common-transition-engine': major
'@lytjs/common-validate': major
'@lytjs/common-vnode': major
'@lytjs/common-warn': major
'@lytjs/compiler': major
'@lytjs/component': major
'@lytjs/core': major
'@lytjs/core-signal': major
'@lytjs/core-vnode': major
'@lytjs/dom': major
'@lytjs/dom-runtime': major
'@lytjs/bundler': major
'@lytjs/compat': major
'@lytjs/config': major
'@lytjs/devtools': major
'@lytjs/di': major
'@lytjs/platform-adapter': major
'@lytjs/plugin': major
'@lytjs/runtime-edge': major
'@lytjs/cache': major
'@lytjs/cache-isr': major
'@lytjs/hmr': major
'@lytjs/html-renderer': major
'@lytjs/ssg': major
'@lytjs/ssr': major
'@lytjs/store': major
'@lytjs/ui': major
'@lytjs/api': major
'@lytjs/http-server': major
'@lytjs/metadata': major
'@lytjs/middleware': major
'@lytjs/middleware-auth': major
'@lytjs/middleware-cors': major
'@lytjs/middleware-rate-limit': major
'@lytjs/router': major
'@lytjs/router-fs': major
'@lytjs/host-contract': major
'@lytjs/reactivity': major
'@lytjs/renderer': major
'@lytjs/shared-types': major
'@lytjs/cli': major
'@lytjs/devtools-extension': major
'@lytjs/test-utils': major
'@lytjs/vdom': major
'@lytjs/web': major
---

v7.0.0 核心止血批次（A 阶段 A01–A14）。

- 修复静默丢内容 / 静默 no-op 类缺陷（编译器、signal 渲染、CLI、core-signal setup 契约）。
- 补齐验证链：锁文件、构建顺序、循环依赖、覆盖率快照、发布一致性、E2E。
- 行为变更与取舍见根 CHANGELOG.md「v7 未发布」章节与 ADR 0012/0013。

### 破坏性变更：`@lytjs/core/runtime` 不再包含编译器

`@lytjs/core/runtime` 的 `createApp` 此前通过 `import('@lytjs/renderer')` 的
namespace 取渲染器，导致 signal/vapor 发射链把整个 `@lytjs/compiler` 拖进产物
（runtime-app 从 33,481 B 涨到 94,170 B gzip）。现在：

- `@lytjs/core/runtime` 的产物闭包**不含** `compiler/dist`，由 bundle 门禁硬断言守卫；
- `rendererMode: 'signal'` + `template` 字符串在该入口下**抛出可操作错误**
  （指向 `@lytjs/core` 主入口 / `@lytjs/compiler` 预编译 / `@lytjs/renderer/signal`），
  不再静默借用编译器；
- `@lytjs/core` 主入口行为不变：`template` 与 `createAppWithCompiler` 路径均可用。

迁移：需要运行时 signal 模板编译请改用 `import { createApp } from '@lytjs/core'`，
或显式引入 `@lytjs/renderer/signal`。详见 ADR 0030。

- `@lytjs/renderer` 新增子路径导出 `./app`：`createDOMRenderer`、`createSignalRenderer`
  与类型 `SignalRenderer`（刻意新增，供 core 用单一动态入口同时取 DOM 与 signal；
  包根 barrel 的导出面未变）。
