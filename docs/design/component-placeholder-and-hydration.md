# 组件占位元素与 hydration：调研结论（2026-09-26）

> 本文修正了一条**基于设计文档、而非实测**的既有判断，并给出 #20 的处置结论。

## 1. 现状事实（实测）

**客户端（Signal/Vapor）产物**：

```js
const _div = createTemplate('<div><lyt-comp data-lyt-comp="Child"></lyt-comp></div>');
mountComponent(_ctx.Child, {}, _lytComp);
```

⇒ DOM 里会留下 `<lyt-comp>` 这个**自定义标签**，组件内容挂载在它**内部**。

**SSR**：输出**组件内容本身**（没有占位标签）。

⇒ 两侧 DOM 结构**确实不同**（这一条与既有记录一致）。

## 2. ⚠️ 纠正：hydrate 目前**不做结构对比**

此前记录写着「组件结构不同 ⇒ hydration **硬阻塞**」。**实测不成立**：

```ts
// packages/renderer/src/hydration/enhanced-hydration.ts
async function performHydration(container, _app, stats, _options) {
  const walker = document.createTreeWalker(container, SHOW_ELEMENT | SHOW_TEXT);
  // 遍历所有节点…
  for (const n of nodes) {
    if (n instanceof Element) await hydrateElement(n, stats, _options);
  }
}

async function hydrateElement(element, stats, _options) {
  const ssrId = element.getAttribute('data-ssr-id');
  if (!ssrId) {
    stats.skippedNodes++;
    return;
  } // ← 没有 data-ssr-id 就跳过
  // 摘掉 SSR 渲染留下的 on*/@ 事件属性；处理 v-* 指令
}
```

⇒ 它**只对带 `data-ssr-id` 的元素摘事件属性 / 处理指令**，
**从不把 DOM 与 vnode 做结构比对**，参数 `_app` 甚至带下划线（未使用）。

**结论**：当前没有真正的 hydration ⇒ **结构差异不会导致 hydration 报错**。
它的真实影响是「DOM 里多一个自定义标签」，**不是**"hydration 阻塞"。

## 3. 处置结论（#20）

**不硬做「移除占位元素」**，原因：

1. DOM 渲染器的 `mount(vnode, container)` **只接受 container，没有 anchor 参数**
   （`packages/adapter-web/src/web-dom-renderer.ts`）
2. 想"内容直接取代标签"，要么给核心 `mount` 增加锚点能力（**高风险、牵一发动全身**），
   要么每次重渲染做"内容搬运"（**复杂且脆弱**：重渲染时旧占位已被移除，需要额外的锚点管理）
3. **收益与风险不成正比**：收益只是"DOM 更干净 + 为将来 hydration 铺路"，
   而当前 hydration 尚未实现 ⇒ 属"为未落地的东西提前付代价"

**改为实施的低成本改善**（已落地）：

```ts
// packages/renderer/src/vapor/mount-component.ts
// 占位元素是自定义标签，浏览器按未知元素处理（默认 display: inline），
// 会让内部块级子元素布局异常 ⇒ 设为 display: contents（元素不生成盒子，
// 子元素直接参与父级布局，效果等同"内容取代了标签"）
host.setAttribute('style', 'display: contents');
```

⇒ 解决了**唯一有实际影响的问题（布局异常）**，且**不碰核心 API**。

## 4. 若将来要做「真正移除占位」（前置条件清单）

1. **先有真正的 hydration**（当前只处理 `data-ssr-id`）——否则没有动机
2. 给 `mount(vnode, container, anchor?)` 增加锚点能力（或提供 `replace` 语义）
3. `mountComponent` 改用锚点注释 + 内容插入，并保证**重渲染**的落点稳定
4. 回归要求：组件插槽 / v-for 内组件 / 嵌套组件 / 卸载清理全部不得回归
5. 收益复核：DOM 里少一个标签，是否值得动核心 `mount`（届时再评估）
