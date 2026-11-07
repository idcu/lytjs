---
scope: architecture
status: active
resolution: implemented
last-verified: 2026-11-07
keywords: [sideEffects, builtin-components, registerBuiltinComponents, B2, ADR]
---

# 0022 · `sideEffects:false` 与内置组件注册（方案 B2 已实施）

## 决策

`component` 保持 `"sideEffects": false`。内置组件改为**显式注册**：
`registerBuiltinComponents()`（幂等），从 `@lytjs/component` 导出、`@lytjs/core` 透传。

- **编译期模板**（`mode: 'module'`）：codegen 检测到内置标签后直接
  `import { X } from '@lytjs/component'` + 裸标识符 ⇒ 零配置、只带入实际用到的实现。
- **运行时字符串模板**（`mode: 'function'`）：产物走 `_ctx.X`，需调用一次注册。
- 未注册时组件实例代理给出 **DEV 告警**（指向 `registerBuiltinComponents()`），不再静默。

## 受影响对象

1. `component/src/builtin-registry.ts`：新增静态 `BUILTIN_COMPONENT_NAMES`（5 个名字）。
2. `component/src/builtin-components.ts`：删顶层注册循环；导出幂等 `registerBuiltinComponents()`。
3. `component/src/index.ts`：删裸副作用 import，改具名导出（否则会被打包器整块丢弃）。
4. `component/src/component-proxy.ts`：命中静态名字但未注册 → `__DEV__` 告警（按名字去重）。
5. `core/src/runtime.ts`：透传 `registerBuiltinComponents`（主入口经 `export *` 自动获得）。
6. `compiler/src/codegen.ts` + 新 `compiler/src/builtin-components.ts`：module 模式产出
   裸标识符并追加 import；其它/未传保持 `_ctx.X`，不改既有产物快照。
7. `core/src/template-compiler.ts`：显式 `mode: 'function'`（产物被 `stripImports` +
   `new Function` 执行，裸标识符无从解析）。
8. `core/tests/e2e-builtin-components.test.ts`：补一次注册调用（**行为变更登记**，非放宽断言）。

## 迁移方式

- 运行时字符串模板：应用入口调用 `registerBuiltinComponents()` 一次
  （从 `@lytjs/core` 或 `@lytjs/component` 导入）。
- AOT / 编译期模板、`h(Teleport)`、`components: { Teleport }`、`setup` 返回内置组件：无需改动。

## 为什么选 B2 而非 B1

B1 = 编译器入口静态引入 5 个实现、按模板检测注入。实测（2026-11-07，同代码同环境）
五入口 +5.7~6.8 KB，`minimal-app` **99,673 B > A15 上限 95,948 B**；只把 `sideEffects`
改成保留 `builtin-components` 同样 11/11 绿但破上限，故否决。
B2 只增名字清单与告警代码，五入口增量：minimal-app +259 B、first-screen +273 B、
runtime-app +262 B、first-screen-runtime +43 B、barrel-only −119 B，全部在基线 +2% 与 A15 内。

## 证据与门禁

- **负控**：`sideEffects:false` 且未注册 → `e2e-builtin-components.test.ts`
  `5 failed | 6 passed`（Teleport / disabled / KeepAlive / Transition / Suspense）。
- **实施后**：同文件 11/11 绿；`packages/core/tests`、`packages/component/tests`、
  `packages/compiler/tests` 全绿；fast 门禁 53/53。
- **覆盖率快照**：全量重跑后 444 个 src 文件、已插桩 435（97.97% ≥ 97.5%），新增
  `compiler/src/builtin-components.ts` 已入快照。
- **DEV 告警实测**：未注册渲染 `<Teleport>` 时 `console.warn` 同时含 `<Teleport>` 与
  `registerBuiltinComponents`（临时用例验证后删除，未入库）。
- **五入口体积（gzip B）**：minimal-app 94,216（A15 上限 95,948）；runtime-app 92,070；
  first-screen 73,840；first-screen-runtime 38,009；barrel-only 9,458。`check-bundle-size` 18/18。
- **AOT 零配置**：`precompileTemplate('<Teleport…><KeepAlive…>')` 产物含
  `import { Teleport, KeepAlive } from '@lytjs/component'`，使用裸标识符，无 `_ctx.*`
  （由 `aot-precompile.test.ts` 新增用例守卫）。

## 风险 / 后续

- 运行时模板未注册时节点仍渲染为空（DEV 有告警、生产不告警以省体积）；文档需补这一步
  注册说明（本轮未改文档）。
- signal codegen 保留自家子集（Teleport/Suspense 走 `@lytjs/vdom`），不复用本清单，
  避免同一绑定被两条 import 语句重复引入。
