# 会话交付清单（2026-09-24 ~ 09-25）

> 分支 `v7.0.0-dev` · 远程 Gitee `lytjs/lytjs` · **36 个 commit 全部已推送**（`0278ba3b` → `d56059cb`）
> 说明：本清单按「能力 / 修复 / 测试 / 治理」分类，末尾登记未完成项与固化下来的纪律。

## 1. 验证状态

| 门禁              | 结果                                   |
| ----------------- | -------------------------------------- |
| check-build-order | ✅                                     |
| build（76 包）    | ✅                                     |
| type-check        | ✅                                     |
| lint:check        | ✅                                     |
| format:check      | ✅（修复本清单同批次的文档格式问题后） |
| test:coverage     | ✅                                     |

另：核心五个包（compiler / renderer / vdom / component / dom-runtime）回归 **73 文件 / 1667 用例全绿**。

> 复验方式：`bash scripts/verify-baseline.sh`（用户终端；agent 沙箱内会受 broker / safe-delete 干扰）

## 2. 能力建设

### 2.1 Signal 模式的组件与插槽（从零到完整）

- 组件挂载（优化版 `codegen-signal-optimized` 与非优化版 `codegen-signal` **双写**）
- 组件 props（静态 + `:bind`）、组件事件（`v-on` → `onXxx` prop 键）
- 插槽：默认 / 具名（`<template #name>`）/ 作用域（`v-slot="props"`）
- 插槽内指令：`v-if` / `v-else` / `v-else-if` / `v-for` / `v-show`
- 插槽的响应式依赖收集（跨响应式边界需「预热」求值）

### 2.2 指令

- `v-pre`（`transforms/pre.ts`，注册在 `builtInTransforms` 最前）
- `v-once` / `v-memo`（含非优化版）

### 2.3 SSR 组件与插槽（链路补完）

- 组件渲染：`renderComponentVNode` 注入 + `renderToString` 组件递归分支
- props（静态 + `:bind`）、默认插槽、具名插槽、作用域插槽
- `v-model` → `value`、`v-show` → `display:none`
- `v-html` → 与客户端一致的 `sanitizeHTML`
- `class` / `style` 归一化（`normalizeClass` / `normalizeStyle`，**客户端与 SSR 共用**）

## 3. 修复的真实缺陷（14 处）

### 功能完全失效级

| 缺陷                                              | 影响                                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| parser：无 arg 指令 + 修饰符未识别                | **`v-model` 修饰符整体失效**（`v-model.lazy` 落到普通属性分支） |
| `transforms/if.ts` 链构建用 `conditional` 下钻    | 条件链其余分支**静默丢失**                                      |
| **多行模板中 `v-if`/`v-else` 被空白 TEXT 断链**   | **`v-else` 恒渲染**（实际模板几乎都是多行的）                   |
| Signal codegen 用 `TemplateWrapper.children` 解构 | 元素下标整体错位 ⇒ 运行时 `Cannot set properties of undefined`  |
| `v-once` 非优化版完全无效 + VNode 产物运行时报错  | 指令失效 / 崩溃                                                 |
| SSR `v-html` 被 `escapeHtml`                      | SSR 下 `v-html` 完全失效，与客户端不一致                        |
| `class` / `style` 数组与对象形式                  | 两端都输出 `[object Object]`                                    |
| `precompileTemplate` 名不副实                     | 返回原模板而非编译产物                                          |

### 其余

- 非优化版组件挂载不生效（运行时走的正是非优化版）
- 插槽的响应式依赖未被父级 effect 收集
- 组件 tag 未前缀化、`getExpContent()` 对无 `type` 对象抛错
- 「含后代指令的子树被误判静态并提升」（常量体在模块级引用 `_ctx`）
- SSR 执行器未注入运行时依赖（`sanitizeHTML` 等）
- SSR 组件被当普通标签输出 `<Child>`（非法 HTML）

## 4. 测试质量

- **替换 9 个假测试**（`toContain('?')`、`toBeGreaterThan(0)`、只断言 `export function render` 之类）
- 补强条件链断言：必须覆盖「**每个分支的内容都出现**」，并验证断言**真能抓到 bug**
- 新增契约 / 集成 / **端到端**测试：
  - `optimizations.test.ts`（对外 API 契约）
  - `slots-demo.integration.test.ts`（复用 `examples/slots-demo/app.ts`）
  - `nested-children.test.ts`（嵌套数组展平）
  - **`ssr-e2e.test.ts`（19 例）走真实渲染入口**

## 5. 治理与工具

- `docs/api/compiler.md` 登记「**实验性 / 未接入编译管线的 API**」（含处置建议）
- 标注 1516 行未接入代码（treeShaking / staticAnalysis / incremental-compile）
- **`scripts/verify-baseline.sh`**：一条命令跑完 6 项门禁，含**环境干扰自动识别**
- `docs/design/ssr-component-slots.md`：SSR 组件/插槽立项方案
- `.gitignore`：补构建/测试临时文件；`vitest.config.ts` 补 `**/dist/**` 排除

## 6. 未完成项登记

| 项                                      | 说明                                                      |
| --------------------------------------- | --------------------------------------------------------- |
| SSR：与客户端首次渲染 HTML 的一致性用例 | hydration 的基础，尚未编写                                |
| SSR：`template` 组件的预编译支持        | 当前显式降级 + 开发期警告                                 |
| 具名 / 作用域插槽的 SSR 组合边界        | 已支持，但复杂组合（嵌套 + 作用域 + 具名）用例较少        |
| 1516 行未接入代码                       | 需决策「接入 / 删除 / 保持登记」                          |
| 细粒度更新                              | 组件级 effect 整体重渲染 → 按绑定粒度；**架构级，宜专项** |
| `codegen-ssr` / `wasm` 更深审计         | 本轮扫了主要语义，wasm（740 行）未细看                    |

## 7. 已固化的纪律

1. **审计「某能力是否生效」三步**：① 被编译路径 import 了吗？② 有外部调用方吗？③ 接进去实跑看产物。**只看文件存在或函数名会误判**。
2. **「导出即契约」**：凡从 `index.ts` 导出的 API 都该有测试与文档；名不副实的 API 比死代码更危险。
3. **涉及「产物 + 执行器」的改动，必须有走真实入口的端到端测试** —— 只断言产物字符串会漏掉运行时错误。
4. **判「属性是否已存在」一律预扫描**，不要依赖遍历顺序中的动态标志。
5. **慢环境下先区分「超时」与「真失败」**；见到 `safe-delete` / `Broker request timed out` / `ECONNREFUSED` 一律先归因环境。
6. **改 `vdom` / `dom-runtime` 等底层包的 src 后必须重建其 dist**（其它包通过别名引用的是 dist）。
7. **新增/修改任何文件后（含 `.md`）提交前一律跑 Prettier** —— 不要只对 `.ts` 跑。
8. **提交前用 `git show --stat --oneline HEAD` 核对改动文件是否齐全**。
9. **测试模板的书写形式会掩盖缺陷**：涉及兄弟关系的转换（v-if 链等）测试必须包含**多行带缩进**版本。
