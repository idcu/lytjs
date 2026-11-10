# 订单分析表 · 子组件 props + emit 真实应用

> 一个可复用的 `<DataTable>` 子组件 + 父组件负责数据：排序（点表头）、关键词搜索、
> 状态筛选、分页、空态。与另两个示例互补——那两个是单层组件，这个专门验证
> **props 下行 / emit 上行**这条链路。

## 怎么跑

```bash
cd examples/data-table
npm install     # 本仓根 node_modules 已链接 workspace 包，可跳过
npm run dev     # http://localhost:3200
npm run build   # 产物在 dist/
```

## 目录结构

```
data-table/
├── index.html                # 只挂 #app 和 /main.js
├── main.js                   # 父组件：数据 / 筛选 / 排序 / 分页状态
├── api.js                    # 数据层：种子 LCG 生成 47 条订单 + 40ms 延迟
├── components/DataTable.js    # 子组件：props(rows/columns/sortKey/sortDir/emptyText) + emit('sortChange')
├── data-table.test.ts        # 行为判据（jsdom 真跑，10 段断言）
└── vite.config.js
```

## 这个示例真正验证了什么

**判据** `data-table.test.ts` 走完整交互链：首屏 loading → 数据到达 →
点表头排序 → 再点翻转 → 不可排序列不响应 → 翻页 → 关键词筛选（页数重置）→
叠加状态筛选 → 空态 → 清空恢复。

期望值全部从 `api.js` **独立算出**（`Math.min` / `filter` / `length`），不是把渲染结果
抄进断言——否则排序压根没生效时，「第一名」也会一直等于它自己（自证式假绿）。

**负控**：把 `@sortChange` 改成 `@sort-change` ⇒ 排序整条链路静默失效，判据红在
`expected undefined to be '▲'`。这条负控同时是下面那个缺陷的实锤证据。

## 属性/事件命名：两种写法都支持

```html
<!-- 本示例采用的写法（与 Vue 模板习惯一致） -->
<DataTable :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" />

<!-- 等价写法 -->
<DataTable :sortKey="sortKey" :sortDir="sortDir" @sortChange="onSortChange" />
```

2026-11-10 之前**只有 camelCase 有效**：kebab-case 会静默失效 —— prop 停在默认值
且反被当普通属性渲染到 DOM；事件被编译成 `onSort-change` 而 `emit` 查找
`onSortChange`，永远送不到处理器。全程不报错、不警告。

根因是编译器不 camelize 属性名、而 `emit` 会 camelize，两头口径不一致。
修复落在**运行时**而非编译器（编译器无法静态区分「组件 prop」与「原生元素属性」，
`<div :data-foo-bar>` 必须保持 kebab）：`initProps` 增加 kebab 回退并把已消费的键
从 attrs 排除，`emit` 增加「on + 首字母大写的 kebab 事件名」回退。

**验收**：本示例现在用的就是 kebab 写法，判据全绿即证明修复有效；
`packages/component/tests/kebab-name-interop.test.ts` 另有 7 条单元判据覆盖两种写法，
并锁住「未声明的 kebab 属性必须照旧进 attrs」（`data-id` / `aria-label`）。

## 数据结构为什么用种子随机

`api.js` 用固定种子的 LCG 生成 47 条订单，而不是 `Math.random()`。
随机数据下「金额升序第一名是谁」无法预先算出，只能反抄当前输出，判据就废了。
