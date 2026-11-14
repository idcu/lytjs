import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// S32：单包 vitest 配置的唯一共享源。
//
// 此前每个包各自维护一份 dist 别名表，与根配置的 src 口径不一致：
// 测试可能跑旧产物、跨包身份对拍出现两个模块实例、DEV 告警被产物压静默。
// 这里把根配置里的 src 别名原样抽出，单包配置只保留 environment / include 等本包差异。
//
// 维护约定：新增包时只在本文件加一条 src alias；确实需要验证产物的测试，
// 请在该测试内显式 import dist 路径，而不是把整条 alias 改回 dist。
//
// 本文件只依赖 node 内建模块，不引入 ESM 插件（vite-tsconfig-paths）——
// 单包配置 import 根配置曾因该插件解析失败，故剥离为无插件的纯数据模块。

const root = dirname(fileURLToPath(import.meta.url));

export const sharedAliases: Record<string, string> = {
  // common 子包
  '@lytjs/common-is': resolve(root, 'packages/common/packages/is/src'),
  '@lytjs/common-scheduler': resolve(root, 'packages/common/packages/scheduler/src'),
  '@lytjs/common-error': resolve(root, 'packages/common/packages/error/src'),
  '@lytjs/common-security': resolve(root, 'packages/common/packages/security/src'),
  '@lytjs/common-vnode': resolve(root, 'packages/common/packages/vnode/src'),
  '@lytjs/common-string': resolve(root, 'packages/common/packages/string/src'),
  '@lytjs/common-events': resolve(root, 'packages/common/packages/events/src'),
  '@lytjs/common-object': resolve(root, 'packages/common/packages/object/src'),
  '@lytjs/common-algorithm': resolve(root, 'packages/common/packages/algorithm/src'),
  '@lytjs/common-timing': resolve(root, 'packages/common/packages/timing/src'),
  '@lytjs/common-cache': resolve(root, 'packages/common/packages/cache/src'),
  '@lytjs/common-env': resolve(root, 'packages/common/packages/env/src'),
  '@lytjs/common-constants': resolve(root, 'packages/common/packages/constants/src'),
  '@lytjs/common-dom': resolve(root, 'packages/common/packages/dom/src'),
  '@lytjs/common-dom-helpers': resolve(root, 'packages/common/packages/dom-helpers/src'),
  '@lytjs/common-path': resolve(root, 'packages/common/packages/path/src'),
  '@lytjs/common-query': resolve(root, 'packages/common/packages/query/src'),
  '@lytjs/common-a11y': resolve(root, 'packages/common/packages/a11y/src'),
  '@lytjs/common-keyboard': resolve(root, 'packages/common/packages/keyboard/src'),
  '@lytjs/common-storage': resolve(root, 'packages/common/packages/storage/src'),
  '@lytjs/common-validate': resolve(root, 'packages/common/packages/validate/src'),
  '@lytjs/common-http': resolve(root, 'packages/common/packages/http/src'),
  '@lytjs/common-raf': resolve(root, 'packages/common/packages/raf/src'),
  '@lytjs/common-render-queue': resolve(root, 'packages/common/packages/render-queue/src'),
  '@lytjs/common-event-normalizer': resolve(root, 'packages/common/packages/event-normalizer/src'),
  '@lytjs/common-node-cache': resolve(root, 'packages/common/packages/node-cache/src'),
  '@lytjs/common-async-scheduler': resolve(root, 'packages/common/packages/async-scheduler/src'),
  '@lytjs/common-transition-engine': resolve(
    root,
    'packages/common/packages/transition-engine/src',
  ),
  '@lytjs/common-performance': resolve(root, 'packages/common/packages/performance/src'),
  '@lytjs/common-assertions': resolve(root, 'packages/common/packages/assertions/src'),
  // 主包
  '@lytjs/shared-types': resolve(root, 'packages/shared-types/src'),
  '@lytjs/host-contract': resolve(root, 'packages/host-contract/src'),
  '@lytjs/vdom': resolve(root, 'packages/vdom/src'),
  '@lytjs/vdom/transition': resolve(root, 'packages/vdom/src/transition.ts'),
  '@lytjs/core/runtime': resolve(root, 'packages/core/src/runtime.ts'),
  '@lytjs/core': resolve(root, 'packages/core/src'),
  '@lytjs/reactivity': resolve(root, 'packages/reactivity/src'),
  // 子路径 alias 必须先于主包 alias：`@lytjs/renderer` 的字符串 alias 会按前缀
  // 命中 `@lytjs/renderer/dom`，拼成 `packages/renderer/src/dom`（目录）而解析失败。
  '@lytjs/renderer/dom': resolve(root, 'packages/renderer/src/dom/dom-renderer.ts'),
  '@lytjs/renderer/signal': resolve(root, 'packages/renderer/src/signal/index.ts'),
  '@lytjs/renderer/app': resolve(root, 'packages/renderer/src/app.ts'),
  '@lytjs/renderer': resolve(root, 'packages/renderer/src'),
  '@lytjs/component': resolve(root, 'packages/component/src'),
  // ecosystem：示例 / 集成测试会直接 import 这些包。
  // ⚠️ 2026-11-10 实证：`@lytjs/router` 曾漏在此表外 ⇒ 解析到 node_modules 里
  // 已发布的 6.9.6 副本，它自带一份已发布的 `@lytjs/vdom`，而 core 走的是
  // `packages/vdom/src` ⇒ **两个 vdom 实例**，`RouterLink` / `RouterView`
  // 报「component mounted」却渲染不出任何 DOM（vnode 的跨实例品牌判定失败）。
  // 症状极具误导性（看起来像渲染器缺陷），根因只是缺一行别名。
  '@lytjs/router': resolve(root, 'packages/ecosystem/packages/web-framework/packages/router/src'),
  // 子路径 alias 必须先于主包 alias 生效，且目标指 src
  '@lytjs/compiler/sfc': resolve(root, 'packages/compiler/src/sfc/index.ts'),
  '@lytjs/compiler/signal-optimized': resolve(root, 'packages/compiler/src/signal-optimized.ts'),
  '@lytjs/compiler': resolve(root, 'packages/compiler/src'),
  '@lytjs/core-vnode': resolve(root, 'packages/core-vnode/src'),
  '@lytjs/core-signal': resolve(root, 'packages/core-signal/src'),
  '@lytjs/adapter-web': resolve(root, 'packages/adapter-web/src'),
  '@lytjs/dom-runtime': resolve(root, 'packages/dom-runtime/src'),
  '@lytjs/dom': resolve(root, 'packages/dom/src'),
  '@lytjs/di': resolve(root, 'packages/ecosystem/packages/di/src'),
};

export const sharedDefine = {
  __DEV__: 'true',
  __PROD__: 'false',
  __TEST__: 'true',
} as const;

export const sharedSetupFiles = [resolve(root, 'vitest.setup.ts')];
