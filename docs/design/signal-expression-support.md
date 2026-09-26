# Signal 模式的模板表达式支持（方案 / 待专项）

> 状态：**✅ 已实施**（2026-09-26）· 原调研于 2026-09-25
>
> **落地摘要**：6 个函数的 `locals` 已贯穿；DOM 侧 **17 处**表达式生成改走
> `prefixIdentifiers(exp, locals)`；校验由白名单改为黑名单；
> 回归测试 `packages/compiler/tests/signal-expression-policy.test.ts`（23 例）+ 全量 2271 例全绿。
> 关联：`packages/compiler/src/codegen-signal.ts` 的 `validateExpression` 注释、
> `packages/compiler/tests/signal-expression-policy.test.ts`、
> `packages/renderer/tests/ssr-client-consistency.test.ts`

## 1. 现状（实测）

Signal 模式的模板表达式**只支持「简单属性访问路径」**（`a` / `a.b` / `a.b.c`）：

| 写法                              | Signal      | SSR |
| --------------------------------- | ----------- | --- |
| `:title="t"` / `:title="obj.tip"` | ✅          | ✅  |
| `:class="['a','b']"`              | ❌ 编译报错 | ✅  |
| `:class="{ active: ok }"`         | ❌          | ✅  |
| `:style="{ color: c }"`           | ❌          | ✅  |
| `:title="ok ? 'a' : 'b'"`         | ❌          | ✅  |
| `:title="a + '!'"`                | ❌          | ✅  |
| `:title="list[0]"` / `a && b`     | ❌          | ✅  |

⇒ **两端能力不一致**，且 `:class` / `:style` 的数组与对象写法是**极常见**用法。

## 2. 根因

`codegen-signal.ts` 的 **DOM 操作侧**有 **20 处**直接拼接 `` `_ctx.${exp}` ``，隐含假定「表达式就是属性路径」：

```js
// 例：processDirective 内
effect(() => setClass(${varName}, _ctx.${expContent}));
```

于是 `:class="['a','b']"` 会产出 `setClass(_div, _ctx.['a','b'])` —— **语法错误的产物**。

> 注：`validateExpression` 的白名单**恰恰是在替这 20 处兜底**。
> ⚠️ 因此**不能只放宽校验**：曾一度这么做，结果是坏产物直接流出（比报错更糟）。

### 对比：VNode / 插槽侧已经是正确做法

`codegen-signal.ts` 里 **VNode 与插槽相关路径**早已使用
`prefixIdentifiers(exp, locals)`，并有 `withScope(locals, param)` 辅助并入作用域变量。

⇒ 本任务**不是引入新机制**，而是**把已有正确做法推广到 DOM 操作侧**。

## 3. 关键前提（已验证）

对简单路径，`prefixIdentifiers` 与原拼接产物**完全一致**，因此替换**不改变现有产物**：

| 表达式    | 插值（走 `prefixIdentifiers`） | v-bind（走拼接） | 一致 |
| --------- | ------------------------------ | ---------------- | ---- |
| `t`       | `_ctx.t`                       | `_ctx.t`         | ✅   |
| `obj.tip` | `_ctx.obj.tip`                 | `_ctx.obj.tip`   | ✅   |
| `a.b.c`   | `_ctx.a.b.c`                   | `_ctx.a.b.c`     | ✅   |

## 4. 实施方案

1. **新增统一入口**（避免 20 处各自为政）：
   ```ts
   /** 生成模板表达式的引用；locals 用于排除 v-for / 插槽作用域变量的前缀化 */
   function ctxExpr(exp: string, locals: ReadonlySet<string> = new Set()): string {
     return prefixIdentifiers(exp, locals);
   }
   ```
2. **把 20 处 `` `_ctx.${exp}` `` 全部替换为 `${ctxExpr(exp, locals)}`**：
   - 插值 `setText`、`setHTML`、`v-show`、`v-if` fallback、`v-model`
   - `setClass` / `setStyle` / `setAttribute`、事件 handler
   - `v-for` 的 `source`、组件挂载的 tag（后者是组件名，应保持）
3. **把 `locals` 贯穿下去**（**本任务的主要成本**）：
   `processChildren` / `processElement` / `processDirective` / `processVNodeCallProps`
   增加 `locals: ReadonlySet<string>` 参数，并在处理 `v-for` 时用 `withScope(locals, itemVar)` 扩展。
   ⇒ **不传 locals 会造成回归**：v-for 内的 `:class="item.cls"` 会被错误写成 `_ctx.item.cls`。
4. **校验策略**：生成端修好后，`validateExpression` 放宽为黑名单式
   （只拒绝 `;` / `=>` / `function` / `new` / `import` / `require` / `delete` / `throw` / `await` / 赋值）。
5. **测试**：
   - `signal-expression-policy.test.ts`：把「应明确报错」的 8 个用例改为「应可编译」+
     保留危险写法拒绝 + **新增 v-for 内部表达式的用例**（验证 locals 生效）
   - `ssr-client-consistency.test.ts`：把此前移除的表达式类用例**加回**
   - 回归：全部 7 个包

## 5. 风险与验收

| 风险                                     | 缓解                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| locals 漏传 ⇒ v-for 内表达式被错误前缀化 | 专项必须有 **v-for 内 `:class="item.x"`** 的用例；并用「产物中不得出现 `_ctx.item`」做断言 |
| 20 处替换引入零散回归                    | 替换对简单路径**产物不变**（第 3 节已验证）；先跑全量回归                                  |
| 校验放宽后安全变松                       | 黑名单必须同时测**放行侧**与**拒绝侧**（各 ≥ 8 例）                                        |

**验收**：`signal-expression-policy.test.ts` 无「应报错」的常见写法；一致性用例覆盖表达式场景；全量回归绿。

## 6. 当前过渡措施（已落地）

大改之前，先把**用户体验**补上：当用到不支持的表达式时，编译错误**直接给出替代写法**
（在 `setup()` 里用 `computed` 算好再绑定）。见 `validateExpression` 的错误信息。
