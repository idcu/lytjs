/**
 * 插槽能力演示（可被浏览器 demo 与集成测试共用同一份代码）
 *
 * 覆盖：具名插槽 / 插槽作用域 / 插槽内 v-for / v-if / v-else / v-show / 组件事件 / v-model。
 */

import { ref } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
// ⚠️ 2026-11-02：必须走 `@lytjs/renderer/signal`（**同步**版）。
//   包根 `@lytjs/renderer` 的 `createSignalRenderer` 是 async 懒加载包装，
//   直接用它拿到的是 Promise ⇒ 后续 `renderer.render(...)` 会报
//   `renderer.render is not a function`。
//   此前这里用相对路径穿透 `packages/renderer/src/signal/signal-renderer`，
//   示例因此不可移植；现已把同步版正式暴露为子路径导出。
import { createSignalRenderer } from '@lytjs/renderer/signal';
import type { SignalRenderer } from '@lytjs/renderer/signal';

/** 具名插槽 + 默认插槽的卡片组件 */
const Card = {
  name: 'Card',
  setup(_props: unknown, ctx: { slots: Record<string, (() => unknown) | undefined> }) {
    return () =>
      createVNode('section', { class: 'card' }, [
        createVNode('header', { class: 'card-hd' }, ctx.slots.header ? ctx.slots.header() : null),
        createVNode('div', { class: 'card-bd' }, ctx.slots.default ? ctx.slots.default() : null),
        createVNode('footer', { class: 'card-ft' }, ctx.slots.footer ? ctx.slots.footer() : null),
      ]);
  },
};

/** 作用域插槽组件：把 item 通过插槽参数回传给父级 */
const DataList = {
  name: 'DataList',
  setup(
    _props: unknown,
    ctx: { slots: Record<string, ((scope?: unknown) => unknown) | undefined> },
  ) {
    return () => {
      const slot = ctx.slots.default;
      if (!slot) return createVNode('ul', { class: 'list' }, null);
      // 槽函数返回数组；两次调用直接组合即形成嵌套数组 [[li1],[li2]]。
      // 框架会**自动展平**（vdom/normalizeChildren），调用方无需手动展开。
      return createVNode('ul', { class: 'list' }, [
        slot({ item: { id: 1, label: '第一条' } }) as never,
        slot({ item: { id: 2, label: '第二条' } }) as never,
      ]);
    };
  },
};

export interface SlotsDemoHandle {
  renderer: SignalRenderer;
  state: {
    visible: ReturnType<typeof ref<boolean>>;
    items: ReturnType<typeof ref<Array<{ name: string }>>>;
  };
}

/**
 * 把演示挂载到 container。
 * 注意：模板写在组件里（Signal 模式要求根组件提供 template 字符串）。
 */
export function mountSlotsDemo(container: HTMLElement): SlotsDemoHandle {
  const visible = ref(true);
  const items = ref([{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }]);
  const text = ref('hello');

  const template = `
    <section class="demo">
      <Card>
        <template #header><h2>具名插槽：header</h2></template>
        <p v-show="visible">默认插槽（受 v-show 控制）</p>
        <span v-if="visible">条件：可见</span>
        <i v-else>条件：隐藏</i>
        <ul><li v-for="it in items">{{ it.name }}</li></ul>
        <template #footer><small>具名插槽：footer</small></template>
      </Card>
      <DataList v-slot="scope"><li class="scoped">{{ scope.item.label }}</li></DataList>
      <input v-model="text" />
    </section>
  `;

  const renderer = createSignalRenderer(template, { visible, items, text, Card, DataList });
  renderer.render(container);
  return { renderer, state: { visible, items } };
}
