---
scope: architecture
status: active
resolution: pending
last-verified: 2026-11-07
keywords: [sideEffects, builtin-components, Teleport, 方案, 待确认]
---

# 0022 · `sideEffects:false` 修复方案 B（内置组件注册时机，待确认）

> 状态：**仅方案，未改代码**。等 owner 确认后再实施；不突破 A15、不改基线。

## 1. 现象与根因（已实测）

`core` 的 `tests/e2e-builtin-components.test.ts` 5 条红（Teleport／Teleport disabled／
KeepAlive／Transition／Suspense）。根因链：

1. `packages/component/package.json` 声明 `"sideEffects": false`；
2. `component/src/index.ts` 用**裸副作用 import** 加载 `./builtin-components`；
3. tsup/esbuild 打包按声明丢弃该模块 ⇒ `dist/index.mjs` 中 `registerBuiltin` 出现 **0 次**；
4. `builtin-registry` 为空 ⇒ 模板产物 `_ctx.Teleport` 为 `undefined` ⇒ 静默渲染为空。

对照：只把声明改成 `["./src/builtin-components.ts"]`，`registerBuiltin` 出现 2 次，
该测试 11/11 绿。**但五个入口实测 +5.7～6.8 KB，minimal-app 破 A15 上限**，
因此不走“只改声明”的 A 方案。

## 2. B 方案骨架

核心思路：**把“模块加载即注册”改为“按使用登记”**，让未用内置组件的入口不付费。

### 2.1 注册时机

- 删除 `component/src/index.ts` 的裸 import；
- `builtin-registry.ts` 保留查询能力，但不再由入口自动填充；
- 由**模板编译路径**在编译期检测到内置组件标签时登记（运行时字符串模板）；
  或由 AOT 产物直接引用实现（见 2.2）。

### 2.2 compiler / codegen 改动

- **基础 codegen**（`packages/compiler/src/codegen.ts`，`_ctx.` 路径）：
  对 `BUILTIN_COMPONENT_NAMES` 命中时不再 `prefixIdentifiers`，改为像
  `codegen-signal.ts` 一样产出裸标识符 + 登记 `import ... from '@lytjs/component'`。
- **共享内置集合**：`codegen-signal.ts` / `codegen-signal-optimized.ts` 各有一份
  `BUILTIN_COMPONENT_NAMES`，抽到单一模块，基础 codegen 复用。
- **运行时模板编译**（`packages/core/src/template-compiler.ts`）：
  现状 `stripImports` 后把 RUNTIME_HELPERS 作为 `new Function` 形参。
  B 需要把“本模板用到的内置组件”作为额外形参注入；实现上分两条：

| 子方案 | 做法 | 代价 |
|---|---|---|
| B1 | 编译器入口静态引入 5 个内置组件，按模板检测结果只传用到的 | minimal-app/first-screen +≈6 KB，**破 A15** |
| B2 | 新增显式注册入口（如 `installBuiltinComponents()`），运行时字符串模板用内置组件需调用一次；未调用/未使用则零成本 | 五个入口 +0；属**行为变化**，需文档与用例同步 |

### 2.3 体积预期（五个入口）

- B1：`barrel-only` 0；`runtime-app` 0；`first-screen-runtime` 0；
  `minimal-app` +≈5.7 KB（99,673 > 上限 95,948）；`first-screen` +≈6.5 KB → **不接受**。
- B2：五个入口均 **+0**（当前 9,577 / 91,808 / 93,957 / 73,567 / 37,966 全部保持）；
  代价是运行时 `template` 里的内置组件改为显式注册后才生效。

## 3. 负控与判据

- **负控**：保持 `sideEffects:false` 且去掉注册时，现有
  `packages/core/tests/e2e-builtin-components.test.ts` 5 条必须红（已实际复现）。
  修复后同一文件 11/11 绿；B2 需在用例中显式调用注册入口一次，否则视为行为变化、
  不能算“测试为变绿而改”。
- **契约回归**：基础 codegen 输出形态变化会触碰 `check-compiler-parity` /
  契约用例，必须先跑 100/100 再谈实施。
- **入口体积**：`check-bundle-size` 必须 18/18，且 `minimal-app` 不越 A15 硬上限。

## 4. 待确认

- [ ] 选 B1（接受编译器入口增长，但会破 A15，与当前约束冲突）还是 B2（零体积、需显式注册）。
- [ ] B2 的注册入口命名、默认行为与文档口径（运行时 `template` + 内置组件）。
- [ ] 若接受 codegen 输出形态变化，`check-compiler-parity` 的契约面由谁签字。
