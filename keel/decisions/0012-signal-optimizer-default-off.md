---
scope: meta
status: active
last-verified: 2026-11-05
keywords: [compiler, signal, vapor, optimizeSignal, 默认值, breaking, A04]
type: decision
created: 2026-11-05
superseded-by:
---

# 0012 signal/vapor 优化器默认关闭

## 背景

`compile(tpl, { rendererMode: 'signal' | 'vapor' })` 此前默认走
`codegen-signal-optimized`。2026-11-05 的 A04 实测（`scripts/check-compiler-parity.mjs`
的前身探针）表明它在**不报错**的前提下产出错误 DOM：

| 模板 | 优化版实际产物 | 基础实现 |
|---|---|---|
| `{{msg}}` | 只有 `return () => {g()}`，**零 DOM** | 正确渲染文本 |
| `<span v-if="ok" :id="i">{{msg}}</span>` | `createTemplate("<span id=\"i\"></span>")`，文本丢失、属性写死 | `id="7"` + 文本 |
| `<my-comp/>` | `_ctx.my-comp` → 被解析为减法（ReferenceError） | `_ctx['my-comp']` |
| `<li v-for="x in xs"><span>{{x}}</span></li>` | 每个 `li` 为空 | 元素与文本齐全 |

产物是合法字符串，既有 58 条单测断言的是优化版片段，因此「全绿」掩盖了语义丢失。
`SignalRenderer` 曾写死 `optimizeSignal: false`，直接调用 `compile()` 的用户才受影响，
但影响面是**静默错误渲染**，属 P0。

## 决定

1. `optimizeSignal` **默认 false**：不传该选项一律走 `generateSignal`（基础实现）；
2. **保留显式开启入口**：`optimizeSignal: true` 仍可选用优化器（用户已明确承担风险）；
3. 新增门禁 `scripts/check-compiler-parity.mjs` 纳入 `gate.mjs` **fast tier**：
   - 5 个最小模板用**默认选项**编译 → 真实执行 → 断言 DOM 与响应式更新；
   - 断言「默认产物 == `optimizeSignal:false` 产物」（默认回退棘轮）；
   - 显式开启优化器的已知分叉写入 `scripts/compiler-parity-baseline.json`，
     **只允许减少不允许增加**（新增分叉即红；修好后必须同步删基线项）；
4. 同步修复基础实现的四类静默丢失（根级文本、`v-if` 动态属性、kebab 组件、
   `v-for` 嵌套元素）与 `:key` 从未生效的缺陷，否则「默认」依旧不正确。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 继续默认优化器，只修优化器 | 2,568 行差异，属于 B01 的合并级重写；止血阶段在错的语义上重写没有可信基线 |
| 删除优化器 | 它是 B01 的合并目标与体积收益来源；立即删除会让下一步无对照物 |
| 默认关 + 不修基础实现 | 基础实现也有四类静默丢失，等于把 P0 从一条路径挪到另一条 |

## 影响面

- 直接调用 `compile(..., { rendererMode: 'signal' })` 的用户：产物从「短别名 + 合并 effect」
  变为基础实现（更长、但语义正确）。`@lytjs/renderer` 的 `SignalRenderer` 本就走 false，
  **行为不变**。
- 既有 58 条断言的用例是「优化版产物」测试：改为显式传 `optimizeSignal: true`，
  断言**未放宽**（A04 汇报中记录）。
- 基础实现新增 DOM 行为：根级文本节点、`v-if` 分支动态属性、列表项嵌套元素、
  列表 `:key` 生效。这些是「应有的行为」，不是新约定。

## 回退路径

1. **恢复旧默认**：在 `packages/compiler/src/index.ts` 把
   `options.optimizeSignal === true` 改回 `options.optimizeSignal !== false`；
2. **必须同时处理门禁**：`check-compiler-parity` 的「默认 == false」断言会红（注入验证
   实测 6 项红），须在同一次变更里显式记录放宽理由（硬约束 5：留痕），
   并删除 `compiler-parity-baseline.json` 中已不再成立的分叉条目；
3. 产物逻辑本身不依赖默认值，无需回滚 src。

## 判据

- `node scripts/check-compiler-parity.mjs` 退出码 0（5 模板 DOM + 更新全过）；
- 注入验证：默认切回优化器 ⇒ 退出码 1、6 项红；
- `@lytjs/compiler` 单测 1669/1669 绿；
- 上述两条删除/放宽必须在 CHANGELOG 与 `keel/NOW.md` 留痕。
