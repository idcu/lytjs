# 缺陷登记：Signal 模式「同一元素多个插值」只保留最后一个（P0）

> 状态：**已确认、未修复** · 发现于 2026-09-25（写小白上手指南时实跑暴露）
> 复现文件：`packages/core-signal/tests/quickstart-smoke.test.ts`（含通过/失败的对照用例）

## 1. 现象

| 模板                                | 实际渲染                                        | 期望                   |
| ----------------------------------- | ----------------------------------------------- | ---------------------- |
| `<div>{{ msg }}</div>`              | `<div>world</div>` ✅                           | ✅                     |
| `<div>{{ n }}</div>`                | `<div>42</div>` ✅                              | ✅                     |
| **`<div>{{ msg }}\|{{ n }}</div>`** | **`<div>42</div>`** ❌                          | `<div>world\|42</div>` |
| **`<div>a{{ x }}b</div>`**          | **`<div>b</div>`**（实测为 `ab` 模板 + 覆盖）❌ | `<div>a…b</div>`       |
| **`<div>{{ a }}{{ b }}</div>`**     | 只剩 `b` ❌                                     | 两者都在               |

⇒ **一个元素里只要有两个以上插值（或插值 + 静态文本），就只剩最后一个**。

## 2. 根因（看产物即明）

```js
// 模板：<div>{{ msg }}|{{ n }}</div>
const _div = createTemplate('<div>|</div>');
insert(_div, _container);
effect(() => setText(_div, _ctx.msg)); // ← 作用于**整个元素**，把 "|" 覆盖掉
effect(() => setText(_div, _ctx.n)); // ← 再次覆盖 ⇒ 最终只剩 n
```

`setText(el, value)` 的语义是**设置元素的文本内容**；而 codegen 对**每个插值都调用一次
`setText(同一个元素)`**，于是互相覆盖。

**正确的做法**应是为每个插值生成/定位**独立的文本节点**，例如：

- `createTemplate` 时为每个插值预留占位节点（注释节点或空文本节点），插值写入对应节点；
- 或使用 `setText(node.childNodes[i], value)` 之类的定位写入。

## 3. 影响面

**极大**。`<div>{{ a }} - {{ b }}</div>`、`<p>{{ title }}：{{ desc }}</p>` 这类写法是
**最基础的模板用法**。当前表现为**静默丢失内容**（不报错），排查成本很高。

> 这也是「小白第一个例子」失败的直接原因之一 —— 见 `docs/getting-started/for-beginners.md`
> 第 6 节的已知限制。

## 4. 为什么此前没被发现

现有的 Signal 相关测试多用**单个插值**的模板（`<div>{{ msg }}</div>`），
恰好绕开了"同元素多插值"这一形态 —— 与「测试模板的书写形式会掩盖缺陷」是同一条教训。

## 5. 建议修复路径（待专项）

1. `codegen-signal.ts` 处理元素 children 时，为每个 `INTERPOLATION`（及每段静态 TEXT）
   分配**独立的文本节点**并记录其引用（例如复用 `elementVars` 机制）；
2. 插值绑定改为写入各自节点，而非写入父元素；
3. 回归要求：
   - `<div>{{ a }}{{ b }}</div>`、`<div>a{{ x }}b</div>`、`<div>{{ a }}|{{ b }}|{{ c }}</div>` 必须全对；
   - **同元素内静态文本与插值的顺序**必须保持；
   - 现有全部 Signal 测试保持通过。

## 6. 当前过渡建议（写进用户文档）

在修复前，**避免在同一元素内放置多个插值**，改用「多个元素」或「`computed` 拼好一个字符串」：

```html
<!-- 不推荐（当前会丢内容） -->
<div>{{ first }} - {{ last }}</div>

<!-- 可用替代 -->
<div>{{ fullName }}</div>
<!-- setup 里：const fullName = computed(() => `${first.value} - ${last.value}`) -->
```
